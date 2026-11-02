import { useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ChevronDown, LoaderCircle, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useApp } from '@/flow/store'
import { newId } from '@/flow/presets'
import { firstLine } from '@/mcp/args'
import { SUGGESTED } from '@/mcp/servers'
import { forgetServer, refreshServer, useMcp } from '@/mcp/store'
import type { McpServer } from '@/mcp/types'

// Guía para usar servidores locales (stdio) a través de un puente
const BRIDGE_GUIDE = 'https://github.com/delriodevelops/meshmind/blob/main/docs/mcp-local-bridge.md'

const field = 'border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-signal placeholder:text-neutral-500'

function ServerRow({ server }: { server: McpServer }) {
  const status = useMcp(s => s.status[server.id])
  const updateServer = useApp(s => s.updateServer)
  const [open, setOpen] = useState(false)
  const busy = status?.state === 'connecting'
  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        {/* Como los estados del monitor: rayado mientras conecta, tinta si responde, rojo si falla, hueco sin conectar */}
        <span className={cn('w-2.5 h-2.5 shrink-0', {
          'hatch': busy,
          'bg-ink': !busy && (status?.state === 'ready' || (!status && server.tools.length)),
          'bg-signal': status?.state === 'error',
          'border border-neutral-600': !busy && !status && !server.tools.length,
        })} />
        <button type="button" onClick={() => setOpen(o => !o)} className="flex-1 min-w-0 text-left">
          <span className="flex items-center gap-1.5 text-sm font-medium text-neutral-100">
            {server.label}
            <ChevronDown className={cn('w-3.5 h-3.5 text-neutral-500 duration-200', open && 'rotate-180')} />
          </span>
          <span className="block truncate font-mono text-[10.5px] text-neutral-500">
            {busy ? 'connecting…' : server.tools.length ? `${server.tools.length} tools` : status?.state === 'ready' ? 'no tools' : 'not connected'} · {server.url}
          </span>
        </button>
        {/* Conexión nueva, no la guardada: si el servidor reinició, la sesión anterior ya no le vale */}
        <button type="button" title="Connect again" disabled={busy} onClick={() => refreshServer(useApp.getState().mcpServers.find(s => s.id === server.id) ?? server, true)} className="p-1.5 text-neutral-400 hover:bg-ink hover:text-paper duration-200 disabled:opacity-40">
          {busy ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
        <button type="button" title="Remove" onClick={() => forgetServer(server.id)} className="p-1.5 text-neutral-400 hover:text-signal-ink duration-200">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {status?.state === 'error' && (
        <p className="mt-2 ml-5 text-xs text-signal-ink">{status.message}{status.hint && <span className="text-neutral-400"> {status.hint}</span>}</p>
      )}
      {open && (
        <div className="mt-3 ml-5 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs text-neutral-400">
            Token · optional
            <input
              type="password" value={server.token} autoComplete="off" placeholder="Not set"
              onChange={e => updateServer(server.id, { token: e.target.value.trim() })}
              className={cn(field, 'font-mono text-xs')}
            />
          </label>
          {!!server.tools.length && (
            <ul className="flex flex-col gap-1.5">
              {server.tools.map(tool => (
                <li key={tool.name} className="text-xs">
                  <span className="font-mono text-neutral-100">{tool.name}</span>
                  {tool.description && <span className="text-neutral-500"> · {firstLine(tool.description, 90)}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  )
}

// Servidores MCP online: se añaden por dirección, con token si lo piden, y sus herramientas quedan para los nodos
export default function McpServers() {
  const open = useMcp(s => s.open)
  const servers = useApp(s => s.mcpServers)
  const addServer = useApp(s => s.addServer)
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(null)

  const add = (server: McpServer) => {
    addServer(server)
    refreshServer(server)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    let address: URL
    try { address = new URL(url.trim()) } catch { return setError('Write the full address, starting with https://') }
    // "localhost:8000/mcp" también es una URL válida (con "localhost:" como esquema)
    if (address.protocol !== 'https:' && address.protocol !== 'http:') return setError('Write the full address, starting with https:// (or http:// for a local bridge).')
    if (servers.some(s => s.url === address.href)) return setError('That server is already in the list.')
    setError(null)
    // host conserva el puerto: dos puentes locales no se llaman igual
    add({ id: newId('mcp'), label: address.host.replace(/^(www|mcp|api)\./, ''), url: address.href, token: token.trim(), tools: [] })
    setUrl('')
    setToken('')
  }

  const suggestions = SUGGESTED.filter(s => !servers.some(m => m.id === s.id || m.url === s.url))

  return (
    <Dialog.Root open={open} onOpenChange={value => useMcp.setState({ open: value })}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <Dialog.Content className="fixed z-50 inset-x-0 bottom-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[34rem] max-h-[85dvh] flex flex-col border-2 border-ink bg-paper animate-rise">
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
            <Dialog.Title className="display text-[40px] text-neutral-50">MCP servers</Dialog.Title>
            <Dialog.Close className="w-9 h-9 shrink-0 flex items-center justify-center text-neutral-400 hover:bg-ink hover:text-paper duration-200"><X className="w-4 h-4" /></Dialog.Close>
          </div>
          <Dialog.Description className="px-6 text-[15px] leading-relaxed text-neutral-300">
            Give your flows tools from MCP servers on the web. The models still run on your machine; a tool call sends its arguments to that server.
          </Dialog.Description>

          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {servers.length ? (
              <ul className="mt-5 divide-y divide-line border-t-2 border-ink border-b border-b-line">
                {servers.map(server => <ServerRow key={server.id} server={server} />)}
              </ul>
            ) : (
              <p className="mt-5 pt-3 border-t-2 border-ink label">No servers yet</p>
            )}

            {!!suggestions.length && (
              <div className="mt-5">
                <p className="label">Work from the browser · one click</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {suggestions.map(s => (
                    <button
                      key={s.id} type="button" onClick={() => add({ ...s, token: '', tools: [] })}
                      className="flex items-center gap-1.5 border-[1.5px] border-ink px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] hover:bg-ink hover:text-paper duration-200 ease-snap"
                    >
                      <Plus className="w-3.5 h-3.5" /> {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={submit} className="mt-5 flex flex-col gap-2">
              <p className="label">Add by address</p>
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/mcp" className={cn(field, 'font-mono text-xs')} aria-label="Server address" />
              <div className="flex gap-2">
                <input
                  type="password" value={token} onChange={e => setToken(e.target.value)} autoComplete="off"
                  placeholder="Token, if it needs one" aria-label="Token" className={cn(field, 'flex-1 min-w-0 font-mono text-xs')}
                />
                <button type="submit" disabled={!url.trim()} className="btn-ink shrink-0 px-5 text-[11px] font-semibold uppercase tracking-[0.12em]">
                  Add
                </button>
              </div>
              {error && <p className="text-xs text-signal-ink">{error}</p>}
              <p className="text-xs leading-relaxed text-neutral-500">
                The server has to accept connections from websites (CORS). Tokens stay in this browser. Servers that run on your computer need a{' '}
                <a href={BRIDGE_GUIDE} target="_blank" rel="noreferrer" className="underline decoration-signal underline-offset-2 hover:text-neutral-100">local bridge</a>.
              </p>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
