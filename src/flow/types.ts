import type { Edge, Node } from '@xyflow/react'

// Lo que viaja por una conexión: un texto o una lista de textos
export type PortType = 'text' | 'list'

export type Value =
  | { type: 'text'; text: string }
  | { type: 'list'; items: string[] }

export type InputData = { label: string }
export type AssistantData = { label: string; instructions: string; color: string }
export type JoinData = { label: string; separator: string }
export type SplitData = { label: string; max: number }
export type ConditionData = { label: string; match: string }
export type OutputData = { label: string }

export type InputNode = Node<InputData, 'input'>
export type AssistantNode = Node<AssistantData, 'assistant'>
export type JoinNode = Node<JoinData, 'join'>
export type SplitNode = Node<SplitData, 'split'>
export type ConditionNode = Node<ConditionData, 'condition'>
export type OutputNode = Node<OutputData, 'output'>

export type FlowNode = InputNode | AssistantNode | JoinNode | SplitNode | ConditionNode | OutputNode
export type FlowEdge = Edge
export type NodeKind = FlowNode['type']

export type StepState = 'idle' | 'waiting' | 'running' | 'done' | 'skipped' | 'error'

export type StepResult = {
  nodeId: string
  kind: NodeKind
  label: string
  color?: string
  state: StepState
  value?: Value
  // Mientras un asistente recorre una lista: por qué elemento va
  progress?: { index: number; total: number }
  // Por qué salida siguió una condición
  branch?: 'yes' | 'no'
  error?: string
}

export type Turn = {
  id: string
  input: string
  steps: StepResult[]
  status: 'running' | 'done' | 'stopped' | 'error'
  startedAt: number
  modelId: string
}

export type Conversation = {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  turns: Turn[]
}
