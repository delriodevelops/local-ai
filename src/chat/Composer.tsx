import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowUp, ImagePlus, Mic, Square, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useMedia } from '@/lib/useMedia'
import { useEngine } from '@/engine/engine'
import { useApp } from '@/flow/store'
import { usesLLM } from '@/flow/graph'
import { blobToDataUrl, shrinkImage } from '@/media/media'
import type { Attachments } from '@/flow/types'
import { useSession } from './session'

// Graba una nota de voz con el micrófono
function useRecorder(onDone: (url: string) => void) {
  const [recording, setRecording] = useState(false)
  const recorder = useRef<MediaRecorder | null>(null)

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const chunks: Blob[] = []
    const media = new MediaRecorder(stream)
    media.ondataavailable = e => chunks.push(e.data)
    media.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      onDone(await blobToDataUrl(new Blob(chunks, { type: media.mimeType })))
    }
    media.start()
    recorder.current = media
    setRecording(true)
  }
  const stop = () => {
    recorder.current?.stop()
    setRecording(false)
  }
  return { recording, start, stop }
}

// Alto según el texto, hasta 224 px; la barra de scroll solo aparece cuando ya no cabe
function fit(el: HTMLTextAreaElement) {
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 224)}px`
  el.style.overflowY = el.scrollHeight > el.clientHeight ? 'auto' : 'hidden'
}

export default function Composer() {
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<Attachments>({})
  const [micError, setMicError] = useState<string | null>(null)
  const area = useRef<HTMLTextAreaElement>(null)
  const file = useRef<HTMLInputElement>(null)
  const ready = useEngine(s => s.status === 'ready')
  const { running, send, stop } = useSession()
  const nodes = useApp(s => s.nodes)
  const needsModel = usesLLM(nodes)
  const assistants = nodes.filter(n => n.type === 'assistant' || n.type === 'agent').length
  const takesImage = nodes.some(n => n.type === 'describe')
  const takesAudio = nodes.some(n => n.type === 'transcribe')
  const recorder = useRecorder(audio => setAttachments(a => ({ ...a, audio })))
  const narrow = useMedia('(max-width: 639px)')

  const canSend = (!needsModel || ready) && !running && (!!text.trim() || !!attachments.image || !!attachments.audio)

  // Si cambia el ancho (girar el móvil, abrir la barra lateral) el borrador ocupa otras líneas: se vuelve a ajustar
  useEffect(() => {
    const el = area.current
    if (!el) return
    let width = el.clientWidth
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width) return
      width = el.clientWidth
      fit(el)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    if (!canSend) return
    send(text.trim(), attachments)
    setText('')
    setAttachments({})
    if (area.current) {
      area.current.style.height = 'auto'
      area.current.style.overflowY = 'hidden'
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) submit(e)
  }

  const record = async () => {
    setMicError(null)
    if (recorder.recording) return recorder.stop()
    try { await recorder.start() } catch { setMicError('The microphone is blocked. Allow it in the browser to record.') }
  }

  // En el móvil, entre los botones solo cabe una línea corta
  const placeholder = needsModel && !ready
    ? 'Pick a model to start'
    : takesAudio && !assistants ? (narrow ? 'Voice note or text' : 'Record a voice note or type')
    : narrow ? 'Message the flow'
    : `Message the flow · ${assistants} assistant${assistants === 1 ? '' : 's'}`

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-3xl px-4 pb-3">
      <div className="border-[1.5px] border-ink focus-within:border-signal bg-neutral-900 p-2 duration-300 ease-snap shadow-[0_-24px_48px_-24px_rgba(17,17,17,0.12)]">
        {(attachments.image || attachments.audio) && (
          <div className="flex flex-wrap items-center gap-2 px-1 pb-2">
            {attachments.image && (
              <span className="relative">
                <img src={attachments.image} alt="" className="h-16 rounded-lg border border-neutral-700" />
                <button type="button" title="Remove image" onClick={() => setAttachments(a => ({ ...a, image: undefined }))} className="absolute -right-1.5 -top-1.5 rounded-full bg-neutral-700 p-0.5 hover:bg-red-400 hover:text-neutral-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {attachments.audio && (
              <span className="flex items-center gap-1">
                <audio controls src={attachments.audio} className="h-9 w-60" />
                <button type="button" title="Remove voice note" onClick={() => setAttachments(a => ({ ...a, audio: undefined }))} className="rounded-full p-1 text-neutral-400 hover:text-red-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}
          </div>
        )}
        <div className="flex items-end gap-1">
          <input
            ref={file} type="file" accept="image/*" hidden
            onChange={async e => {
              const picked = e.target.files?.[0]
              if (picked) {
                const image = await shrinkImage(picked)
                setAttachments(a => ({ ...a, image }))
              }
              e.target.value = ''
            }}
          />
          <button
            type="button" onClick={() => file.current?.click()} title={takesImage ? 'Attach a photo' : 'Attach a photo (add a See image node to use it)'}
            className={cn('w-10 h-10 shrink-0 rounded-xl flex items-center justify-center hover:bg-neutral-800 duration-200', takesImage ? 'text-neutral-200' : 'text-neutral-500')}
          >
            <ImagePlus className="w-5 h-5" />
          </button>
          <button
            type="button" onClick={record} title={recorder.recording ? 'Stop recording' : 'Record a voice note'}
            className={cn('w-10 h-10 shrink-0 rounded-xl flex items-center justify-center duration-200', recorder.recording ? 'bg-red-400/20 text-red-700 animate-pulse' : takesAudio ? 'text-neutral-200 hover:bg-neutral-800' : 'text-neutral-500 hover:bg-neutral-800')}
          >
            {recorder.recording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-5 h-5" />}
          </button>
          <textarea
            ref={area}
            value={text}
            rows={1}
            onChange={e => {
              setText(e.target.value)
              fit(e.target)
            }}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="flex-1 min-w-0 resize-none overflow-y-hidden bg-transparent px-2 py-2 text-[15px] outline-none placeholder:text-neutral-500 max-h-56"
          />
          {running ? (
            <button type="button" onClick={stop} title="Stop" className="w-10 h-10 shrink-0 rounded-xl bg-ink text-paper flex items-center justify-center hover:bg-signal hover:text-ink duration-200">
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              type="submit" title="Send" disabled={!canSend}
              className="w-10 h-10 shrink-0 rounded-xl bg-ink text-paper flex items-center justify-center hover:bg-signal hover:text-ink hover:-translate-y-0.5 duration-200 ease-snap disabled:bg-neutral-700 disabled:text-neutral-500 disabled:translate-y-0"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-center font-mono text-[10px] tracking-wide text-neutral-500">{micError ?? 'Runs locally · answers may be inaccurate'}</p>
    </form>
  )
}
