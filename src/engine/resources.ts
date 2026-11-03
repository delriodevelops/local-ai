import { create } from 'zustand'
import type { MediaBackend, MediaModel } from '@/media/worker'

export type ModelState = 'off' | 'loading' | 'ready' | 'busy'

// Kokoro elige al cargar: fp32 en la gráfica o q8 en el procesador, con tamaños distintos.
// La visión y Whisper dependen del modelo elegido (mediaInfo en media.ts): aquí, el más modesto
export const MEDIA_INFO: Record<MediaModel, { name: string; device: 'GPU' | 'CPU' | 'GPU/CPU'; sizeGB: number | Record<MediaBackend, number> }> = {
  janus: { name: 'Janus-Pro 1B', device: 'GPU', sizeGB: 2.4 },
  vision: { name: 'LFM2.5-VL 450M', device: 'GPU', sizeGB: 0.5 },
  whisper: { name: 'Whisper base', device: 'GPU', sizeGB: 0.3 },
  kokoro: { name: 'Kokoro 82M', device: 'GPU/CPU', sizeGB: { webgpu: 0.33, wasm: 0.09 } },
  supertonic: { name: 'Supertonic 2', device: 'CPU', sizeGB: 0.26 },
}

type MediaEntry = { state: ModelState; status?: string; backend?: MediaBackend }

type ResourcesState = {
  media: Record<MediaModel, MediaEntry>
  // FLUX.2 klein va en sus propios workers, uno por fase (flux.ts): solo está cargado mientras pinta
  flux: MediaEntry
  // Velocidad de la última respuesta del modelo de texto
  tokensPerSecond: number | null
  llmBusy: boolean
  setMedia: (model: MediaModel, patch: Partial<MediaEntry>) => void
  set: (patch: Partial<Pick<ResourcesState, 'flux' | 'tokensPerSecond' | 'llmBusy'>>) => void
}

// Qué modelo está cargado, trabajando o apagado, para el monitor y la planificación
export const useResources = create<ResourcesState>(set => ({
  media: { janus: { state: 'off' }, vision: { state: 'off' }, whisper: { state: 'off' }, kokoro: { state: 'off' }, supertonic: { state: 'off' } },
  flux: { state: 'off' },
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
