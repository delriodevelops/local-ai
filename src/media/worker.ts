import { AutoModelForImageTextToText, AutoProcessor, MultiModalityCausalLM, load_image, pipeline, env, type Tensor } from '@huggingface/transformers'
import { KokoroTTS } from 'kokoro-js'
import { env as kokoroEnv } from 'kokoro-transformers'
import { findLocal } from './catalog'

// Modelos de imagen y audio, fuera del hilo principal. Cada uno se descarga la primera vez que hace falta.
// Hay dos copias de este worker: una para Janus, la visión y Whisper y otra para las voces,
// así una no bloquea a la otra y trabajan a la vez
env.allowLocalModels = false
// Con aislamiento entre orígenes, la parte que corre en WebAssembly usa varios núcleos (sin él, solo uno).
// Kokoro trae su propia copia de Transformers.js y de ONNX Runtime, con su propia configuración
const threads = self.crossOriginIsolated ? Math.max(2, Math.min(navigator.hardwareConcurrency - 2, 8)) : 1
if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = threads
if (kokoroEnv.backends.onnx.wasm) kokoroEnv.backends.onnx.wasm.numThreads = threads

const JANUS = 'onnx-community/Janus-Pro-1B-ONNX'
const KOKORO = 'onnx-community/Kokoro-82M-v1.0-ONNX'
const SUPERTONIC = 'onnx-community/Supertonic-TTS-2-ONNX'

// Whisper y la visión tienen varios modelos posibles (catalog.ts): variant dice cuál, y lo pone media.ts
export type MediaModel = 'janus' | 'vision' | 'whisper' | 'kokoro' | 'supertonic'
export type MediaBackend = 'webgpu' | 'wasm'

export type MediaTask =
  | { task: 'load'; model: MediaModel; variant?: string }
  | { task: 'unload'; model: MediaModel }
  | { task: 'describe'; image: string; prompt: string; variant?: string }
  | { task: 'imagine'; prompt: string }
  | { task: 'transcribe'; audio: Float32Array; variant?: string }
  // Voces de Kokoro (af_heart) o de Supertonic con su idioma (es:F1)
  | { task: 'speak'; text: string; voice: string }

export type MediaMessage =
  | { id: number; type: 'status'; text: string }
  | { id: number; type: 'done'; result: string }
  // webgpu: falló Kokoro en la gráfica; media.ts repite el trabajo en un worker nuevo que solo usa WebAssembly
  | { id: number; type: 'error'; error: string; webgpu?: true }
  // Dónde quedó cargado un modelo: sale de la carga, que puede haberla empezado cualquier trabajo
  | { type: 'backend'; model: MediaModel; backend: MediaBackend }

type Report = (text: string) => void

const loading = new Map<string, Promise<unknown>>()
function once<T>(key: string, load: () => Promise<T>) {
  if (!loading.has(key)) loading.set(key, load().catch(error => { loading.delete(key); throw error }))
  return loading.get(key) as Promise<T>
}

// Qué modelo ocupa cada hueco con varios posibles. Si piden otro, el cargado sale antes para no tener los dos en memoria
const current = new Map<MediaModel, string>()
async function swap<T>(slot: MediaModel, id: string, load: () => Promise<T>) {
  if (current.get(slot) !== id) {
    await unload(slot)
    current.set(slot, id)
  }
  return once(slot, load)
}

// Convierte el progreso de descarga de Transformers.js en un texto corto
function downloads(report: Report, name: string) {
  const files = new Map<string, { loaded: number; total: number }>()
  return (event: { status: string; file?: string; loaded?: number; total?: number }) => {
    if (event.status !== 'progress' || !event.file) return
    files.set(event.file, { loaded: event.loaded ?? 0, total: event.total ?? 0 })
    const loaded = [...files.values()].reduce((sum, f) => sum + f.loaded, 0)
    const total = [...files.values()].reduce((sum, f) => sum + f.total, 0)
    report(`Downloading ${name} · ${Math.round(loaded / 1e6)} / ${Math.round(total / 1e6)} MB`)
  }
}

async function supportsFp16() {
  const adapter = await (navigator as Navigator & { gpu?: { requestAdapter(): Promise<{ features: Set<string> } | null> } }).gpu?.requestAdapter()
  return !!adapter?.features.has('shader-f16')
}

