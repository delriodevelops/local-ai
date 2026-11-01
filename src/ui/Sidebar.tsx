import { useLiveQuery } from 'dexie-react-hooks'
import { PanelLeftClose, SquarePen, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { db } from '@/db'
import { useSession } from '@/chat/session'

export default function Sidebar({ onClose }: { onClose: () => void }) {
  const conversations = useLiveQuery(() => db.conversations.orderBy('updatedAt').reverse().toArray(), [])
  const { conversationId, open, reset } = useSession()

  const remove = async (id: string) => {
    await db.conversations.delete(id)
    if (id === conversationId) reset()
  }

  return (
    <aside className="flex flex-col h-full w-72 bg-neutral-900 border-r border-neutral-800 px-3 pt-3 pb-2">
      <header className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800">
        <a href={import.meta.env.BASE_URL} title="About MeshMind" className="flex items-center gap-2 pl-1 text-neutral-50 hover:text-signal duration-200">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={22} height={22} className="rounded-md" />
          <span className="font-display text-2xl leading-none tracking-tight">MeshMind</span>
        </a>
        <div className="flex items-center gap-1">
          <button type="button" onClick={reset} title="New chat" className="p-2 rounded-lg text-neutral-300 hover:bg-neutral-800 duration-200"><SquarePen className="w-4 h-4" /></button>
          <button type="button" onClick={onClose} title="Close sidebar" className="p-2 rounded-lg text-neutral-300 hover:bg-neutral-800 duration-200"><PanelLeftClose className="w-4 h-4" /></button>
        </div>
      </header>
      <h2 className="label px-2 pb-2">History</h2>
      <nav className="flex-1 overflow-y-auto flex flex-col">
        {conversations?.length ? conversations.map(c => (
          <div
            key={c.id}
            className={cn(
              'group relative rounded-md border-l duration-200 ease-snap',
              c.id === conversationId ? 'border-signal bg-neutral-800 text-neutral-50' : 'border-transparent text-neutral-300 hover:bg-neutral-800 hover:text-neutral-50',
            )}
          >
            <button type="button" onClick={() => open(c.id)} className="w-full text-left truncate pl-3 pr-9 py-2 text-sm">{c.title}</button>
            <button
              type="button" onClick={() => remove(c.id)} title="Delete chat"
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100 duration-200"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )) : <p className="px-2 text-sm text-neutral-500">Your chats will appear here.</p>}
      </nav>
      <p className="px-2 pt-2 font-mono text-[10px] text-neutral-600">Everything stays in this browser.</p>
    </aside>
  )
}
