import { exclusive, useResources } from '@/engine/resources'
import type { FluxJob, FluxMessage } from './flux-worker'

// Una fase en un worker nuevo que se cierra al acabar: es lo único que devuelve la memoria de la gráfica
function stage<T>(job: FluxJob, onStatus: (text: string) => void, signal?: AbortSignal) {
  return new Promise<T>((resolve, reject) => {
    const worker = new Worker(new URL('./flux-worker.ts', import.meta.url), { type: 'module', name: 'flux' })
    const finish = () => { worker.terminate(); signal?.removeEventListener('abort', stop) }
    const stop = () => { finish(); reject(new DOMException('Stopped', 'AbortError')) }
    signal?.addEventListener('abort', stop, { once: true })
    worker.onmessage = ({ data }: MessageEvent<FluxMessage>) => {
      if (data.type === 'status') return onStatus(data.text)
      finish()
      if (data.type === 'done') resolve(data.result as T)
      else reject(new Error(data.error))
    }
    worker.onerror = event => { finish(); reject(new Error(event.message || 'FLUX.2 klein stopped')) }
    worker.postMessage(job, job.stage === 'denoise' ? [job.embeds.buffer] : job.stage === 'decode' ? [job.latent.buffer] : [])
  })
}

type PaintOptions = {
  onStatus: (text: string) => void
  signal?: AbortSignal
  // Cuando la imagen consigue la gráfica y empieza de verdad, tras la cola
  onStart?: () => void
}

// FLUX.2 klein 4B en tres fases: el prompt, cuatro pasos de difusión y la decodificación. Una imagen cada vez
export function paintFlux(prompt: string, { onStatus, signal, onStart }: PaintOptions) {
  return exclusive('flux', async () => {
    if (signal?.aborted) throw new DOMException('Stopped', 'AbortError')
    onStart?.()
    const { set } = useResources.getState()
    const status = (text: string) => {
      set({ flux: { state: /^(Downloading|Loading)/.test(text) ? 'loading' : 'busy', status: text } })
      onStatus(text)
    }
    try {
      const embeds = await stage<Uint16Array>({ stage: 'encode', prompt }, status, signal)
      const latent = await stage<Float32Array>({ stage: 'denoise', embeds, seed: Math.floor(Math.random() * 2 ** 32) }, status, signal)
      return await stage<string>({ stage: 'decode', latent }, status, signal)
    } catch (error) {
      // Lo normal es que no quepa en la gráfica junto a los demás modelos cargados: Janus-Pro pide mucho menos
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      throw new Error(`${error instanceof Error ? error.message : String(error)} · If FLUX.2 klein keeps failing, choose Janus-Pro 1B in Settings → Local models.`)
    } finally {
      set({ flux: { state: 'off' } })
    }
  })
}
