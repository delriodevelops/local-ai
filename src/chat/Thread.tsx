import { useEffect, useRef, useState } from 'react'
import { AudioLines, Check, ChevronDown, Clapperboard, Copy, Eye, GitBranch, ImagePlus, LoaderCircle, Merge, Mic, Split, Wrench } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Markdown } from './Markdown'
import { useSession } from './session'
import Welcome from './Welcome'
import MediaView from './MediaView'
import type { StepResult, Turn, Value } from '@/flow/types'

const asText = (value?: Value) =>
  !value ? '' : value.type === 'text' ? value.text : value.type === 'list' ? value.items.map((t, i) => `**${i + 1}.** ${t}`).join('\n\n') : ''
const isMedia = (value?: Value) => !!value && ['image', 'audio', 'video'].includes(value.type)

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      title="Copy"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1200) }}
      className="p-1.5 text-neutral-500 hover:bg-ink hover:text-paper duration-200"
    >
      {copied ? <Check className="w-4 h-4 text-signal-ink" /> : <Copy className="w-4 h-4" />}
    </button>
  )
}

const KIND_ICON = { join: Merge, split: Split, condition: GitBranch, describe: Eye, imagine: ImagePlus, transcribe: Mic, speak: AudioLines, video: Clapperboard, tool: Wrench } as const

// La marca de cada paso según cómo va: tinta si terminó, rojo mientras trabaja, hueca si aún espera
const MARKER: Record<StepResult['state'], string> = {
  idle: 'border-[1.5px] border-ink text-neutral-50',
  waiting: 'border-[1.5px] border-ink text-neutral-50',
  running: 'bg-signal text-[#111111]',
  done: 'bg-ink text-paper',
  skipped: 'border border-line text-neutral-500',
  error: 'border-[1.5px] border-signal text-signal-ink',
}

