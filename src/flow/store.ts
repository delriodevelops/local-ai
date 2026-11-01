import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { addEdge, applyEdgeChanges, applyNodeChanges, type Connection, type EdgeChange, type NodeChange } from '@xyflow/react'
import { TEMPLATES } from './presets'
import type { FlowEdge, FlowNode } from './types'

export type View = 'chat' | 'flow' | 'split'

type AppState = {
  nodes: FlowNode[]
  edges: FlowEdge[]
  temperature: number
  maxTokens: number
  modelId: string | null
  view: View
  // Sube cada vez que se carga una plantilla, para reencuadrar el lienzo
  templateKey: number
  onNodesChange: (changes: NodeChange<FlowNode>[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  connect: (connection: Connection) => void
  addNode: (node: FlowNode) => void
  updateNode: (id: string, data: Partial<FlowNode['data']>) => void
  loadTemplate: (id: string) => void
  set: (patch: Partial<Pick<AppState, 'temperature' | 'maxTokens' | 'modelId' | 'view'>>) => void
}

const initial = TEMPLATES[1].build()

// Flujo y ajustes se guardan en el navegador; el historial va aparte, en IndexedDB
export const useApp = create<AppState>()(
  persist(
    (set) => ({
      nodes: initial.nodes,
      edges: initial.edges,
      temperature: 0.7,
      maxTokens: 512,
      modelId: null,
      view: 'split',
      templateKey: 0,
      onNodesChange: changes => set(s => ({ nodes: applyNodeChanges(changes, s.nodes) })),
      onEdgesChange: changes => set(s => ({ edges: applyEdgeChanges(changes, s.edges) })),
      connect: connection => set(s => ({ edges: addEdge({ ...connection, animated: false }, s.edges) })),
      addNode: node => set(s => ({ nodes: [...s.nodes.map(n => ({ ...n, selected: false })), { ...node, selected: true }] })),
      updateNode: (id, data) => set(s => ({
        nodes: s.nodes.map(n => (n.id === id ? { ...n, data: { ...n.data, ...data } } as FlowNode : n)),
      })),
      loadTemplate: id => {
        const template = TEMPLATES.find(t => t.id === id)
        if (template) set(s => ({ ...template.build(), templateKey: s.templateKey + 1 }))
      },
      set: patch => set(patch),
    }),
    {
      name: 'meshmind',
      version: 1,
      partialize: ({ nodes, edges, temperature, maxTokens, modelId, view }) =>
        ({ nodes: nodes.map(({ selected: _, ...n }) => n) as FlowNode[], edges, temperature, maxTokens, modelId, view }),
    },
  ),
)
