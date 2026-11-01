import { useEffect, useRef, useState } from 'react'
import { AudioLines, Check, ChevronDown, Clapperboard, Copy, Eye, GitBranch, ImagePlus, LoaderCircle, Merge, Mic, Split } from 'lucide-react'
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
      className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-100 hover:bg-neutral-800 duration-200"
    >
      {copied ? <Check className="w-4 h-4 text-signal-ink" /> : <Copy className="w-4 h-4" />}
    </button>
  )
}

const KIND_ICON = { join: Merge, split: Split, condition: GitBranch, describe: Eye, imagine: ImagePlus, transcribe: Mic, speak: AudioLines, video: Clapperboard } as const

function StepRow({ step, index, last }: { step: StepResult; index: number; last: boolean }) {
  const [open, setOpen] = useState(false)
  const text = asText(step.value)
  const Icon = step.kind in KIND_ICON ? KIND_ICON[step.kind as keyof typeof KIND_ICON] : null
  return (
    <li className={cn('relative pl-8', step.state === 'skipped' && 'opacity-40')}>
      {/* El cable que une los pasos */}
      {!last && <span className="absolute left-[11px] top-6 bottom-0 w-px bg-neutral-800" />}
      <span
        className="absolute left-0 top-0.5 w-[23px] h-[23px] rounded-md flex items-center justify-center text-neutral-950 font-mono text-[10px]"
        style={{ background: step.color ?? '#111111', color: step.color ? '#111111' : '#f2f2ef' }}
      >
        {Icon ? <Icon className="w-3 h-3" /> : String(index + 1).padStart(2, '0')}
      </span>
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 text-left pb-2" disabled={!text && !isMedia(step.value)}>
        <span className="label text-neutral-300">{step.label}</span>
        {step.state === 'running' && <LoaderCircle className="w-3.5 h-3.5 text-signal-ink animate-spin" />}
        {step.progress && step.state === 'running' && <span className="font-mono text-[10px] text-neutral-500">{step.progress.index + 1}/{step.progress.total}</span>}
        {step.branch && <span className="font-mono text-[10px] text-signal-ink">→ {step.branch}</span>}
        {step.ms !== undefined && <span className="font-mono text-[10px] text-neutral-500">{(step.ms / 1000).toFixed(1)}s</span>}
        {step.state === 'skipped' && <span className="font-mono text-[10px] text-neutral-500">skipped</span>}
        {step.state === 'running' && step.status && <span className="font-mono text-[10px] text-signal-ink truncate">{step.status}</span>}
        {step.error && <span className="text-xs text-red-600 truncate">{step.error}</span>}
        {text && <ChevronDown className={cn('w-3.5 h-3.5 ml-auto text-neutral-500 duration-200', open && 'rotate-180')} />}
      </button>
      {isMedia(step.value) && <div className="pb-4"><MediaView value={step.value!} compact={!open} /></div>}
      {text && (
        <div className={cn('pb-4 text-sm', !open && step.state !== 'running' && 'line-clamp-2 text-neutral-400')}>
          {open || step.state === 'running' ? <Markdown text={text} /> : text.replace(/[#*_`>]/g, '')}
        </div>
      )}
    </li>
  )
}

function TurnView({ turn }: { turn: Turn }) {
  const running = turn.status === 'running'
  const [showTrace, setShowTrace] = useState(false)
  const trace = turn.steps.filter(s => s.kind !== 'output')
  const answers = turn.steps.filter(s => s.kind === 'output' && s.state === 'done' && s.value)
  const doneCount = trace.filter(s => s.state === 'done').length

  return (
    <div className="flex flex-col gap-5 animate-rise">
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-neutral-800 border border-neutral-700 rounded-2xl rounded-tr-md px-4 py-3 whitespace-pre-wrap break-words text-[15px] text-neutral-50">
          {turn.attachments?.image && <img src={turn.attachments.image} alt="" className="mb-2 max-h-48 rounded-lg" />}
          {turn.attachments?.audio && <audio controls src={turn.attachments.audio} className="mb-2 w-64 max-w-full" />}
          {turn.input}
        </div>
      </div>

      {!!trace.length && (
        <div>
          <button type="button" onClick={() => setShowTrace(s => !s)} className="flex items-center gap-2 mb-3 group">
            <span className="label">{running ? 'Running flow' : 'Flow'} · {doneCount}/{trace.length} steps</span>
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

      {turn.status === 'stopped' && <p className="font-mono text-xs text-neutral-500">Stopped.</p>}
      {!running && turn.status !== 'stopped' && !answers.length && (
        <p className="text-sm text-neutral-400">No step reached the Answer node. Check the connections in the flow.</p>
      )}
    </div>
  )
}

export default function Thread() {
  const turns = useSession(s => s.turns)
  const error = useSession(s => s.error)
  const end = useRef<HTMLDivElement>(null)
  const lastSteps = turns.at(-1)?.steps

  useEffect(() => {
    if (turns.length) end.current?.scrollIntoView({ block: 'end' })
  }, [turns.length, lastSteps])

  return (
    <div className="@container flex-1 min-h-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 flex flex-col gap-10">
        {!turns.length && <Welcome />}
        {turns.map(turn => <TurnView key={turn.id} turn={turn} />)}
        {error && <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div ref={end} />
      </div>
    </div>
  )
}
