import type { MediaMessage, MediaModel, MediaTask } from './worker'
import { exclusive, MEDIA_INFO, useResources } from '@/engine/resources'

export const VOICES = [
  { id: 'af_heart', label: 'Heart (US, female)' },
  { id: 'af_bella', label: 'Bella (US, female)' },
  { id: 'am_michael', label: 'Michael (US, male)' },
  { id: 'bf_emma', label: 'Emma (UK, female)' },
  { id: 'bm_george', label: 'George (UK, male)' },
]

type Lane = 'main' | 'voice'
const workers = new Map<Lane, Worker>()
let nextId = 0
const pending = new Map<number, { lane: Lane; resolve: (v: string) => void; reject: (e: Error) => void; onStatus: (t: string) => void }>()

// Kokoro tiene su propio worker y lo demás comparte otro, para que una voz larga no bloquee a Janus ni a Whisper
const laneOf = (model: MediaModel): Lane => (model === 'kokoro' ? 'voice' : 'main')
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
    case 'describe': case 'imagine': return 'janus'
    case 'transcribe': return 'whisper'
    case 'speak': return 'kokoro'
  }
}

function getWorker(lane: Lane) {
  const existing = workers.get(lane)
  if (existing) return existing
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module', name: `media-${lane}` })
  worker.onmessage = ({ data }: MessageEvent<MediaMessage>) => {
    if (data.type === 'backend') return useResources.getState().setMedia(data.model, { backend: data.backend })
    const job = pending.get(data.id)
    if (!job) return
    if (data.type === 'status') return job.onStatus(data.text)
    pending.delete(data.id)
    if (data.type === 'done') return job.resolve(data.result)
    job.reject(new Error(data.error))
    close(lane)
  }
  workers.set(lane, worker)
  return worker
}

function send(job: MediaTask, onStatus: (text: string) => void) {
  const model = modelFor(job)
  const id = nextId++
  return new Promise<string>((resolve, reject) => {
    pending.set(id, { lane: laneOf(model), resolve, reject, onStatus })
    const transfer = job.task === 'transcribe' ? [job.audio.buffer] : []
    getWorker(laneOf(model)).postMessage({ id, job }, transfer)
  })
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
      const result = await send(job, text => {
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

// Fotos grandes se reducen: el modelo trabaja a 384 px y el historial guarda la imagen
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
