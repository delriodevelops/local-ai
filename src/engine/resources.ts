import { create } from 'zustand'
import type { MediaModel } from '@/media/worker'

export type ModelState = 'off' | 'loading' | 'ready' | 'busy'

export const MEDIA_INFO: Record<MediaModel, { name: string; device: 'GPU' | 'CPU'; sizeGB: number }> = {
  janus: { name: 'Janus-Pro 1B', device: 'GPU', sizeGB: 2.4 },
  whisper: { name: 'Whisper base', device: 'GPU', sizeGB: 0.3 },
  kokoro: { name: 'Kokoro 82M', device: 'CPU', sizeGB: 0.1 },
}

type ResourcesState = {
  media: Record<MediaModel, { state: ModelState; status?: string }>
  // Velocidad de la última respuesta del modelo de texto
  tokensPerSecond: number | null
  llmBusy: boolean
  setMedia: (model: MediaModel, patch: { state?: ModelState; status?: string }) => void
  set: (patch: Partial<Pick<ResourcesState, 'tokensPerSecond' | 'llmBusy'>>) => void
}

// Qué modelo está cargado, trabajando o apagado, para el monitor y la planificación
export const useResources = create<ResourcesState>(set => ({
  media: { janus: { state: 'off' }, whisper: { state: 'off' }, kokoro: { state: 'off' } },
  tokensPerSecond: null,
  llmBusy: false,
  setMedia: (model, patch) => set(s => ({ media: { ...s.media, [model]: { ...s.media[model], ...patch } } })),
  set: patch => set(patch),
}))

// Cola por recurso: un modelo no puede atender dos trabajos a la vez, pero modelos distintos sí trabajan en paralelo
const queues = new Map<string, Promise<unknown>>()
export function exclusive<T>(key: string, job: () => Promise<T>): Promise<T> {
  const previous = queues.get(key) ?? Promise.resolve()
  const next = previous.catch(() => {}).then(job)
  queues.set(key, next)
  return next
}
