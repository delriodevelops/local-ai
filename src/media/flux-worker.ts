import * as ort from 'onnxruntime-web/webgpu'
import { PreTrainedTokenizer } from '@huggingface/transformers'

// Una fase de FLUX.2 klein 4B. ONNX Runtime no devuelve la memoria de la gráfica al soltar una sesión que ya ha
// corrido: cerrar el worker es lo único que la libera, así que flux.ts abre uno por fase y lo cierra al acabar
const REPO = 'https://huggingface.co/cgb/flux2-klein-4b-onnx-webgpu/resolve/main'
// El monitor la borra con las demás cachés de modelos (Monitor.tsx)
const FLUX_CACHE = 'meshmind-flux'

// Los mismos binarios de ONNX Runtime que usa Transformers.js en el resto de la página
ort.env.wasm.wasmPaths = {
  mjs: `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ort.env.versions.web}/dist/ort-wasm-simd-threaded.asyncify.mjs`,
  wasm: `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ort.env.versions.web}/dist/ort-wasm-simd-threaded.asyncify.wasm`,
}
ort.env.wasm.proxy = false

// Pesos de más de 2 GB vienen en trozos: un navegador no reserva un ArrayBuffer de 2 GiB
const GRAPHS = {
  encode: { name: 'text encoder', graph: 'text_encoder_q4.onnx', data: ['text_encoder_q4-00000.data', 'text_encoder_q4-00001.data'] },
  denoise: { name: 'image model', graph: 'transformer_q8.onnx', data: ['transformer_q8-00000.data', 'transformer_q8-00001.data', 'transformer_q8-00002.data'] },
  decode: { name: 'decoder', graph: 'vae_decoder.onnx', data: ['vae_decoder.onnx.data'] },
}

// 512×512: 32×32 parches del latente, de 128 canales cada uno; el texto ocupa siempre 512 posiciones
const SIDE = 32
const TOKENS = SIDE * SIDE
const CHANNELS = 128
const TEXT = 512
const STEPS = 4

export type FluxJob =
  | { stage: 'encode'; prompt: string }
  | { stage: 'denoise'; embeds: Uint16Array; seed: number }
  | { stage: 'decode'; latent: Float32Array }

export type FluxMessage =
  | { type: 'status'; text: string }
  | { type: 'done'; result: Uint16Array | Float32Array | string }
  | { type: 'error'; error: string }

const report = (text: string) => self.postMessage({ type: 'status', text } satisfies FluxMessage)
const MB = (bytes: number) => Math.round(bytes / 1e6)

// La caché guarda cada archivo en partes de 100 MB: algunos navegadores no guardan entradas de cientos de MB.
// Una entrada ?index, escrita al final, dice cuántas partes hay y cuánto ocupa el archivo
const PART = 100_000_000

async function fromCache(cache: Cache, url: string) {
  const index = await cache.match(`${url}?index`)
  if (!index) return null
  const { parts, bytes } = await index.json() as { parts: number; bytes: number }
  const out = new Uint8Array(bytes)
  let offset = 0
  for (let i = 0; i < parts; i++) {
    const part = await cache.match(`${url}?part=${i}`)
    // El navegador pudo borrar alguna parte para hacer sitio: se vuelve a bajar
    if (!part) return null
    const data = new Uint8Array(await part.arrayBuffer())
    out.set(data, offset)
    offset += data.byteLength
  }
  return offset === bytes ? out : null
}

