// Vídeo con fal.ai: los modelos de vídeo no caben en un navegador, así que esto sí sale del ordenador
const QUEUE = 'https://queue.fal.run'

// Modelos actuales de fal.ai con lo que cuesta un clip de la duración por defecto (precios de fal en noviembre de 2026).
// input: campos que el modelo exige además del prompt. El nodo deja escribir cualquier otro modelo de fal
export const VIDEO_MODELS: { id: string; name: string; price: string; input?: Record<string, string> }[] = [
  { id: 'minimax/h3-max-turbo/text-to-video', name: 'MiniMax H3 Max Turbo', price: '$0.13 · 5 s', input: { prompt_expansion_mode: 'balanced' } },
  { id: 'minimax/h3-max/text-to-video', name: 'MiniMax H3 Max', price: '$0.25 · 5 s', input: { prompt_expansion_mode: 'balanced' } },
  { id: 'blackforestlabs/flux-3-max/text-to-video', name: 'FLUX 3 Max', price: '$0.43 · 5 s' },
  { id: 'fal-ai/kling-video/v3/standard/text-to-video', name: 'Kling 3', price: '$0.70 · 5 s' },
  { id: 'xai/grok-imagine-video/text-to-video', name: 'Grok Imagine', price: '$0.30 · 6 s' },
  { id: 'fal-ai/pixverse/v6/text-to-video', name: 'PixVerse V6', price: '$0.03 · 5 s' },
]

export const DEFAULT_VIDEO_MODEL = VIDEO_MODELS[0].id

type Status = { status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED'; queue_position?: number; error?: string }

export async function generateVideo(
  { prompt, model, key, signal, onStatus }: { prompt: string; model: string; key: string; signal: AbortSignal; onStatus: (text: string) => void },
) {
  const headers = { Authorization: `Key ${key}`, 'Content-Type': 'application/json' }
  const input = { prompt, ...VIDEO_MODELS.find(m => m.id === model)?.input }
  const submit = await fetch(`${QUEUE}/${model}`, { method: 'POST', headers, body: JSON.stringify(input), signal })
  if (!submit.ok) throw new Error(`fal.ai rejected the request (${submit.status}). Check the key and the model id.`)
  const { status_url, response_url } = await submit.json() as { status_url: string; response_url: string }

  // La cola de fal se consulta cada pocos segundos hasta que el vídeo está listo
  while (true) {
    await new Promise(r => setTimeout(r, 3000))
    if (signal.aborted) throw new Error('Stopped')
    const status = await (await fetch(status_url, { headers, signal })).json() as Status
    if (status.error) throw new Error(`fal.ai: ${status.error}`)
    if (status.status === 'COMPLETED') break
    onStatus(status.status === 'IN_QUEUE' ? `In queue · position ${status.queue_position ?? '?'}` : 'Rendering video…')
  }

  const result = await (await fetch(response_url, { headers, signal })).json() as { video?: { url: string } }
  if (!result.video?.url) throw new Error('fal.ai returned no video')
  return result.video.url
}
