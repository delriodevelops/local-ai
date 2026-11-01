import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowUp, Square } from 'lucide-react'
import { useEngine } from '@/engine/engine'
import { useApp } from '@/flow/store'
import { useSession } from './session'

export default function Composer() {
  const [text, setText] = useState('')
  const area = useRef<HTMLTextAreaElement>(null)
  const ready = useEngine(s => s.status === 'ready')
  const { running, send, stop } = useSession()
  const steps = useApp(s => s.nodes.filter(n => n.type === 'assistant').length)

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    if (!text.trim() || running || !ready) return
    send(text.trim())
    setText('')
    if (area.current) area.current.style.height = 'auto'
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) submit(e)
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-3xl px-4 pb-3">
      <div className="flex items-end gap-2 rounded-2xl border border-neutral-700 focus-within:border-lime-300/50 bg-neutral-900 p-2 duration-300 ease-snap shadow-[0_-24px_48px_-24px_rgba(0,0,0,0.6)]">
        <textarea
          ref={area}
          value={text}
          rows={1}
          onChange={e => {
            setText(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = `${Math.min(e.target.scrollHeight, 224)}px`
          }}
          onKeyDown={onKeyDown}
          placeholder={ready ? `Message the flow · ${steps} assistant${steps === 1 ? '' : 's'}` : 'Pick a model to start'}
          className="flex-1 resize-none bg-transparent px-2 py-2 text-[15px] outline-none placeholder:text-neutral-500 max-h-56"
        />
        {running ? (
          <button type="button" onClick={stop} title="Stop" className="w-10 h-10 shrink-0 rounded-xl bg-neutral-100 text-neutral-950 flex items-center justify-center hover:bg-white duration-200">
            <Square className="w-4 h-4 fill-current" />
          </button>
        ) : (
          <button
            type="submit" title="Send" disabled={!ready || !text.trim()}
            className="w-10 h-10 shrink-0 rounded-xl bg-signal text-neutral-950 flex items-center justify-center hover:bg-lime-200 hover:-translate-y-0.5 duration-200 ease-snap disabled:bg-neutral-700 disabled:text-neutral-500 disabled:translate-y-0"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        )}
      </div>
      <p className="mt-2 text-center font-mono text-[10px] tracking-wide text-neutral-500">Runs locally · answers may be inaccurate</p>
    </form>
  )
}
