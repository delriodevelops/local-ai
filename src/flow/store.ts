import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { addEdge, applyEdgeChanges, applyNodeChanges, type Connection, type EdgeChange, type NodeChange } from '@xyflow/react'
import { EMBED } from '@/embed'
import { TEMPLATES } from './presets'
import type { FlowEdge, FlowNode } from './types'

export type View = 'chat' | 'flow' | 'split'
// 'system' sigue la preferencia del sistema operativo
export type Theme = 'system' | 'light' | 'dark'

type AppState = {
  nodes: FlowNode[]
  edges: FlowEdge[]
  temperature: number
  maxTokens: number
  modelId: string | null
  // Clave de fal.ai para el nodo de vídeo; solo se guarda en este navegador
  falKey: string
  view: View
  theme: Theme
  // Sube cada vez que se carga una plantilla, para reencuadrar el lienzo
  templateKey: number
  onNodesChange: (changes: NodeChange<FlowNode>[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  connect: (connection: Connection) => void
  addNode: (node: FlowNode) => void
  updateNode: (id: string, data: Partial<FlowNode['data']>) => void
  loadTemplate: (id: string) => void
  set: (patch: Partial<Pick<AppState, 'temperature' | 'maxTokens' | 'modelId' | 'view' | 'falKey' | 'theme'>>) => void
}

const initial = TEMPLATES[1].build()

// Incrustada en la landing, la demo arranca con los ajustes del visitante (tema, modelo) pero no escribe nada:
// es la misma web, y si guardase, la plantilla de la demo sustituiría su flujo
const readOnly: StateStorage = {
  getItem: key => localStorage.getItem(key),
  setItem: () => {},
  removeItem: () => {},
}

// Flujo y ajustes se guardan en el navegador; el historial va aparte, en IndexedDB
export const useApp = create<AppState>()(
  persist(
    (set) => ({
      nodes: initial.nodes,
      edges: initial.edges,
      temperature: 0.7,
      maxTokens: 512,
      modelId: null,
      falKey: '',
      view: 'split',
      theme: 'system',
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
      storage: createJSONStorage(() => (EMBED ? readOnly : localStorage)),
      partialize: ({ nodes, edges, temperature, maxTokens, modelId, falKey, view, theme }) =>
        ({ nodes: nodes.map(({ selected: _, ...n }) => n) as FlowNode[], edges, temperature, maxTokens, modelId, falKey, view, theme }),
    },
  ),
)
