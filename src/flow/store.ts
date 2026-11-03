import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { addEdge, applyEdgeChanges, applyNodeChanges, type Connection, type EdgeChange, type NodeChange } from '@xyflow/react'
import { EMBED } from '@/embed'
import { SUGGESTED } from '@/mcp/servers'
import type { McpServer } from '@/mcp/types'
import type { LocalTask } from '@/media/catalog'
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
  // Whisper y modelo de visión elegidos en Ajustes; sin elección, el más nuevo y listo que cabe en el equipo
  localModels: Partial<Record<LocalTask, string>>
  // Servidores MCP online, con su token y la última lista de herramientas que dieron
  mcpServers: McpServer[]
  view: View
  theme: Theme
  // Sube cada vez que se carga una plantilla, para reencuadrar el lienzo
  templateKey: number
  onNodesChange: (changes: NodeChange<FlowNode>[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  connect: (connection: Connection) => void
  addNode: (node: FlowNode) => void
  updateNode: (id: string, data: Partial<FlowNode['data']>) => void
  addServer: (server: McpServer) => void
  updateServer: (id: string, patch: Partial<McpServer>) => void
  removeServer: (id: string) => void
  loadTemplate: (id: string) => void
  set: (patch: Partial<Pick<AppState, 'temperature' | 'maxTokens' | 'modelId' | 'view' | 'falKey' | 'localModels' | 'theme'>>) => void
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
      localModels: {},
      mcpServers: [],
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
      addServer: server => set(s => ({ mcpServers: [...s.mcpServers.filter(m => m.id !== server.id), server] })),
      updateServer: (id, patch) => set(s => ({ mcpServers: s.mcpServers.map(m => (m.id === id ? { ...m, ...patch } : m)) })),
      removeServer: id => set(s => ({ mcpServers: s.mcpServers.filter(m => m.id !== id) })),
      loadTemplate: id => {
        const template = TEMPLATES.find(t => t.id === id)
        if (!template) return
        const { servers = [], ...flow } = template.build()
        set(s => {
          // Los servidores MCP que usa la plantilla se añaden si faltan. Si ya estaba (también añadido a mano, con
          // la misma dirección y otro id), se usa ese, y los nodos de la plantilla pasan a apuntarle
          const alias = new Map<string, string>()
          const missing: McpServer[] = []
          SUGGESTED.filter(m => servers.includes(m.id)).forEach(m => {
            const existing = s.mcpServers.find(x => x.id === m.id || x.url === m.url)
            if (existing) alias.set(m.id, existing.id)
            else missing.push({ ...m, token: '', tools: [] })
          })
          const serverOf = (id: string) => alias.get(id) ?? id
          const nodes = flow.nodes.map(n => (n.type === 'tool' ? { ...n, data: { ...n.data, serverId: serverOf(n.data.serverId) } }
            : n.type === 'agent' ? { ...n, data: { ...n.data, tools: n.data.tools.map(t => ({ ...t, serverId: serverOf(t.serverId) })) } }
            : n) as FlowNode)
          return { nodes, edges: flow.edges, templateKey: s.templateKey + 1, mcpServers: [...s.mcpServers, ...missing] }
        })
      },
      set: patch => set(patch),
    }),
    {
      name: 'meshmind',
      version: 1,
      storage: createJSONStorage(() => (EMBED ? readOnly : localStorage)),
      partialize: ({ nodes, edges, temperature, maxTokens, modelId, falKey, localModels, mcpServers, view, theme }) =>
        ({ nodes: nodes.map(({ selected: _, ...n }) => n) as FlowNode[], edges, temperature, maxTokens, modelId, falKey, localModels, mcpServers, view, theme }),
    },
  ),
)