// Janus-Pro: un solo modelo que entiende imágenes y también las genera
const janus = (report: Report) => once('janus', async () => {
  const fp16 = await supportsFp16()
  const progress_callback = downloads(report, 'Janus-Pro 1B')
  const processor = await AutoProcessor.from_pretrained(JANUS, { progress_callback })
  const model = await MultiModalityCausalLM.from_pretrained(JANUS, {
    dtype: fp16
      ? { prepare_inputs_embeds: 'q4', language_model: 'q4f16', lm_head: 'fp16', gen_head: 'fp16', gen_img_embeds: 'fp16', image_decode: 'fp32' }
      : { prepare_inputs_embeds: 'fp32', language_model: 'q4', lm_head: 'fp32', gen_head: 'fp32', gen_img_embeds: 'fp32', image_decode: 'fp32' },
    device: { prepare_inputs_embeds: 'wasm', language_model: 'webgpu', lm_head: 'webgpu', gen_head: 'webgpu', gen_img_embeds: 'webgpu', image_decode: 'webgpu' },
    progress_callback,
  })
  return { processor, model: model as MultiModalityCausalLM }
})

// LFM-VL describe y lee imágenes. Sin fp16, los pesos van en fp32 y el texto a 4 bits
const vision = (report: Report, variant?: string) => {
  const choice = findLocal('describe', variant)
  return swap('vision', choice.id, async () => {
    const fp16 = await supportsFp16()
    const progress_callback = downloads(report, choice.name)
    const processor = await AutoProcessor.from_pretrained(choice.repo, { progress_callback })
    const model = await AutoModelForImageTextToText.from_pretrained(choice.repo, {
      dtype: fp16
        ? { embed_tokens: 'fp16', vision_encoder: 'fp16', decoder_model_merged: 'q4f16' }
        : { embed_tokens: 'fp32', vision_encoder: 'fp32', decoder_model_merged: 'q4' },
      device: 'webgpu',
      progress_callback,
    })
    return { processor, model }
  })
}

// El turbo solo se elige con fp16 (catalog.ts): codificador en fp16 y decodificador a 4 bits, como en la demo de Transformers.js
const whisper = (report: Report, variant?: string) => {
  const choice = findLocal('transcribe', variant)
  return swap('whisper', choice.id, () => pipeline('automatic-speech-recognition', choice.repo, {
    device: 'webgpu',
    dtype: choice.fp16Only ? { encoder_model: 'fp16', decoder_model_merged: 'q4' } : undefined,
    progress_callback: downloads(report, choice.name),
  }))
}

const hasAdapter = async () => {
  try {
    return !!(await (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu?.requestAdapter())
  } catch {
    return false
  }
}

const loadedOn = (model: MediaModel, backend: MediaBackend) => self.postMessage({ type: 'backend', model, backend } satisfies MediaMessage)

// Kokoro falló en la gráfica. No se reintenta aquí: Transformers.js guarda la primera sesión de ONNX, aunque falle,
// y hace esperar a todas las siguientes, así que q8 en este worker fallaría igual
class GpuFailure extends Error {}
// Un fallo de red (al descargar el modelo o una voz) no es culpa de la gráfica: sale tal cual, sin pasar a WebAssembly.
// fetch rechaza con TypeError en todos los navegadores ("Failed to fetch", "NetworkError…", "Load failed" en Safari)
const offline = (error: unknown) =>
  (error instanceof TypeError && /fetch|network|load failed/i.test(error.message))
  || /Could not locate file|Unable to get model file/i.test(String(error))
const gpuFailure = (error: unknown) => (offline(error) ? error : new GpuFailure(error instanceof Error ? error.message : String(error)))

// En algunas gráficas (Intel, AMD) Kokoro fp32 en WebGPU no da error pero devuelve ruido (picos de 1e5 en vez
// de ~0.6) o NaN. Se comprueba cada audio antes de darlo por bueno
const corrupt = (samples: Float32Array) => samples.some(s => !Number.isFinite(s) || Math.abs(s) > 2)

// El worker de la voz se llama media-voice-wasm cuando la gráfica ya falló en esta sesión (media.ts)
const wasmOnly = self.name.endsWith('-wasm')
let kokoroOn: MediaBackend | undefined

// En la gráfica, Kokoro genera la voz varias veces más rápido que en el procesador. Allí va en fp32 (q8 y q4
// están pensados para WebAssembly); sin gráfica va directo a q8 en WebAssembly
const kokoro = (report: Report) => once('kokoro', async () => {
  if (!wasmOnly && await hasAdapter()) {
    try {
      const tts = await KokoroTTS.from_pretrained(KOKORO, { dtype: 'fp32', device: 'webgpu', progress_callback: downloads(report, 'Kokoro') })
      // ONNX compila los shaders en la primera ejecución, y ahí es donde aparecen muchos fallos de la gráfica
      report('Warming up Kokoro…')
      const { audio } = await tts.generate('Hello there.', { voice: 'af_heart' })
      if (corrupt(audio) || !audio.some(s => Math.abs(s) > 1e-3)) throw new Error('Kokoro produced invalid audio on WebGPU')
      kokoroOn = 'webgpu'
      loadedOn('kokoro', 'webgpu')
      return tts
    } catch (error) {
      throw gpuFailure(error)
    }
  }
  const tts = await KokoroTTS.from_pretrained(KOKORO, { dtype: 'q8', device: 'wasm', progress_callback: downloads(report, 'Kokoro') })
  kokoroOn = 'wasm'
  loadedOn('kokoro', 'wasm')
  return tts
})

// Supertonic 2 pone voz al español, portugués, francés y coreano. Es pequeño y rápido en el procesador,
// así deja la gráfica a los modelos de texto e imagen
const supertonic = (report: Report) => once('supertonic', async () => {
  const tts = await pipeline('text-to-speech', SUPERTONIC, { device: 'wasm', dtype: 'fp32', progress_callback: downloads(report, 'Supertonic 2') })
  loadedOn('supertonic', 'wasm')
  return tts
})

// Cada voz de Supertonic es un fichero con su timbre: se descarga una vez por voz
const timbres = new Map<string, Promise<Float32Array>>()
const timbre = (voice: string) => {
  if (!timbres.has(voice)) {
    const url = `https://huggingface.co/${SUPERTONIC}/resolve/main/voices/${voice}.bin`
    timbres.set(voice, fetch(url).then(r => r.arrayBuffer()).then(b => new Float32Array(b)).catch(error => { timbres.delete(voice); throw error }))
  }
  return timbres.get(voice)!
}

const toDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result as string)
  reader.onerror = () => reject(reader.error)
  reader.readAsDataURL(blob)
})

