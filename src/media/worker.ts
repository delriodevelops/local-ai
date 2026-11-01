import { AutoProcessor, MultiModalityCausalLM, pipeline, env, type Tensor } from '@huggingface/transformers'
import { KokoroTTS } from 'kokoro-js'
import { env as kokoroEnv } from 'kokoro-transformers'

// Modelos de imagen y audio, fuera del hilo principal. Cada uno se descarga la primera vez que hace falta.
// Hay dos copias de este worker: una para Janus y Whisper y otra solo para Kokoro,
// así una no bloquea a la otra y trabajan a la vez
env.allowLocalModels = false
// Con aislamiento entre orígenes, la parte que corre en WebAssembly usa varios núcleos (sin él, solo uno).
// Kokoro trae su propia copia de Transformers.js y de ONNX Runtime, con su propia configuración
const threads = self.crossOriginIsolated ? Math.max(2, Math.min(navigator.hardwareConcurrency - 2, 8)) : 1
if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = threads
if (kokoroEnv.backends.onnx.wasm) kokoroEnv.backends.onnx.wasm.numThreads = threads

const JANUS = 'onnx-community/Janus-Pro-1B-ONNX'
const WHISPER = 'onnx-community/whisper-base'
const KOKORO = 'onnx-community/Kokoro-82M-v1.0-ONNX'

export type MediaModel = 'janus' | 'whisper' | 'kokoro'
export type MediaBackend = 'webgpu' | 'wasm'

export type MediaTask =
  | { task: 'load'; model: MediaModel }
  | { task: 'unload'; model: MediaModel }
  | { task: 'describe'; image: string; prompt: string }
  | { task: 'imagine'; prompt: string }
  | { task: 'transcribe'; audio: Float32Array }
  | { task: 'speak'; text: string; voice: string }

export type MediaMessage =
  | { id: number; type: 'status'; text: string }
  | { id: number; type: 'done'; result: string }
  | { id: number; type: 'error'; error: string }
  // Dónde quedó cargado un modelo: sale de la carga, que puede haberla empezado cualquier trabajo
  | { type: 'backend'; model: MediaModel; backend: MediaBackend }

type Report = (text: string) => void

const loading = new Map<string, Promise<unknown>>()
function once<T>(key: string, load: () => Promise<T>) {
  if (!loading.has(key)) loading.set(key, load().catch(error => { loading.delete(key); throw error }))
  return loading.get(key) as Promise<T>
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

const whisper = (report: Report) => once('whisper', () =>
  pipeline('automatic-speech-recognition', WHISPER, { device: 'webgpu', progress_callback: downloads(report, 'Whisper') }))

const hasAdapter = async () => {
  try {
    return !!(await (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu?.requestAdapter())
  } catch {
    return false
  }
}

const loadedOn = (model: MediaModel, backend: MediaBackend) => self.postMessage({ type: 'backend', model, backend } satisfies MediaMessage)

// En la gráfica, Kokoro genera la voz varias veces más rápido que en el procesador. Allí va en fp32 (q8 y q4
// están pensados para WebAssembly); sin gráfica, o si no carga en ella, vuelve en silencio a q8 en WebAssembly
const kokoro = (report: Report) => once('kokoro', async () => {
  if (await hasAdapter()) {
    try {
      const tts = await KokoroTTS.from_pretrained(KOKORO, { dtype: 'fp32', device: 'webgpu', progress_callback: downloads(report, 'Kokoro') })
      loadedOn('kokoro', 'webgpu')
      return tts
    } catch {
      report('Loading Kokoro on the processor…')
    }
  }
  const tts = await KokoroTTS.from_pretrained(KOKORO, { dtype: 'q8', device: 'wasm', progress_callback: downloads(report, 'Kokoro') })
  loadedOn('kokoro', 'wasm')
  return tts
})

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

const loaders: Record<MediaModel, (report: Report) => Promise<unknown>> = { janus, whisper, kokoro }

// Libera la memoria de la gráfica de un modelo cargado; la RAM de WebAssembly solo vuelve al cerrar el worker (media.ts)
async function unload(model: MediaModel) {
  const pending = loading.get(model)
  loading.delete(model)
  const loaded = await pending?.catch(() => null) as { model?: { dispose(): Promise<unknown> }; dispose?: () => Promise<unknown> } | null
  await (loaded?.model?.dispose() ?? loaded?.dispose?.())
}

async function run(job: MediaTask, report: Report): Promise<string> {
  switch (job.task) {
    case 'load': {
      await loaders[job.model](report)
      return 'ready'
    }
    case 'unload': {
      await unload(job.model)
      return 'freed'
    }
    case 'describe': {
      const { processor, model } = await janus(report)
      report('Looking at the image…')
      const conversation = [{ role: '<|User|>', content: `<image_placeholder>\n${job.prompt}`, images: [job.image] }]
      const inputs = await processor(conversation)
      const output = await model.generate({ ...inputs, max_new_tokens: 320, do_sample: false }) as Tensor
      const fresh = output.slice(null, [inputs.input_ids.dims.at(-1), null])
      return processor.batch_decode(fresh, { skip_special_tokens: true })[0].trim()
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
      const asr = await whisper(report)
      report('Listening…')
      const result = await asr(job.audio, { chunk_length_s: 30, stride_length_s: 5 }) as { text: string } | { text: string }[]
      return (Array.isArray(result) ? result.map(r => r.text).join(' ') : result.text).trim()
    }
    case 'speak': {
      const tts = await kokoro(report)
      // Por tramos de unas frases: el modelo corta en silencio lo que pase de ~500 fonemas, y tts.stream() se
      // queda esperando más texto. Una frase demasiado larga se parte por palabras
      const sentences = (clean(job.text).match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [])
        .flatMap(s => (s.length <= 250 ? [s] : s.match(/.{1,250}(?:\s|$)|\S+/g) ?? [s]))
      const chunks = sentences.reduce<string[]>((acc, sentence) => {
        const last = acc.at(-1)
        if (last && last.length + sentence.length < 280) acc[acc.length - 1] = last + sentence
        else acc.push(sentence)
        return acc
      }, [])
      const parts: Float32Array[] = []
      let rate = 24000
      for (const [i, chunk] of chunks.entries()) {
        report(`Speaking · ${i + 1}/${chunks.length}`)
        const audio = await tts.generate(chunk.trim(), { voice: job.voice as never })
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
    self.postMessage({ id: data.id, type: 'error', error: error instanceof Error ? error.message : String(error) } satisfies MediaMessage)
  }
}
