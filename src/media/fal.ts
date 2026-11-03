// fal.ai, para lo que no cabe en un navegador: el vídeo y, si se elige, imágenes de más calidad que Janus.
// Esto sí sale del ordenador, con la clave de quien lo usa
const QUEUE = 'https://queue.fal.run'

// input: campos que el modelo exige además del prompt. Los nodos dejan escribir cualquier otro modelo de fal
export type FalModel = { id: string; name: string; price: string; input?: Record<string, string> }

// Modelos de vídeo actuales con lo que cuesta un clip de la duración por defecto (precios de fal en noviembre de 2026)
export const VIDEO_MODELS: FalModel[] = [
  { id: 'minimax/h3-max-turbo/text-to-video', name: 'MiniMax H3 Max Turbo', price: '$0.13 · 5 s', input: { prompt_expansion_mode: 'balanced' } },
  { id: 'minimax/h3-max/text-to-video', name: 'MiniMax H3 Max', price: '$0.25 · 5 s', input: { prompt_expansion_mode: 'balanced' } },
  { id: 'blackforestlabs/flux-3-max/text-to-video', name: 'FLUX 3 Max', price: '$0.43 · 5 s' },
  { id: 'fal-ai/kling-video/v3/standard/text-to-video', name: 'Kling 3', price: '$0.70 · 5 s' },
  { id: 'xai/grok-imagine-video/text-to-video', name: 'Grok Imagine', price: '$0.30 · 6 s' },
  { id: 'fal-ai/pixverse/v6/text-to-video', name: 'PixVerse V6', price: '$0.03 · 5 s' },
]

export const DEFAULT_VIDEO_MODEL = VIDEO_MODELS[0].id

// Modelos de imagen actuales con lo que cuesta una imagen del tamaño por defecto (precios de fal en noviembre de 2026)
export const IMAGE_MODELS: FalModel[] = [
  { id: 'fal-ai/flux-2/flash', name: 'FLUX 2 Flash', price: '$0.004' },
  { id: 'fal-ai/z-image/turbo', name: 'Z-Image Turbo', price: '$0.004' },
  { id: 'fal-ai/flux-2', name: 'FLUX 2', price: '$0.01' },
  { id: 'fal-ai/bytedance/seedream/v4.5/text-to-image', name: 'Seedream 4.5', price: '$0.04' },
  { id: 'bytedance/seedream/v5/pro/text-to-image', name: 'Seedream 5 Pro', price: '$0.07' },
  { id: 'fal-ai/nano-banana-2', name: 'Nano Banana 2', price: '$0.08' },
  { id: 'fal-ai/nano-banana-pro', name: 'Nano Banana Pro', price: '$0.15' },
]

type Status = { status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED'; queue_position?: number; error?: string }

type Job = { prompt: string; model: string; key: string; signal: AbortSignal; onStatus: (text: string) => void }

// Manda el trabajo a la cola de fal y la consulta hasta que está listo: un vídeo tarda minutos y una imagen, segundos
async function run({ prompt, model, key, signal, onStatus }: Job, models: FalModel[], working: string, every: number) {
  const headers = { Authorization: `Key ${key}`, 'Content-Type': 'application/json' }
  const input = { prompt, ...models.find(m => m.id === model)?.input }
  const submit = await fetch(`${QUEUE}/${model}`, { method: 'POST', headers, body: JSON.stringify(input), signal })
  if (!submit.ok) throw new Error(`fal.ai rejected the request (${submit.status}). Check the key and the model id.`)
  const { status_url, response_url } = await submit.json() as { status_url: string; response_url: string }

  while (true) {
    await new Promise(r => setTimeout(r, every))
    if (signal.aborted) throw new Error('Stopped')
    const status = await (await fetch(status_url, { headers, signal })).json() as Status
    if (status.error) throw new Error(`fal.ai: ${status.error}`)
    if (status.status === 'COMPLETED') break
    onStatus(status.status === 'IN_QUEUE' ? `In queue · position ${status.queue_position ?? '?'}` : working)
  }

  return await (await fetch(response_url, { headers, signal })).json() as unknown
}

export async function generateVideo(job: Job) {
  const result = await run(job, VIDEO_MODELS, 'Rendering video…', 3000) as { video?: { url: string } }
  if (!result.video?.url) throw new Error('fal.ai returned no video')
  return result.video.url
}

export async function generateImage(job: Job) {
  const result = await run(job, IMAGE_MODELS, 'Painting…', 1000) as { images?: { url: string }[] }
  const url = result.images?.[0]?.url
  if (!url) throw new Error('fal.ai returned no image')
  return url
}