// Un archivo del modelo: de la caché si ya está; si no, de la red, guardando las partes mientras baja si caben en la
// cuota del navegador. Si no caben, se usa igual y la próxima vez vuelve a bajar
async function fetchFile(path: string, label: string) {
  const url = `${REPO}/${path}`
  const cache = await caches.open(FLUX_CACHE).catch(() => undefined)
  const cached = cache && await fromCache(cache, url)
  if (cached) return cached

  const response = await fetch(url)
  if (!response.ok || !response.body) throw new Error(`Could not download FLUX.2 klein (${path}, ${response.status})`)
  const total = Number(response.headers.get('content-length'))
  const { quota = 0, usage = 0 } = await navigator.storage?.estimate?.() ?? {}
  // Sin tamaño anunciado (HF comprime algunos archivos pequeños) basta con que quepa una parte
  let saving = !!cache && quota - usage > (total || PART) * 1.05
  let parts = 0
  const keep = async (end: number) => {
    try {
      await cache!.put(`${url}?part=${parts}`, new Response(out.subarray(parts * PART, end)))
      parts++
    } catch {
      // Sin sitio a mitad: fuera las partes guardadas, que solas no sirven
      saving = false
      for (let i = 0; i < parts; i++) await cache!.delete(`${url}?part=${i}`)
    }
  }

  // Se escribe directamente en un búfer del tamaño anunciado: juntar trozos y copiarlos después pediría el doble
  // de memoria con archivos de 1,6 GB
  const reader = response.body.getReader()
  let out = new Uint8Array(total || PART)
  let loaded = 0
  for (let r = await reader.read(); !r.done; r = await reader.read()) {
    if (loaded + r.value.byteLength > out.length) {
      const grown = new Uint8Array(Math.max(out.length * 2, loaded + r.value.byteLength))
      grown.set(out.subarray(0, loaded))
      out = grown
    }
    out.set(r.value, loaded)
    loaded += r.value.byteLength
    if (total) report(`Downloading FLUX.2 klein · ${label} ${MB(loaded)} / ${MB(total)} MB`)
    while (saving && loaded - parts * PART >= PART) await keep((parts + 1) * PART)
  }
  if (saving && loaded > parts * PART) await keep(loaded)
  if (saving) await cache!.put(`${url}?index`, Response.json({ parts, bytes: loaded })).catch(() => {})
  return loaded === out.length ? out : out.slice(0, loaded)
}

async function open(stage: keyof typeof GRAPHS) {
  const { name, graph, data } = GRAPHS[stage]
  const model = await fetchFile(graph, name)
  const externalData = []
  for (const path of data) externalData.push({ path, data: await fetchFile(path, name) })
  report(`Loading FLUX.2 klein · ${name}`)
  return ort.InferenceSession.create(model, { executionProviders: ['webgpu'], externalData })
}

// float32 ↔ float16: los grafos trabajan en float16 y el bucle de pasos suma en float32
const f32 = new Float32Array(1)
const u32 = new Uint32Array(f32.buffer)
function toHalf(values: Float32Array) {
  const out = new Uint16Array(values.length)
  for (let i = 0; i < values.length; i++) {
    f32[0] = values[i]
    const x = u32[0]
    const sign = (x >>> 16) & 0x8000
    const exp = ((x >>> 23) & 0xff) - 112
    const mant = x & 0x7fffff
    if (exp >= 0x1f) out[i] = sign | 0x7c00 | (((x >>> 23) & 0xff) === 0xff && mant ? 0x200 : 0)
    else if (exp <= 0) out[i] = exp < -10 ? sign : sign | (((mant | 0x800000) >> (1 - exp)) + 0x1000) >> 13
    else out[i] = sign | ((exp << 10) + ((mant + 0x1000) >> 13))
  }
  return out
}
const HALF = new Float32Array(65536).map((_, h) => {
  const exp = (h >> 10) & 0x1f
  const mant = h & 0x3ff
  const value = exp === 0 ? mant * 2 ** -24 : exp === 0x1f ? (mant ? NaN : Infinity) : (1 + mant / 1024) * 2 ** (exp - 15)
  return h & 0x8000 ? -value : value
})
const fromHalf = (bits: Uint16Array) => Float32Array.from(bits, h => HALF[h])
const bitsOf = (tensor: ort.Tensor) => {
  const data = tensor.data as Uint16Array
  return new Uint16Array(data.buffer, data.byteOffset, data.length)
}

// El prompt pasa por la plantilla de chat de Qwen3 con el razonamiento apagado, relleno por la derecha hasta 512, como en diffusers
async function encode(prompt: string) {
  const [json, config] = await Promise.all(['tokenizer/tokenizer.json', 'tokenizer/tokenizer_config.json']
    .map(async path => JSON.parse(new TextDecoder().decode(await fetchFile(path, 'tokenizer')))))
  const tokenizer = new PreTrainedTokenizer(json, config)
  const ids = tokenizer.encode(`<|im_start|>user\n${prompt}<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n`).slice(0, TEXT)
  const inputIds = new BigInt64Array(TEXT).fill(BigInt(tokenizer.pad_token_id))
  const mask = new BigInt64Array(TEXT)
  ids.forEach((id, i) => { inputIds[i] = BigInt(id); mask[i] = 1n })
  const session = await open('encode')
  report('Reading the prompt…')
  const { prompt_embeds } = await session.run({
    input_ids: new ort.Tensor('int64', inputIds, [1, TEXT]),
    attention_mask: new ort.Tensor('int64', mask, [1, TEXT]),
  })
  return bitsOf(prompt_embeds).slice()
}

