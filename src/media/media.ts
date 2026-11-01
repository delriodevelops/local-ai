import type { MediaMessage, MediaTask } from './worker'

export const VOICES = [
  { id: 'af_heart', label: 'Heart (US, female)' },
  { id: 'af_bella', label: 'Bella (US, female)' },
  { id: 'am_michael', label: 'Michael (US, male)' },
  { id: 'bf_emma', label: 'Emma (UK, female)' },
  { id: 'bm_george', label: 'George (UK, male)' },
]

let worker: Worker | null = null
let nextId = 0
const pending = new Map<number, { resolve: (v: string) => void; reject: (e: Error) => void; onStatus: (t: string) => void }>()

function getWorker() {
  if (worker) return worker
  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = ({ data }: MessageEvent<MediaMessage>) => {
    const job = pending.get(data.id)
    if (!job) return
    if (data.type === 'status') return job.onStatus(data.text)
    pending.delete(data.id)
    if (data.type === 'done') job.resolve(data.result)
    else job.reject(new Error(data.error))
  }
  return worker
}

// Una tarea de imagen o audio; devuelve texto o una data URL
export function media(job: MediaTask, onStatus: (text: string) => void = () => {}) {
  const id = nextId++
  return new Promise<string>((resolve, reject) => {
    pending.set(id, { resolve, reject, onStatus })
    const transfer = job.task === 'transcribe' ? [job.audio.buffer] : []
    getWorker().postMessage({ id, job }, transfer)
  })
}

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
