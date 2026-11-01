import { create } from 'zustand'
import { useApp } from '@/flow/store'
import type { McpServer, McpStatus } from './types'

// Cómo va la conexión con cada servidor (se olvida al cerrar la página) y si la ventana de servidores está abierta
export const useMcp = create<{ status: Record<string, McpStatus | undefined>; open: boolean }>(() => ({ status: {}, open: false }))

const setStatus = (id: string, status: McpStatus) => useMcp.setState(s => ({ status: { ...s.status, [id]: status } }))

// Conecta, pide las herramientas y las guarda con el servidor.
// fresh: cierra antes la conexión que hubiera ("Connect again"), por si el servidor reinició y olvidó la sesión
export async function refreshServer(server: McpServer, fresh = false) {
  setStatus(server.id, { state: 'connecting' })
  let mcp: typeof import('./client') | undefined
  // Si se quitó mientras tanto, no se deja un estado suyo: si vuelve (otra plantilla), empieza de cero
  const present = () => useApp.getState().mcpServers.some(s => s.id === server.id)
  try {
    mcp = await import('./client')
    if (fresh) mcp.disconnect(server.id)
    const tools = await mcp.listTools(server)
    if (!present()) return
    useApp.getState().updateServer(server.id, { tools })
    setStatus(server.id, { state: 'ready' })
  } catch (error) {
    if (!present()) return
    // Sin el módulo (sin red, o la web se actualizó y su archivo ya no existe) solo queda recargar
    setStatus(server.id, mcp
      ? { state: 'error', ...mcp.explain(error, server.url, !!server.token) }
      : { state: 'error', message: 'Could not load the MCP client.', hint: 'Reload the page.' })
  }
}

export async function forgetServer(id: string) {
  useApp.getState().removeServer(id)
  useMcp.setState(s => ({ status: { ...s.status, [id]: undefined } }))
  const mcp = await import('./client').catch(() => undefined)
  mcp?.disconnect(id)
}