// Ruido gaussiano reproducible a partir de una semilla (mulberry32 y Box-Muller)
function noise(length: number, seed: number) {
  let state = seed >>> 0
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const out = new Float32Array(length)
  for (let i = 0; i < length; i += 2) {
    const radius = Math.sqrt(-2 * Math.log(1 - random()))
    const angle = 2 * Math.PI * random()
    out[i] = radius * Math.cos(angle)
    if (i + 1 < length) out[i + 1] = radius * Math.sin(angle)
  }
  return out
}

// Los pasos de diffusers para FLUX.2 klein: de 1 a 1/pasos, desplazados con el mu empírico del modelo, y al final 0
function sigmas(tokens: number, steps: number) {
  const [a1, b1, a2, b2] = [8.73809524e-5, 1.89833333, 0.00016927, 0.45666666]
  const m200 = a2 * tokens + b2
  const slope = (m200 - (a1 * tokens + b1)) / 190
  const mu = tokens > 4300 ? m200 : slope * steps + m200 - 200 * slope
  return [...Array.from({ length: steps }, (_, i) => 1 - i / steps).map(s => Math.exp(mu) / (Math.exp(mu) + 1 / s - 1)), 0]
}

async function denoise(embeds: Uint16Array, seed: number) {
  const session = await open('denoise')
  const latent = noise(TOKENS * CHANNELS, seed)
  const schedule = sigmas(TOKENS, STEPS)
  // Posiciones [t, fila, columna, capa] de cada parche y [0, 0, 0, i] de cada posición del texto
  const imgIds = new BigInt64Array(TOKENS * 4)
  for (let i = 0; i < TOKENS; i++) { imgIds[i * 4 + 1] = BigInt(Math.floor(i / SIDE)); imgIds[i * 4 + 2] = BigInt(i % SIDE) }
  const txtIds = new BigInt64Array(TEXT * 4)
  for (let i = 0; i < TEXT; i++) txtIds[i * 4 + 3] = BigInt(i)
  const text = new ort.Tensor('float16', embeds, [1, TEXT, 7680])
  for (let step = 0; step < STEPS; step++) {
    report(`Painting · step ${step + 1}/${STEPS}`)
    const { noise_pred } = await session.run({
      hidden_states: new ort.Tensor('float16', toHalf(latent), [1, TOKENS, CHANNELS]),
      encoder_hidden_states: text,
      timestep: new ort.Tensor('float16', toHalf(new Float32Array([schedule[step]])), [1]),
      img_ids: new ort.Tensor('int64', imgIds, [1, TOKENS, 4]),
      txt_ids: new ort.Tensor('int64', txtIds, [1, TEXT, 4]),
    })
    const prediction = fromHalf(bitsOf(noise_pred))
    const delta = schedule[step + 1] - schedule[step]
    for (let i = 0; i < latent.length; i++) latent[i] += delta * prediction[i]
  }
  return latent
}

// El VAE recibe los parches en canales primero; la desnormalización y el desempaquetado van dentro del grafo
async function decode(latent: Float32Array) {
  const session = await open('decode')
  report('Developing the image…')
  const packed = new Float32Array(CHANNELS * TOKENS)
  for (let i = 0; i < TOKENS; i++) for (let c = 0; c < CHANNELS; c++) packed[c * TOKENS + i] = latent[i * CHANNELS + c]
  const { sample } = await session.run({ packed_latent: new ort.Tensor('float32', packed, [1, CHANNELS, SIDE, SIDE]) })
  const [, , height, width] = sample.dims
  const pixels = sample.data as Float32Array
  const area = width * height
  const rgba = new Uint8ClampedArray(area * 4)
  for (let i = 0; i < area; i++) {
    for (let c = 0; c < 3; c++) rgba[i * 4 + c] = (pixels[c * area + i] / 2 + 0.5) * 255
    rgba[i * 4 + 3] = 255
  }
  const canvas = new OffscreenCanvas(width, height)
  canvas.getContext('2d')!.putImageData(new ImageData(rgba, width, height), 0, 0)
  return new FileReaderSync().readAsDataURL(await canvas.convertToBlob({ type: 'image/png' }))
}

self.onmessage = async ({ data }: MessageEvent<FluxJob>) => {
  try {
    const result = data.stage === 'encode' ? await encode(data.prompt)
      : data.stage === 'denoise' ? await denoise(data.embeds, data.seed)
      : await decode(data.latent)
    const transfer = typeof result === 'string' ? [] : [result.buffer]
    self.postMessage({ type: 'done', result } satisfies FluxMessage, { transfer })
  } catch (error) {
    self.postMessage({ type: 'error', error: error instanceof Error ? error.message : String(error) } satisfies FluxMessage)
  }
}
