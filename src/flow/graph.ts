import type { Connection, Edge } from '@xyflow/react'
import type { FlowEdge, FlowNode, NodeKind, PortType } from './types'

// Qué acepta la entrada de cada tipo de nodo
export const ACCEPTS: Record<NodeKind, PortType[]> = {
  input: [],
  assistant: ['text', 'list'],
  join: ['text', 'list'],
  split: ['text'],
  condition: ['text'],
  output: ['text', 'list'],
}

export const OUTPUTS: Record<NodeKind, string[]> = {
  input: ['out'],
  assistant: ['out'],
  join: ['out'],
  split: ['out'],
  condition: ['yes', 'no'],
  output: [],
}

// Tipo de lo que sale de un nodo. Un asistente que recibe una lista responde a cada elemento y devuelve otra lista
export function outputType(nodeId: string, nodes: FlowNode[], edges: FlowEdge[], seen = new Set<string>()): PortType {
  const node = nodes.find(n => n.id === nodeId)
  if (!node || seen.has(nodeId)) return 'text'
  seen.add(nodeId)
  switch (node.type) {
    case 'split':
      return 'list'
    case 'assistant':
      return edges.some(e => e.target === nodeId && outputType(e.source, nodes, edges, seen) === 'list') ? 'list' : 'text'
    default:
      return 'text'
  }
}

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
  const type = outputType(source.id, nodes, edges)
  if (!ACCEPTS[target.type].includes(type)) {
    return { ok: false, reason: `${target.data.label} takes text, not a list` }
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
