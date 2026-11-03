import { useLiveQuery } from 'dexie-react-hooks'
import { PanelLeftClose, SquarePen, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { db } from '@/db'
import { useSession } from '@/chat/session'
import Brand from './Brand'

export default function Sidebar({ onClose }: { onClose: () => void }) {
  const conversations = useLiveQuery(() => db.conversations.orderBy('updatedAt').reverse().toArray(), [])
  const { conversationId, open, reset } = useSession()

  const remove = async (id: string) => {
    await db.conversations.delete(id)
    if (id === conversationId) reset()
  }

  return (
    <aside className="flex flex-col h-full w-72 bg-paper border-r border-rule">
      <header className="flex items-center justify-between gap-3 h-16 shrink-0 px-4 border-b-2 border-ink">
        <Brand />
        <div className="flex items-center gap-1">
          <button type="button" onClick={reset} title="New chat" className="w-9 h-9 flex items-center justify-center text-neutral-300 hover:bg-ink hover:text-paper duration-200"><SquarePen className="w-4 h-4" /></button>
          <button type="button" onClick={onClose} title="Close sidebar" className="w-9 h-9 flex items-center justify-center text-neutral-300 hover:bg-ink hover:text-paper duration-200"><PanelLeftClose className="w-4 h-4" /></button>
        </div>
      </header>
      <div className="flex items-baseline justify-between px-4 pt-6 pb-2">
        <h2 className="label">History</h2>
        {!!conversations?.length && <span className="font-mono text-[11px] text-neutral-500 tabular-nums">{String(conversations.length).padStart(2, '0')}</span>}
      </div>
      <nav className="flex-1 overflow-y-auto flex flex-col px-4">
        {conversations?.length ? conversations.map(c => (
          <div
            key={c.id}
            className={cn(
              'group relative border-b border-line duration-200 ease-snap',
              c.id === conversationId ? 'text-neutral-50' : 'text-neutral-300 hover:text-signal-ink',
            )}
          >
            {/* El chat abierto lleva el cuadrado rojo de la señal */}
            {c.id === conversationId && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-signal" aria-hidden="true" />}
            <button
              type="button" onClick={() => open(c.id)} aria-current={c.id === conversationId || undefined}
              className={cn('w-full text-left truncate pr-8 py-2.5 text-sm duration-300 ease-snap', c.id === conversationId ? 'pl-4 font-semibold' : 'group-hover:pl-1.5')}
            >
              {c.title}
            </button>
            <button
              type="button" onClick={() => remove(c.id)} title="Delete chat"
              className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 text-neutral-500 hover:text-signal-ink opacity-0 group-hover:opacity-100 focus:opacity-100 pointer-coarse:opacity-100 duration-200"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )) : <p className="py-2 text-sm text-neutral-500">Your chats will appear here.</p>}
      </nav>
      <p className="label px-4 py-4 border-t border-line text-[10px] text-neutral-500">Everything stays in this browser</p>
    </aside>
  )
}
