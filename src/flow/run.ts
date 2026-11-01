import { generate } from '@/engine/engine'
import { decodeAudio, media, preload } from '@/media/media'
import type { MediaModel, MediaTask } from '@/media/worker'
import { generateVideo } from '@/media/video'
import { OUTPUTS, topologicalOrder } from './graph'
import type { Attachments, FlowEdge, FlowNode, StepResult, Value } from './types'

type RunOptions = {
  input: string
  attachments: Attachments
  nodes: FlowNode[]
  edges: FlowEdge[]
  temperature: number
  maxTokens: number
  falKey: string
  signal: AbortSignal
  onUpdate: (steps: StepResult[]) => void
}

const MEDIA_MODEL: Partial<Record<FlowNode['type'], MediaModel>> = { describe: 'janus', imagine: 'janus', transcribe: 'whisper', speak: 'kokoro' }

const asText = (value: Value) =>
  value.type === 'text' ? value.text : value.type === 'list' ? value.items.join('\n\n') : ''

// "1. idea", "- idea", "• idea" → "idea"
export function splitItems(text: string, max: number) {
  return text
    .split('\n')
    .map(line => line.replace(/^\s*([-*•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)
    .slice(0, max)
}

// Ejecuta el flujo. Cada nodo arranca en cuanto terminan los que le alimentan: las ramas que usan modelos
// distintos (gráfica y procesador) trabajan a la vez, y las que comparten modelo hacen cola en él
export async function runFlow({ input, attachments, nodes, edges, temperature, maxTokens, falKey, signal, onUpdate }: RunOptions) {
  const order = topologicalOrder(nodes, edges)
  const steps: StepResult[] = order
    .filter(n => n.type !== 'input')
    .map(n => ({ nodeId: n.id, kind: n.type, label: n.data.label, color: n.type === 'assistant' ? n.data.color : undefined, state: 'waiting' }))
  // Salida de cada nodo por conector; null = esa rama no se tomó
  const results = new Map<string, Value | null>()

  // Agrupa las actualizaciones: el streaming emite muchos tokens por segundo.
  // Con un temporizador y no por fotograma, para que siga avanzando con la pestaña en segundo plano
  let timer: ReturnType<typeof setTimeout> | null = null
  const flush = () => {
    timer ??= setTimeout(() => {
      timer = null
      onUpdate(steps.map(s => ({ ...s })))
    }, 50)
  }
  const step = (id: string) => steps.find(s => s.nodeId === id)!
  const label = (id: string) => nodes.find(n => n.id === id)?.data.label ?? 'Input'
  const skipOutputs = (node: FlowNode) => Object.keys(OUTPUTS[node.type]).forEach(h => results.set(`${node.id}:${h}`, null))

  // Mientras corren los primeros pasos, se cargan los modelos de imagen y audio que harán falta después.
  // Solo los de nodos a los que puede llegar algo: sin grabación, la rama de voz no corre y Whisper sobra
  const carries: Record<string, boolean> = { out: !!input.trim(), image: !!attachments.image, audio: !!attachments.audio }
  const reachable = new Set<string>()
  const reach = (id: string) => {
    if (reachable.has(id)) return
    reachable.add(id)
    edges.filter(e => e.source === id).forEach(e => reach(e.target))
  }
  nodes
    .filter(n => n.type === 'input')
    .forEach(n => edges.filter(e => e.source === n.id && carries[e.sourceHandle ?? 'out']).forEach(e => reach(e.target)))
  preload([...new Set(nodes.filter(n => reachable.has(n.id)).map(n => MEDIA_MODEL[n.type]).filter((m): m is MediaModel => !!m))])

  const finished = new Map<string, Promise<void>>()
  const runNode = async (node: FlowNode) => {
    await Promise.all(edges.filter(e => e.target === node.id).map(e => finished.get(e.source)))
    if (signal.aborted) return
    const incoming = edges
      .filter(e => e.target === node.id)
      .map(e => ({ source: e.source, value: results.get(`${e.source}:${e.sourceHandle ?? 'out'}`) ?? null }))
    const live = incoming.filter((i): i is { source: string; value: Value } => !!i.value)

    if (node.type === 'input') {
      results.set(`${node.id}:out`, input.trim() ? { type: 'text', text: input } : null)
      results.set(`${node.id}:image`, attachments.image ? { type: 'image', url: attachments.image } : null)
      results.set(`${node.id}:audio`, attachments.audio ? { type: 'audio', url: attachments.audio } : null)
      return
    }

    const current = step(node.id)
    if (!live.length) {
      current.state = 'skipped'
      skipOutputs(node)
      flush()
      return
    }

    // Un paso con modelo sigue 'waiting' mientras hace cola en él, y el reloj solo cuenta el tiempo de trabajo
    let active = 0
    let since: number | null = null
    const start = () => { since = performance.now(); current.state = 'running'; current.status = undefined; flush() }
    const pause = () => { if (since !== null) active += performance.now() - since; since = null }
    if (node.type === 'assistant' || MEDIA_MODEL[node.type]) {
      current.status = 'Queued'
      flush()
    } else start()
    const onStatus = (status: string) => { current.status = status; flush() }
    const runMedia = (job: MediaTask) => media(job, onStatus, { signal, onStart: start }).finally(pause)
    const text = () => live.map(i => asText(i.value)).filter(Boolean).join('\n\n')

    try {
      switch (node.type) {
        case 'assistant': {
          const texts = live.filter(i => i.value.type === 'text')
          const items = live.flatMap(i => (i.value.type === 'list' ? i.value.items : []))
          const context = texts.length === 1
            ? asText(texts[0].value)
            : texts.map(t => `## ${label(t.source)}\n\n${asText(t.value)}`).join('\n\n')
          const ask = (content: string, onToken: (text: string) => void) => generate(
            [{ role: 'system', content: node.data.instructions || 'You are a helpful assistant.' }, { role: 'user', content }],
            { temperature, maxTokens, signal, onToken, onStart: start },
          ).finally(pause)

          if (items.length) {
            const answers: string[] = []
            for (const [index, item] of items.entries()) {
              if (signal.aborted) break
              current.progress = { index, total: items.length }
              const content = context ? `${context}\n\n## Item\n\n${item}` : item
              try {
                answers.push(await ask(content, partial => {
                  current.value = { type: 'list', items: [...answers, partial] }
                  flush()
                }))
              } catch (error) {
                // Parado mientras el siguiente elemento esperaba turno: se queda con los que ya terminó
                if (signal.aborted && answers.length) break
                throw error
              }
            }
            current.value = { type: 'list', items: answers }
          } else {
            current.value = { type: 'text', text: await ask(context, partial => {
              current.value = { type: 'text', text: partial }
              flush()
            }) }
          }
          results.set(`${node.id}:out`, current.value)
          break
        }
        case 'join': {
          const parts = live.flatMap(i => (i.value.type === 'list' ? i.value.items : [asText(i.value)]))
          current.value = { type: 'text', text: parts.join(node.data.separator || '\n\n') }
          results.set(`${node.id}:out`, current.value)
          break
        }
        case 'split': {
          current.value = { type: 'list', items: splitItems(asText(live[0].value), node.data.max) }
          results.set(`${node.id}:out`, current.value)
          break
        }
        case 'condition': {
          current.value = live[0].value
          const passed = asText(live[0].value).toLowerCase().includes(node.data.match.trim().toLowerCase())
          current.branch = passed ? 'yes' : 'no'
          results.set(`${node.id}:yes`, passed ? live[0].value : null)
          results.set(`${node.id}:no`, passed ? null : live[0].value)
          break
        }
        case 'describe': {
          const image = live.find(i => i.value.type === 'image')!.value as { url: string }
          current.value = { type: 'text', text: await runMedia({ task: 'describe', image: image.url, prompt: node.data.prompt || 'Describe this image in detail.' }) }
          results.set(`${node.id}:out`, current.value)
          break
        }
        case 'imagine': {
          const prompt = [text(), node.data.style].filter(Boolean).join(', ')
          current.value = { type: 'image', url: await runMedia({ task: 'imagine', prompt }) }
          results.set(`${node.id}:out`, current.value)
          break
        }
        case 'transcribe': {
          const audio = live.find(i => i.value.type === 'audio')!.value as { url: string }
          onStatus('Decoding audio…')
          const samples = await decodeAudio(audio.url)
          onStatus('Queued')
          current.value = { type: 'text', text: await runMedia({ task: 'transcribe', audio: samples }) }
          results.set(`${node.id}:out`, current.value)
          break
        }
        case 'speak': {
          current.value = { type: 'audio', url: await runMedia({ task: 'speak', text: text(), voice: node.data.voice }) }
          results.set(`${node.id}:out`, current.value)
          break
        }
        case 'video': {
          if (!falKey) throw new Error('Add your fal.ai key in Settings to generate video.')
          current.value = { type: 'video', url: await generateVideo({ prompt: text(), model: node.data.model, key: falKey, signal, onStatus }) }
          results.set(`${node.id}:out`, current.value)
          break
        }
        case 'output': {
          const visual = live.find(i => !['text', 'list'].includes(i.value.type))
          current.value = visual
            ? visual.value
            : live.length === 1 ? live[0].value : { type: 'text', text: text() }
          break
        }
      }
      pause()
      current.status = undefined
      current.state = 'done'
      current.ms = Math.round(active)
    } catch (error) {
      current.status = undefined
      skipOutputs(node)
      // Parado antes de acabar: el repaso final lo deja en 'idle', sin error
      if (!signal.aborted) {
        current.state = 'error'
        current.error = error instanceof Error ? error.message : String(error)
      }
    }
    flush()
  }
  for (const node of order) finished.set(node.id, runNode(node))
  await Promise.all(finished.values())

  // Lo que no llegó a ejecutarse porque se paró
  steps.forEach(s => {
    if (s.state !== 'waiting' && s.state !== 'running') return
    s.state = signal.aborted ? 'idle' : 'skipped'
    s.status = undefined
  })
  if (timer) clearTimeout(timer)
  onUpdate(steps.map(s => ({ ...s })))
  return steps
}