function StepRow({ step, index, last }: { step: StepResult; index: number; last: boolean }) {
  const [open, setOpen] = useState(false)
  const text = asText(step.value)
  const Icon = step.kind in KIND_ICON ? KIND_ICON[step.kind as keyof typeof KIND_ICON] : null
  return (
    <li className={cn('relative pl-9', step.state === 'skipped' && 'opacity-40')}>
      {/* El cable que une los pasos */}
      {!last && <span className="absolute left-[11px] top-7 bottom-1 w-px bg-line" />}
      <span className={cn('absolute left-0 top-0 w-6 h-6 flex items-center justify-center font-mono text-[10px] duration-300', MARKER[step.state])}>
        {Icon ? <Icon className="w-3 h-3" /> : String(index + 1).padStart(2, '0')}
      </span>
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full min-h-6 flex items-center gap-2 text-left pb-2" disabled={!text && !isMedia(step.value)}>
        {/* El color del asistente, como la muestra de su nodo en el lienzo */}
        {step.color && <span className="w-2 h-2 shrink-0" style={{ background: step.color }} aria-hidden="true" />}
        <span className="label text-neutral-200">{step.label}</span>
        {step.state === 'running' && <LoaderCircle className="w-3.5 h-3.5 text-signal-ink animate-spin" />}
        {step.progress && step.state === 'running' && <span className="font-mono text-[10px] text-neutral-500">{step.progress.index + 1}/{step.progress.total}</span>}
        {step.branch && <span className="font-mono text-[10px] text-signal-ink">→ {step.branch}</span>}
        {step.ms !== undefined && <span className="font-mono text-[10px] text-neutral-500">{(step.ms / 1000).toFixed(1)}s</span>}
        {step.state === 'skipped' && <span className="font-mono text-[10px] text-neutral-500">skipped</span>}
        {step.state === 'running' && step.status && <span className="font-mono text-[10px] text-signal-ink truncate">{step.status}</span>}
        {/* En cola detrás de otro paso que usa el mismo modelo, o esperando su descarga */}
        {step.state === 'waiting' && step.status && <span className="font-mono text-[10px] text-neutral-500 truncate">{step.status}</span>}
        {step.error && <span className="text-xs text-signal-ink truncate">{step.error}</span>}
        {text && <ChevronDown className={cn('w-3.5 h-3.5 ml-auto text-neutral-500 duration-200', open && 'rotate-180')} />}
      </button>
      {/* Las herramientas que llamó un agente, con sus argumentos */}
      {!!step.calls?.length && (
        <ul className="pb-2 flex flex-col gap-1">
          {step.calls.map((call, i) => (
            <li key={i} className="font-mono text-[10.5px] text-neutral-500 truncate" title={call.error ?? call.result}>
              <span className="text-signal-ink">→</span> {call.tool} <span className="text-neutral-600">{call.args}</span>
              {call.error && <span className="text-signal-ink"> · {call.error}</span>}
            </li>
          ))}
        </ul>
      )}
      {isMedia(step.value) && <div className="pb-4"><MediaView value={step.value!} compact={!open} /></div>}
      {text && (
        <div className={cn('pb-4 text-sm', !open && step.state !== 'running' && 'line-clamp-2 text-neutral-400')}>
          {open || step.state === 'running' ? <Markdown text={text} /> : text.replace(/[#*_`>]/g, '')}
        </div>
      )}
    </li>
  )
}

function TurnView({ turn, index }: { turn: Turn; index: number }) {
  const running = turn.status === 'running'
  const [showTrace, setShowTrace] = useState(false)
  const trace = turn.steps.filter(s => s.kind !== 'output')
  const answers = turn.steps.filter(s => s.kind === 'output' && s.state === 'done' && s.value)
  const doneCount = trace.filter(s => s.state === 'done').length

  // Cada turno es una escena, como las de la landing: su número en rojo y tu mensaje como titular, sin burbuja
  return (
    <article className="flex flex-col gap-6 border-t-2 border-ink pt-4 animate-rise">
      <header className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4">
        <span className="numeral text-[44px] text-signal" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
        <div className="min-w-0">
          <span className="label">Message</span>
          {turn.attachments?.image && <img src={turn.attachments.image} alt="" className="mt-2 max-h-48 border border-line" />}
          {turn.attachments?.audio && <audio controls src={turn.attachments.audio} className="mt-2 w-64 max-w-full" />}
          <p className="mt-1 whitespace-pre-wrap break-words text-[19px] font-semibold leading-snug tracking-[-0.01em] text-neutral-50">{turn.input}</p>
        </div>
      </header>

      {!!trace.length && (
        <div>
          <button type="button" onClick={() => setShowTrace(s => !s)} className="flex items-center gap-2 mb-3 group">
            {running && <span className="w-2 h-2 rounded-full bg-signal animate-live" aria-hidden="true" />}
            <span className="label group-hover:text-neutral-50 duration-200">{running ? 'Running flow' : 'Flow'} · {doneCount}/{trace.length} steps</span>
            <ChevronDown className={cn('w-3.5 h-3.5 text-neutral-500 duration-200', (showTrace || running) && 'rotate-180')} />
          </button>
          {(showTrace || running) && (
            <ol className="flex flex-col">
              {trace.map((step, i) => <StepRow key={step.nodeId} step={step} index={i} last={i === trace.length - 1} />)}
            </ol>
          )}
        </div>
      )}

      {answers.map(answer => (
        <div key={answer.nodeId} className="border-l-2 border-signal pl-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="label text-signal-ink">{answer.label}</span>
            {!isMedia(answer.value) && <CopyButton text={asText(answer.value)} />}
          </div>
          {isMedia(answer.value) ? <MediaView value={answer.value!} /> : <Markdown text={asText(answer.value)} />}
        </div>
      ))}

      {turn.status === 'stopped' && <p className="label">Stopped</p>}
      {!running && turn.status !== 'stopped' && !answers.length && (
        <p className="text-sm text-neutral-400">No step reached the Answer node. Check the connections in the flow.</p>
      )}
    </article>
  )
}

export default function Thread() {
  const turns = useSession(s => s.turns)
  const error = useSession(s => s.error)
  const box = useRef<HTMLDivElement>(null)
  const lastSteps = turns.at(-1)?.steps

  // Baja el propio hilo hasta el final; scrollIntoView movería también la landing cuando la app va incrustada
  useEffect(() => {
    const el = box.current
    if (el && turns.length) el.scrollTop = el.scrollHeight
  }, [turns.length, lastSteps])

  return (
    <div ref={box} className="@container flex-1 min-h-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 flex flex-col gap-10">
        {!turns.length && <Welcome />}
        {turns.map((turn, i) => <TurnView key={turn.id} turn={turn} index={i} />)}
        {error && <p className="border-l-2 border-signal pl-4 py-1 text-sm text-signal-ink">{error}</p>}
      </div>
    </div>
  )
}
