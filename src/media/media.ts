import type { MediaMessage, MediaModel, MediaTask } from './worker'
import { exclusive, MEDIA_INFO, useResources } from '@/engine/resources'

export const VOICES = [
  { id: 'af_heart', label: 'Heart (US, female)' },
  { id: 'af_bella', label: 'Bella (US, female)' },
  { id: 'am_michael', label: 'Michael (US, male)' },
  { id: 'bf_emma', label: 'Emma (UK, female)' },
  { id: 'bm_george', label: 'George (UK, male)' },
]

type Lane = 'gpu' | 'cpu'
const workers = new Map<Lane, Worker>()
let nextId = 0
const pending = new Map<number, { resolve: (v: string) => void; reject: (e: Error) => void; onStatus: (t: string) => void }>()

// Kokoro va en el procesador y lo demás en la gráfica: cada uno en su worker para que trabajen a la vez
const laneOf = (model: MediaModel): Lane => (MEDIA_INFO[model].device === 'CPU' ? 'cpu' : 'gpu')

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
    const job = pending.get(data.id)
    if (!job) return
    if (data.type === 'status') return job.onStatus(data.text)
    pending.delete(data.id)
    if (data.type === 'done') job.resolve(data.result)
    else job.reject(new Error(data.error))
  }
  workers.set(lane, worker)
  return worker
}

function send(job: MediaTask, onStatus: (text: string) => void) {
  const model = modelFor(job)
  const id = nextId++
  return new Promise<string>((resolve, reject) => {
    pending.set(id, { resolve, reject, onStatus })
    const transfer = job.task === 'transcribe' ? [job.audio.buffer] : []
    getWorker(laneOf(model)).postMessage({ id, job }, transfer)
  })
}

// Una tarea de imagen o audio; devuelve texto o una data URL. Cada modelo atiende un trabajo cada vez
export function media(job: MediaTask, onStatus: (text: string) => void = () => {}) {
  const model = modelFor(job)
  const { setMedia } = useResources.getState()
  return exclusive(model, async () => {
    const was = useResources.getState().media[model].state
    setMedia(model, { state: was === 'off' ? 'loading' : 'busy' })
    try {
      const result = await send(job, text => {
        if (text.startsWith('Downloading')) setMedia(model, { state: 'loading', status: text })
        else setMedia(model, { state: job.task === 'load' ? 'loading' : 'busy', status: text })
        onStatus(text)
      })
      setMedia(model, { state: job.task === 'unload' ? 'off' : 'ready', status: undefined })
      return result
    } catch (error) {
      setMedia(model, { state: was === 'busy' ? 'ready' : was, status: undefined })
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
