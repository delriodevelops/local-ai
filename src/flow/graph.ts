import type { Connection, Edge } from '@xyflow/react'
import type { FlowEdge, FlowNode, NodeKind, PortType } from './types'

// Qué acepta la entrada de cada tipo de nodo
export const ACCEPTS: Record<NodeKind, PortType[]> = {
  input: [],
  assistant: ['text', 'list'],
  join: ['text', 'list'],
  split: ['text'],
  condition: ['text'],
  output: ['text', 'list', 'image', 'audio', 'video'],
  describe: ['image'],
  imagine: ['text'],
  transcribe: ['audio'],
  speak: ['text'],
  video: ['text'],
  tool: ['text', 'list'],
  agent: ['text'],
}

// Salidas de cada tipo de nodo y lo que llevan. 'dynamic': depende de lo que entra
export const OUTPUTS: Record<NodeKind, Record<string, PortType | 'dynamic'>> = {
  input: { out: 'text', image: 'image', audio: 'audio' },
  assistant: { out: 'dynamic' },
  join: { out: 'text' },
  split: { out: 'list' },
  condition: { yes: 'text', no: 'text' },
  output: {},
  describe: { out: 'text' },
  imagine: { out: 'image' },
  transcribe: { out: 'text' },
  speak: { out: 'audio' },
  video: { out: 'video' },
  // Con una lista, la herramienta se llama una vez por elemento
  tool: { out: 'dynamic', image: 'image' },
  agent: { out: 'text' },
}

// Un color por tipo, distinguibles sobre papel y en oscuro: tinta, azul, rojo, ámbar y violeta.
// Solo se usan en estilos en línea, así que la tinta puede ser la variable CSS y seguir el tema
export const PORT_COLOR: Record<PortType, string> = {
  text: 'var(--color-ink)',
  list: '#2f5bff',
  image: '#ff3a1f',
  audio: '#d98e00',
  video: '#7c4dff',
}

// Texto en el color de un tipo: mezclado con el color del texto del tema llega a 4.5:1 en claro y en oscuro
export const portText = (color: string) => `color-mix(in oklab, ${color} 65%, var(--color-neutral-50))`

// Tipo de lo que sale por un conector. Un asistente que recibe una lista responde a cada elemento y devuelve otra lista
export function outputType(nodeId: string, nodes: FlowNode[], edges: FlowEdge[], handle = 'out', seen = new Set<string>()): PortType {
  const node = nodes.find(n => n.id === nodeId)
  if (!node || seen.has(nodeId)) return 'text'
  const type = OUTPUTS[node.type][handle] ?? 'text'
  if (type !== 'dynamic') return type
  seen.add(nodeId)
  const getsList = edges.some(e => e.target === nodeId && outputType(e.source, nodes, edges, e.sourceHandle ?? 'out', seen) === 'list')
  return getsList ? 'list' : 'text'
}

export const edgeType = (edge: FlowEdge, nodes: FlowNode[], edges: FlowEdge[]) =>
  outputType(edge.source, nodes, edges, edge.sourceHandle ?? 'out')

function reaches(from: string, to: string, edges: FlowEdge[], seen = new Set<string>()): boolean {
  if (from === to) return true
  if (seen.has(from)) return false
  seen.add(from)
  return edges.some(e => e.source === from && reaches(e.target, to, edges, seen))
}

export type ConnectionCheck = { ok: true } | { ok: false; reason: string }

export function checkConnection(connection: Connection | Edge, nodes: FlowNode[], edges: FlowEdge[]): ConnectionCheck {
  const source = nodes.find(n => n.id === connection.source)
  const target = nodes.find(n => n.id === connection.target)
  if (!source || !target || source.id === target.id) return { ok: false, reason: 'Invalid connection' }
  if (reaches(target.id, source.id, edges)) return { ok: false, reason: 'That would create a loop' }
  const type = outputType(source.id, nodes, edges, connection.sourceHandle ?? 'out')
  if (!ACCEPTS[target.type].includes(type)) {
    return { ok: false, reason: `${target.data.label} doesn't take ${type}` }
  }
  return { ok: true }
}

// Orden de ejecución: cada nodo después de todos los que le alimentan
export function topologicalOrder(nodes: FlowNode[], edges: FlowEdge[]) {
  const incoming = new Map(nodes.map(n => [n.id, 0]))
  edges.forEach(e => incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1))
  const queue = nodes.filter(n => !incoming.get(n.id)).sort((a, b) => a.position.x - b.position.x)
  const order: FlowNode[] = []
  while (queue.length) {
    const node = queue.shift()!
    order.push(node)
    edges.filter(e => e.source === node.id).forEach(e => {
      const left = (incoming.get(e.target) ?? 0) - 1
      incoming.set(e.target, left)
      if (left === 0) queue.push(nodes.find(n => n.id === e.target)!)
    })
  }
  return order
}

export function validateFlow(nodes: FlowNode[], edges: FlowEdge[]): string | null {
  if (!nodes.some(n => n.type === 'input')) return 'Add a Message node to start the flow.'
  if (!nodes.some(n => n.type === 'output')) return 'Add an Answer node so the flow has a result.'
  const outputsFed = nodes.filter(n => n.type === 'output').some(n => edges.some(e => e.target === n.id))
  if (!outputsFed) return 'Connect something to the Answer node.'
  return null
}

// Nodos que necesitan el modelo de texto (WebLLM)
export const usesLLM = (nodes: FlowNode[]) => nodes.some(n => n.type === 'assistant' || n.type === 'agent')
