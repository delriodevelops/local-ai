import type { Edge, Node } from '@xyflow/react'
import type { ToolRef } from '@/mcp/types'

// Lo que viaja por una conexión
export type PortType = 'text' | 'list' | 'image' | 'audio' | 'video'

export type Value =
  | { type: 'text'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'image'; url: string }
  | { type: 'audio'; url: string }
  | { type: 'video'; url: string }

export type InputData = { label: string }
export type AssistantData = { label: string; instructions: string; color: string }
export type JoinData = { label: string; separator: string }
export type SplitData = { label: string; max: number }
export type ConditionData = { label: string; match: string }
export type OutputData = { label: string }
export type DescribeData = { label: string; prompt: string }
// Sin online, pinta Janus-Pro en el equipo; con online, el modelo de fal.ai que diga model
export type ImagineData = { label: string; style: string; online?: boolean; model?: string }
export type TranscribeData = { label: string }
export type SpeakData = { label: string; voice: string }
export type VideoData = { label: string; model: string }
// Una herramienta de un servidor MCP. Los argumentos se escriben como texto; {input} es lo que llega al nodo
export type ToolData = { label: string; serverId: string; tool: string; args: Record<string, string> }
// Un asistente que decide qué herramientas MCP usar, hasta maxSteps llamadas por respuesta
export type AgentData = { label: string; color: string; instructions: string; tools: ToolRef[]; maxSteps: number }

export type InputNode = Node<InputData, 'input'>
export type AssistantNode = Node<AssistantData, 'assistant'>
export type JoinNode = Node<JoinData, 'join'>
export type SplitNode = Node<SplitData, 'split'>
export type ConditionNode = Node<ConditionData, 'condition'>
export type OutputNode = Node<OutputData, 'output'>
export type DescribeNode = Node<DescribeData, 'describe'>
export type ImagineNode = Node<ImagineData, 'imagine'>
export type TranscribeNode = Node<TranscribeData, 'transcribe'>
export type SpeakNode = Node<SpeakData, 'speak'>
export type VideoNode = Node<VideoData, 'video'>
export type ToolNode = Node<ToolData, 'tool'>
export type AgentNode = Node<AgentData, 'agent'>

export type FlowNode =
  | InputNode | AssistantNode | JoinNode | SplitNode | ConditionNode | OutputNode
  | DescribeNode | ImagineNode | TranscribeNode | SpeakNode | VideoNode | ToolNode | AgentNode
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
  // Descarga del modelo o fase de la generación
  status?: string
  // Por qué salida siguió una condición
  branch?: 'yes' | 'no'
  // Lo que tardó el paso, en milisegundos
  ms?: number
  // Herramientas MCP que llamó un agente, en orden
  calls?: ToolCall[]
  error?: string
}

export type ToolCall = { tool: string; args: string; result?: string; error?: string }

// Lo que el usuario adjunta al mensaje, como data URL para que se guarde en el historial
export type Attachments = { image?: string; audio?: string }

export type Turn = {
  id: string
  input: string
  attachments?: Attachments
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