// WAV de 16 bits a partir de muestras en coma flotante
function wav(samples: Float32Array, rate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const text = (offset: number, s: string) => [...s].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)))
  text(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); text(8, 'WAVE')
  text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  text(36, 'data'); view.setUint32(40, samples.length * 2, true)
  samples.forEach((s, i) => view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 0x7fff, true))
  return new Blob([buffer], { type: 'audio/wav' })
}

// La voz no debe leer el Markdown: fuera asteriscos, almohadillas, enlaces y viñetas.
// Cada viñeta o título acaba en punto, para que sea su propia frase y no se junte todo en un solo tramo
const clean = (text: string) => text
  .replace(/```[\s\S]*?```/g, ' ')
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/^[ \t]*([#>]+|[-*+]|\d+[.)])[ \t]+(.*?)[\s:;,]*$/gm, (_, _marker, line: string) => /[.!?][^\w]*$/.test(line) || !line ? line : `${line}.`)
  .replace(/[*_`~]/g, '')
  .replace(/\s+/g, ' ')
  .trim()

// Por tramos de unas frases: Kokoro corta en silencio lo que pase de ~500 fonemas, y tts.stream() se
// queda esperando más texto. Una frase demasiado larga se parte por palabras
function speechChunks(text: string) {
  const sentences = (clean(text).match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [])
    .flatMap(s => (s.length <= 250 ? [s] : s.match(/.{1,250}(?:\s|$)|\S+/g) ?? [s]))
  return sentences.reduce<string[]>((acc, sentence) => {
    const last = acc.at(-1)
    if (last && last.length + sentence.length < 280) acc[acc.length - 1] = last + sentence
    else acc.push(sentence)
    return acc
  }, [])
}

// Dice un tramo de texto con la voz elegida
type Say = (chunk: string) => Promise<{ audio: Float32Array; sampling_rate: number }>

async function kokoroVoice(report: Report, voice: string): Promise<Say> {
  const tts = await kokoro(report)
  return async chunk => {
    // En la gráfica, el ruido depende de la frase y un fallo puede llegar tarde (memoria, dispositivo perdido):
    // cualquiera de los dos pasa el trabajo entero a WebAssembly
    const audio = await tts.generate(chunk, { voice: voice as never })
      .catch(error => { throw kokoroOn === 'webgpu' ? gpuFailure(error) : error })
    if (kokoroOn === 'webgpu' && corrupt(audio.audio)) throw new GpuFailure('Kokoro produced invalid audio on WebGPU')
    return audio
  }
}

// Supertonic recibe el idioma como etiqueta alrededor del texto
async function supertonicVoice(report: Report, lang: string, voice: string): Promise<Say> {
  const tts = await supertonic(report)
  const speaker_embeddings = await timbre(voice)
  return async chunk => await tts(`<${lang}>${chunk}</${lang}>`, { speaker_embeddings, num_inference_steps: 5, speed: 1.05 } as never) as { audio: Float32Array; sampling_rate: number }
}

const loaders: Record<MediaModel, (report: Report, variant?: string) => Promise<unknown>> = { janus, vision, whisper, kokoro, supertonic }

// Libera la memoria de la gráfica de un modelo cargado; la RAM de WebAssembly solo vuelve al cerrar el worker (media.ts)
async function unload(model: MediaModel) {
  const pending = loading.get(model)
  loading.delete(model)
  current.delete(model)
  if (model === 'kokoro') kokoroOn = undefined
  const loaded = await pending?.catch(() => null) as { model?: { dispose(): Promise<unknown> }; dispose?: () => Promise<unknown> } | null
  await (loaded?.model?.dispose() ?? loaded?.dispose?.())
}

async function run(job: MediaTask, report: Report): Promise<string> {
  switch (job.task) {
    case 'load': {
      await loaders[job.model](report, job.variant)
      return 'ready'
    }
    case 'unload': {
      await unload(job.model)
      return 'freed'
    }
    case 'describe': {
      const { processor, model } = await vision(report, job.variant)
      report('Looking at the image…')
      const messages = [{ role: 'user', content: [{ type: 'image' }, { type: 'text', text: job.prompt }] }]
      // LFM3-VL razona antes de responder si no se le dice lo contrario: aquí solo hace falta la descripción.
      // enable_thinking no está en los tipos de Transformers.js, pero llega a la plantilla del chat
      const options = { add_generation_prompt: true, enable_thinking: false } as { add_generation_prompt: true }
      const prompt = processor.apply_chat_template(messages as never, options)
      const inputs = await processor(await load_image(job.image), prompt, { add_special_tokens: false })
      const output = await model.generate({ ...inputs, max_new_tokens: 512, do_sample: false }) as Tensor
      const fresh = output.slice(null, [inputs.input_ids.dims.at(-1), null])
      return processor.batch_decode(fresh, { skip_special_tokens: true })[0].replace(/^[\s\S]*<\/think>/, '').trim()
    }
    case 'imagine': {
      const { processor, model } = await janus(report)
      const inputs = await processor([{ role: '<|User|>', content: job.prompt }], { chat_template: 'text_to_image' })
      const tokens = (processor as unknown as { num_image_tokens: number }).num_image_tokens
      let done = 0
      // Cuenta los fragmentos de imagen generados para enseñar el avance
      const streamer = {
        put() { done++; if (done % 16 === 0) report(`Painting · ${Math.round((done / tokens) * 100)}%`) },
        end() {},
      }
      report('Painting · 0%')
      const [image] = await model.generate_images({ ...inputs, min_new_tokens: tokens, max_new_tokens: tokens, do_sample: true, streamer })
      return toDataUrl(await image.toBlob('image/png'))
    }
    case 'transcribe': {
      const asr = await whisper(report, job.variant)
      report('Listening…')
      const result = await asr(job.audio, { chunk_length_s: 30, stride_length_s: 5 }) as { text: string } | { text: string }[]
      return (Array.isArray(result) ? result.map(r => r.text).join(' ') : result.text).trim()
    }
    case 'speak': {
      const chunks = speechChunks(job.text)
      const [lang, voice] = job.voice.split(':')
      const say = voice ? await supertonicVoice(report, lang, voice) : await kokoroVoice(report, job.voice)
      const parts: Float32Array[] = []
      let rate = 24000
      for (const [i, chunk] of chunks.entries()) {
        report(`Speaking · ${i + 1}/${chunks.length}`)
        const audio = await say(chunk.trim())
        parts.push(audio.audio)
        rate = audio.sampling_rate
      }
      const samples = new Float32Array(parts.reduce((n, p) => n + p.length, 0))
      parts.reduce((offset, p) => { samples.set(p, offset); return offset + p.length }, 0)
      return toDataUrl(wav(samples, rate))
    }
  }
}

self.onmessage = async ({ data }: MessageEvent<{ id: number; job: MediaTask }>) => {
  const report = (text: string) => self.postMessage({ id: data.id, type: 'status', text } satisfies MediaMessage)
  try {
    const result = await run(data.job, report)
    self.postMessage({ id: data.id, type: 'done', result } satisfies MediaMessage)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    self.postMessage({ id: data.id, type: 'error', error: message, ...(error instanceof GpuFailure && { webgpu: true as const }) } satisfies MediaMessage)
  }
}
