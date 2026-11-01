import { generate } from '@/engine/engine'
import { OUTPUTS, topologicalOrder } from './graph'
import type { FlowEdge, FlowNode, StepResult, Value } from './types'

type RunOptions = {
  input: string
  nodes: FlowNode[]
  edges: FlowEdge[]
  temperature: number
  maxTokens: number
  signal: AbortSignal
  onUpdate: (steps: StepResult[]) => void
}

const asText = (value: Value) => (value.type === 'text' ? value.text : value.items.join('\n\n'))

// "1. idea", "- idea", "• idea" → "idea"
export function splitItems(text: string, max: number) {
  return text
    .split('\n')
    .map(line => line.replace(/^\s*([-*•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)
    .slice(0, max)
}

// Ejecuta el flujo nodo a nodo. El modelo es uno solo, así que las ramas paralelas se resuelven por turnos
export async function runFlow({ input, nodes, edges, temperature, maxTokens, signal, onUpdate }: RunOptions) {
  const order = topologicalOrder(nodes, edges)
  const steps: StepResult[] = order
    .filter(n => n.type !== 'input')
    .map(n => ({ nodeId: n.id, kind: n.type, label: n.data.label, color: n.type === 'assistant' ? n.data.color : undefined, state: 'waiting' }))
  // Salida de cada nodo por conector; null = esa rama no se tomó
  const results = new Map<string, Value | null>()

  // Agrupa las actualizaciones por fotograma: el streaming emite muchos tokens por segundo
  let frame = 0
  const flush = () => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => onUpdate(steps.map(s => ({ ...s }))))
  }
  const step = (id: string) => steps.find(s => s.nodeId === id)!
  const label = (id: string) => nodes.find(n => n.id === id)?.data.label ?? 'Input'

  for (const node of order) {
    if (signal.aborted) break
    const incoming = edges
      .filter(e => e.target === node.id)
      .map(e => ({ source: e.source, value: results.get(`${e.source}:${e.sourceHandle ?? 'out'}`) ?? null }))
    const live = incoming.filter((i): i is { source: string; value: Value } => !!i.value)

    if (node.type === 'input') {
      results.set(`${node.id}:out`, { type: 'text', text: input })
      continue
    }

    const current = step(node.id)
    if (!live.length) {
      current.state = 'skipped'
      OUTPUTS[node.type].forEach(h => results.set(`${node.id}:${h}`, null))
      flush()
      continue
    }

    current.state = 'running'
    flush()

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
            { temperature, maxTokens, signal, onToken },
          )

          if (items.length) {
            const answers: string[] = []
            for (const [index, item] of items.entries()) {
              if (signal.aborted) break
              current.progress = { index, total: items.length }
              const content = context ? `${context}\n\n## Item\n\n${item}` : item
              answers.push(await ask(content, text => {
                current.value = { type: 'list', items: [...answers, text] }
                flush()
              }))
            }
            current.value = { type: 'list', items: answers }
          } else {
            current.value = { type: 'text', text: await ask(context, text => {
              current.value = { type: 'text', text }
              flush()
            }) }
          }
          results.set(`${node.id}:out`, current.value)
          break
        }
        case 'join': {
          const parts = live.flatMap(i => (i.value.type === 'list' ? i.value.items : [i.value.text]))
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
        case 'output': {
          current.value = live.length === 1
            ? live[0].value
            : { type: 'text', text: live.map(i => asText(i.value)).join('\n\n') }
          break
        }
      }
      current.state = 'done'
    } catch (error) {
      current.state = 'error'
      current.error = error instanceof Error ? error.message : String(error)
      OUTPUTS[node.type].forEach(h => results.set(`${node.id}:${h}`, null))
    }
    flush()
  }

  // Lo que no llegó a ejecutarse porque se paró
  steps.forEach(s => { if (s.state === 'waiting' || s.state === 'running') s.state = signal.aborted ? 'idle' : 'skipped' })
  cancelAnimationFrame(frame)
  onUpdate(steps.map(s => ({ ...s })))
  return steps
}

