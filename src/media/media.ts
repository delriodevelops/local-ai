import type { MediaMessage, MediaModel, MediaTask } from './worker'
import { LOCAL_MODELS, type LocalModel, type LocalTask } from './catalog'
import { exclusive, MEDIA_INFO, useResources } from '@/engine/resources'
import { rateModel, useDevice, type DeviceProfile } from '@/engine/device'
import { useApp } from '@/flow/store'

export const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Spanish' },
  { id: 'pt', label: 'Portuguese' },
  { id: 'fr', label: 'French' },
  { id: 'ko', label: 'Korean' },
]

// El inglés lo pone Kokoro. Los demás idiomas, Supertonic 2, cuyas diez voces los hablan todos: es:F1 es la voz F1 en español
export const VOICES = [
  { id: 'af_heart', label: 'Heart (US, female)', lang: 'en' },
  { id: 'af_bella', label: 'Bella (US, female)', lang: 'en' },
  { id: 'am_michael', label: 'Michael (US, male)', lang: 'en' },
  { id: 'bf_emma', label: 'Emma (UK, female)', lang: 'en' },
  { id: 'bm_george', label: 'George (UK, male)', lang: 'en' },
  ...LANGUAGES.slice(1).flatMap(({ id: lang }) => ['F1', 'F2', 'F3', 'F4', 'F5', 'M1', 'M2', 'M3', 'M4', 'M5']
    .map(voice => ({ id: `${lang}:${voice}`, label: `${voice[0] === 'F' ? 'Female' : 'Male'} ${voice[1]}`, lang }))),
]

export const voiceModel = (voice: string): MediaModel => (voice.includes(':') ? 'supertonic' : 'kokoro')

const FIT = { good: 0, tight: 1, no: 2 }

// Los modelos de una tarea, primero los que caben en este equipo y, dentro, del más nuevo y listo al más modesto
export const rankLocal = (task: LocalTask, profile: DeviceProfile | null) => LOCAL_MODELS[task]
  .map(model => ({ ...model, fit: rateModel({ id: model.id, sizeGB: model.sizeGB, fp16: model.fp16Only }, profile, false) }))
  .sort((a, b) => FIT[a.fit.level] - FIT[b.fit.level])

// El modelo de cada tarea: el elegido en Ajustes o, en automático, el primero que cabe
export function localModel(task: LocalTask): LocalModel {
  const chosen = useApp.getState().localModels[task]
  return LOCAL_MODELS[task].find(m => m.id === chosen) ?? rankLocal(task, useDevice.getState().profile)[0]
}

// Nombre y tamaño para el monitor: Whisper y la visión dependen del modelo elegido
export function mediaInfo(model: MediaModel) {
  const local = model === 'whisper' ? localModel('transcribe') : model === 'vision' ? localModel('describe') : null
  return local ? { ...MEDIA_INFO[model], name: local.name, sizeGB: local.sizeGB } : MEDIA_INFO[model]
}

// El worker carga el modelo que diga el trabajo; se decide al empezar, por si se cambió en Ajustes mientras hacía cola
function withVariant(job: MediaTask): MediaTask {
  if (job.task === 'transcribe' || (job.task === 'load' && job.model === 'whisper')) return { ...job, variant: localModel('transcribe').id }
  if (job.task === 'describe' || (job.task === 'load' && job.model === 'vision')) return { ...job, variant: localModel('describe').id }
  return job
}

type Lane = 'main' | 'voice'
const workers = new Map<Lane, Worker>()
let nextId = 0
// retried: es la repetición en WebAssembly de un trabajo que falló en la gráfica
type Pending = { lane: Lane; job: MediaTask; resolve: (v: string) => void; reject: (e: Error) => void; onStatus: (t: string) => void; retried?: boolean }
const pending = new Map<number, Pending>()

// Si Kokoro falla en la gráfica (error o audio corrupto), el resto de la sesión va en WebAssembly.
// Se guarda en sessionStorage para que recargar la página no repita el intento fallido
const KOKORO_WASM = 'meshmind:kokoro-wasm'
let kokoroWasm = (() => { try { return sessionStorage.getItem(KOKORO_WASM) === '1' } catch { return false } })()
function preferWasm() {
  kokoroWasm = true
  try { sessionStorage.setItem(KOKORO_WASM, '1') } catch { /* sin almacenamiento basta con la variable */ }
}
function forgetWasm() {
  kokoroWasm = false
  try { sessionStorage.removeItem(KOKORO_WASM) } catch { /* sin almacenamiento basta con la variable */ }
}

// Las voces tienen su propio worker y lo demás comparte otro, para que una voz larga no bloquee a Janus ni a Whisper
const laneOf = (model: MediaModel): Lane => (model === 'kokoro' || model === 'supertonic' ? 'voice' : 'main')
const modelsOf = (lane: Lane) => (Object.keys(MEDIA_INFO) as MediaModel[]).filter(m => laneOf(m) === lane)

// Cerrar el worker es la única forma de devolver la RAM de WebAssembly, y de limpiar Transformers.js:
// tras un fallo de ONNX, sus colas internas rechazan todo lo que venga después. El siguiente trabajo abre uno nuevo
function close(lane: Lane, error = new Error('The media worker restarted after an error')) {
  workers.get(lane)?.terminate()
  workers.delete(lane)
  for (const [id, job] of pending) if (job.lane === lane) { pending.delete(id); job.reject(error) }
  const { setMedia } = useResources.getState()
  modelsOf(lane).forEach(model => setMedia(model, { state: 'off', status: undefined, backend: undefined }))
}

