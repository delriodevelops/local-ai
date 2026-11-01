// Vídeo con fal.ai: los modelos de vídeo no caben en un navegador, así que esto sí sale del ordenador
const QUEUE = 'https://queue.fal.run'

type Status = { status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED'; queue_position?: number; error?: string }

export async function generateVideo(
  { prompt, model, key, signal, onStatus }: { prompt: string; model: string; key: string; signal: AbortSignal; onStatus: (text: string) => void },
) {
  const headers = { Authorization: `Key ${key}`, 'Content-Type': 'application/json' }
  const submit = await fetch(`${QUEUE}/${model}`, { method: 'POST', headers, body: JSON.stringify({ prompt }), signal })
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
