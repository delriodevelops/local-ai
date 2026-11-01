import { create } from 'zustand'
import { useApp } from '@/flow/store'
import type { McpServer, McpStatus } from './types'

// Cómo va la conexión con cada servidor (se olvida al cerrar la página) y si la ventana de servidores está abierta
export const useMcp = create<{ status: Record<string, McpStatus | undefined>; open: boolean }>(() => ({ status: {}, open: false }))

const setStatus = (id: string, status: McpStatus) => useMcp.setState(s => ({ status: { ...s.status, [id]: status } }))

// Conecta, pide las herramientas y las guarda con el servidor
export async function refreshServer(server: McpServer) {
  setStatus(server.id, { state: 'connecting' })
  const mcp = await import('./client')
  try {
    const tools = await mcp.listTools(server)
    useApp.getState().updateServer(server.id, { tools })
    setStatus(server.id, { state: 'ready' })
  } catch (error) {
    setStatus(server.id, { state: 'error', ...mcp.explain(error, server.url) })
  }
}

export async function forgetServer(id: string) {
  useApp.getState().removeServer(id)
  useMcp.setState(s => ({ status: { ...s.status, [id]: undefined } }))
  const mcp = await import('./client')
  mcp.disconnect(id)
}