export function modelFor(job: MediaTask): MediaModel {
  switch (job.task) {
    case 'load': case 'unload': return job.model
    case 'describe': return 'vision'
    case 'imagine': return 'janus'
    case 'transcribe': return 'whisper'
    case 'speak': return voiceModel(job.voice)
  }
}

function getWorker(lane: Lane) {
  const existing = workers.get(lane)
  if (existing) return existing
  // El worker lee el sufijo -wasm de su nombre y no prueba WebGPU para Kokoro
  const name = lane === 'voice' && kokoroWasm ? 'media-voice-wasm' : `media-${lane}`
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module', name })
  worker.onmessage = ({ data }: MessageEvent<MediaMessage>) => {
    if (data.type === 'backend') return useResources.getState().setMedia(data.model, { backend: data.backend })
    const job = pending.get(data.id)
    if (!job) return
    if (data.type === 'status') return job.onStatus(data.text)
    pending.delete(data.id)
    if (data.type === 'done') return job.resolve(data.result)
    // Fallo en la gráfica: un worker nuevo, solo con WebAssembly, repite el mismo trabajo una vez
    if (data.webgpu && !kokoroWasm) {
      preferWasm()
      close(lane)
      job.onStatus('Loading Kokoro on the processor…')
      return post(data.id, { ...job, retried: true })
    }
    // Tampoco funcionó en WebAssembly: la gráfica no era el problema, así que la próxima vez se vuelve a probar
    if (job.retried) forgetWasm()
    job.reject(new Error(data.error))
    close(lane)
  }
  workers.set(lane, worker)
  return worker
}

function post(id: number, entry: Pending) {
  pending.set(id, entry)
  const transfer = entry.job.task === 'transcribe' ? [entry.job.audio.buffer] : []
  getWorker(entry.lane).postMessage({ id, job: entry.job }, transfer)
}

function send(job: MediaTask, onStatus: (text: string) => void) {
  return new Promise<string>((resolve, reject) => post(nextId++, { lane: laneOf(modelFor(job)), job, resolve, reject, onStatus }))
}

type MediaOptions = {
  signal?: AbortSignal
  // Cuando el trabajo consigue el modelo y empieza de verdad, tras la cola
  onStart?: () => void
}

// Una tarea de imagen o audio; devuelve texto o una data URL. Cada modelo atiende un trabajo cada vez
export function media(job: MediaTask, onStatus: (text: string) => void = () => {}, { signal, onStart }: MediaOptions = {}) {
  const model = modelFor(job)
  const lane = laneOf(model)
  const { setMedia } = useResources.getState()
  // Mientras hace cola, enseña la descarga que hace otro trabajo del mismo modelo (normalmente la precarga)
  const downloading = (status?: string) => { if (status?.startsWith('Downloading')) onStatus(status) }
  downloading(useResources.getState().media[model].status)
  const follow = useResources.subscribe((s, prev) => {
    if (s.media[model].status !== prev.media[model].status) downloading(s.media[model].status)
  })
  return exclusive(model, async () => {
    follow()
    if (signal?.aborted) throw new DOMException('Stopped', 'AbortError')
    onStart?.()
    const was = useResources.getState().media[model].state
    setMedia(model, { state: was === 'off' ? 'loading' : 'busy' })
    try {
      const result = await send(withVariant(job), text => {
        if (text.startsWith('Downloading')) setMedia(model, { state: 'loading', status: text })
        else setMedia(model, { state: job.task === 'load' ? 'loading' : 'busy', status: text })
        onStatus(text)
      })
      setMedia(model, job.task === 'unload' ? { state: 'off', status: undefined, backend: undefined } : { state: 'ready', status: undefined })
      // Sin modelos cargados ni trabajos en marcha, el worker se cierra para que la memoria vuelva al sistema
      const idle = modelsOf(lane).every(m => useResources.getState().media[m].state === 'off')
      if (job.task === 'unload' && idle && ![...pending.values()].some(p => p.lane === lane)) close(lane)
      return result
    } catch (error) {
      // Si falló en el worker, close() ya lo cerró: el modelo ya no está cargado
      setMedia(model, { state: 'off', status: undefined, backend: undefined })
      throw error
    }
  })
}

// Carga en segundo plano los modelos que un flujo va a necesitar, mientras corren los primeros pasos
export function preload(models: MediaModel[]) {
  models
    .filter(model => useResources.getState().media[model].state === 'off')
    .forEach(model => media({ task: 'load', model }).catch(() => {}))
}

export const unloadModel = (model: MediaModel) => media({ task: 'unload', model })

// Whisper necesita muestras mono a 16 kHz; el navegador decodifica el audio aquí, donde hay AudioContext
export async function decodeAudio(url: string) {
  const data = await (await fetch(url)).arrayBuffer()
  const context = new AudioContext({ sampleRate: 16000 })
  try {
    const buffer = await context.decodeAudioData(data)
    return buffer.getChannelData(0).slice()
  } finally {
    context.close()
  }
}

// Fotos grandes se reducen: los modelos trabajan a 384–512 px y el historial guarda la imagen
export async function shrinkImage(file: Blob, max = 768) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.88)
}

export const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result as string)
  reader.onerror = () => reject(reader.error)
  reader.readAsDataURL(blob)
})
