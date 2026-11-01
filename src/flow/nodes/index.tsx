import { memo, type ReactNode } from 'react'
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { AudioLines, Check, Clapperboard, Eye, GitBranch, ImagePlus, LogIn, LogOut, Merge, Mic, Split, Sparkles, X, LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useApp } from '../store'
import { outputType, PORT_COLOR, portText } from '../graph'
import { COLORS } from '../presets'
import { useSession } from '@/chat/session'
import { VOICES } from '@/media/media'
import MediaView from '@/chat/MediaView'
import type {
  AssistantNode, ConditionNode, DescribeNode, ImagineNode, InputNode, JoinNode, OutputNode, PortType,
  SpeakNode, SplitNode, StepResult, TranscribeNode, VideoNode,
} from '../types'

// Estado del nodo en la última ejecución
function useStep(id: string): StepResult | undefined {
  return useSession(s => s.turns.at(-1)?.steps.find(step => step.nodeId === id))
}

function useOutType(id: string) {
  return useApp(s => outputType(id, s.nodes, s.edges))
}

function Port({ type, kind, id, top, label }: { type: 'source' | 'target'; kind: PortType | 'any'; id: string; top?: string; label?: string }) {
  const color = kind === 'any' ? '#8a8a83' : PORT_COLOR[kind]
  return (
    <Handle
      type={type}
      id={id}
      position={type === 'target' ? Position.Left : Position.Right}
      style={{ top, background: 'var(--color-neutral-950)', borderColor: color }}
      className="!w-3 !h-3 !border-2"
    >
      {label && (
        <span className={cn('pointer-events-none absolute top-1/2 -translate-y-1/2 font-mono text-[9px] uppercase tracking-widest', type === 'source' ? 'left-4' : 'right-4')} style={{ color: portText(color) }}>
          {label}
        </span>
      )}
    </Handle>
  )
}

const STATE_RING: Record<string, string> = {
  running: 'border-signal shadow-[0_0_32px_-6px_rgba(255,58,31,0.35)]',
  done: 'border-ink',
  skipped: 'border-neutral-800 opacity-50',
  error: 'border-red-600',
}

function Shell({ id, kind, icon, color, selected, step, children, width = 'w-64', local = true }: {
  id: string; kind: string; icon: ReactNode; color?: string; selected?: boolean; step?: StepResult; children: ReactNode; width?: string; local?: boolean
}) {
  const { deleteElements } = useReactFlow()
  return (
    <div className={cn(
      'group border-[1.5px] bg-neutral-900 text-neutral-100 duration-300 ease-snap',
      width,
      step ? STATE_RING[step.state] ?? 'border-ink' : 'border-ink',
      selected && 'ring-1 ring-signal',
    )}>
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-2 border-b border-neutral-800">
        <span className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: color ?? 'var(--color-ink)', color: color ? '#111111' : 'var(--color-paper)' }}>
          {icon}
        </span>
        <span className="label flex-1">{kind}</span>
        {!local && <span className="font-mono text-[9px] uppercase tracking-widest text-amber-800" title="Sends data to an online service">online</span>}
        {step?.state === 'running' && <LoaderCircle className="w-3.5 h-3.5 text-signal-ink animate-spin" />}
        {step?.state === 'done' && <Check className="w-3.5 h-3.5 text-signal-ink" />}
        {step?.progress && step.state === 'running' && (
          <span className="font-mono text-[10px] text-neutral-400">{step.progress.index + 1}/{step.progress.total}</span>
        )}
        <button
          type="button"
          onClick={() => deleteElements({ nodes: [{ id }] })}
          className="nodrag opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-600 duration-200"
          title="Remove node"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="p-3 flex flex-col gap-2">
        {children}
        {step?.state === 'running' && step.status && <p className="font-mono text-[10px] text-signal-ink truncate">{step.status}</p>}
        {step?.state === 'waiting' && step.status && <p className="font-mono text-[10px] text-neutral-500 truncate">{step.status}</p>}
        {step?.state === 'error' && <p className="text-[11px] text-red-700 line-clamp-3">{step.error}</p>}
      </div>
    </div>
  )
}

function Title({ id, value }: { id: string; value: string }) {
  const updateNode = useApp(s => s.updateNode)
  return (
    <input
      value={value}
      onChange={e => updateNode(id, { label: e.target.value })}
      className="nodrag bg-transparent text-[15px] font-medium border-b border-transparent focus:border-signal outline-none w-full"
      aria-label="Node name"
    />
  )
}

function Field({ id, label, value, field, multiline = false, mono = false }: { id: string; label: string; value: string; field: string; multiline?: boolean; mono?: boolean }) {
  const updateNode = useApp(s => s.updateNode)
  const className = cn('nodrag nowheel rounded-md bg-neutral-950 border border-neutral-800 focus:border-signal px-2 py-1.5 text-xs text-neutral-200 outline-none', mono && 'font-mono')
  return (
    <label className="flex flex-col gap-1 text-xs text-neutral-400">
      {label}
      {multiline
        ? <textarea rows={2} value={value} onChange={e => updateNode(id, { [field]: e.target.value })} className={cn(className, 'resize-none leading-relaxed')} />
        : <input value={value} onChange={e => updateNode(id, { [field]: e.target.value })} className={className} />}
    </label>
  )
}

function Preview({ step }: { step?: StepResult }) {
  if (!step?.value || step.state === 'skipped') return null
  const value = step.value
  if (value.type === 'image' || value.type === 'audio' || value.type === 'video') return <MediaView value={value} compact />
  const text = value.type === 'text' ? value.text : value.items.map((t, i) => `${i + 1}. ${t}`).join('\n')
  return (
    <p className="line-clamp-3 whitespace-pre-wrap rounded-md bg-neutral-950 border border-neutral-800 px-2 py-1.5 text-[11.5px] leading-relaxed text-neutral-300">
      {text || '…'}
    </p>
  )
}

const TypeTag = ({ type }: { type: PortType }) => (
  <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: portText(PORT_COLOR[type]) }}>→ {type}</span>
)

export const InputNodeView = memo(({ id, data, selected }: NodeProps<InputNode>) => (
  <Shell id={id} kind="Message" icon={<LogIn className="w-3 h-3" />} selected={selected} width="w-56">
    <Title id={id} value={data.label} />
    <p className="text-xs text-neutral-400 pr-10">What you type, the photo you attach and your voice note start here.</p>
    <Port type="source" id="out" kind="text" top="38%" label="text" />
    <Port type="source" id="image" kind="image" top="58%" label="image" />
    <Port type="source" id="audio" kind="audio" top="78%" label="audio" />
  </Shell>
))

export const AssistantNodeView = memo(({ id, data, selected }: NodeProps<AssistantNode>) => {
  const updateNode = useApp(s => s.updateNode)
  const step = useStep(id)
  const out = useOutType(id)
  const nextColor = COLORS[(COLORS.indexOf(data.color) + 1) % COLORS.length]
  return (
    <Shell id={id} kind="Assistant" icon={<Sparkles className="w-3 h-3" />} color={data.color} selected={selected} step={step} width="w-72">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => updateNode(id, { color: nextColor })}
          className="nodrag w-3 h-3 rounded-full shrink-0 ring-2 ring-neutral-900 hover:scale-125 duration-200"
          style={{ background: data.color }}
          title="Change colour"
        />
        <Title id={id} value={data.label} />
      </div>
      <textarea
        value={data.instructions}
        onChange={e => updateNode(id, { instructions: e.target.value })}
        rows={3}
        placeholder="What should this assistant do?"
        className="nodrag nowheel resize-none rounded-md bg-neutral-950 border border-neutral-800 focus:border-signal px-2 py-1.5 text-xs leading-relaxed text-neutral-300 outline-none"
      />
      {out === 'list' && <p className="text-[11px] text-blue-700">Gets a list: answers each item separately.</p>}
      <Preview step={step} />
      <TypeTag type={out} />
      <Port type="target" id="in" kind="any" />
      <Port type="source" id="out" kind={out} />
    </Shell>
  )
})

export const JoinNodeView = memo(({ id, data, selected }: NodeProps<JoinNode>) => {
  const step = useStep(id)
  return (
    <Shell id={id} kind="Join" icon={<Merge className="w-3 h-3" />} selected={selected} step={step} width="w-52">
      <Title id={id} value={data.label} />
      <p className="text-xs text-neutral-400">Combines every input, and every item of a list, into one text.</p>
      <TypeTag type="text" />
      <Port type="target" id="in" kind="any" />
      <Port type="source" id="out" kind="text" />
    </Shell>
  )
})

export const SplitNodeView = memo(({ id, data, selected }: NodeProps<SplitNode>) => {
  const updateNode = useApp(s => s.updateNode)
  const step = useStep(id)
  return (
    <Shell id={id} kind="Split" icon={<Split className="w-3 h-3" />} selected={selected} step={step} width="w-56">
      <Title id={id} value={data.label} />
      <p className="text-xs text-neutral-400">Turns a text into a list, one item per line.</p>
      <label className="flex items-center justify-between text-xs text-neutral-400">
        Up to
        <input
          type="number" min={1} max={20} value={data.max}
          onChange={e => updateNode(id, { max: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
          className="nodrag w-14 rounded-md bg-neutral-950 border border-neutral-800 px-2 py-1 text-right font-mono text-neutral-100 outline-none"
        />
      </label>
      <Preview step={step} />
      <TypeTag type="list" />
      <Port type="target" id="in" kind="text" />
      <Port type="source" id="out" kind="list" />
    </Shell>
  )
})

export const ConditionNodeView = memo(({ id, data, selected }: NodeProps<ConditionNode>) => {
  const step = useStep(id)
  return (
    <Shell id={id} kind="Condition" icon={<GitBranch className="w-3 h-3" />} selected={selected} step={step} width="w-60">
      <Title id={id} value={data.label} />
      <Field id={id} label="If the text contains" value={data.match} field="match" mono />
      {step?.branch && (
        <p className="font-mono text-[10px] uppercase tracking-widest text-signal-ink">Went → {step.branch}</p>
      )}
      <Port type="target" id="in" kind="text" />
      <Port type="source" id="yes" kind="text" top="40%" label="yes" />
      <Port type="source" id="no" kind="text" top="75%" label="no" />
    </Shell>
  )
})

export const DescribeNodeView = memo(({ id, data, selected }: NodeProps<DescribeNode>) => {
  const step = useStep(id)
  return (
    <Shell id={id} kind="See image" icon={<Eye className="w-3 h-3" />} color={PORT_COLOR.image} selected={selected} step={step} width="w-64">
      <Title id={id} value={data.label} />
      <Field id={id} label="What to look for" value={data.prompt} field="prompt" multiline />
      <Preview step={step} />
      <TypeTag type="text" />
      <Port type="target" id="in" kind="image" />
      <Port type="source" id="out" kind="text" />
    </Shell>
  )
})

export const ImagineNodeView = memo(({ id, data, selected }: NodeProps<ImagineNode>) => {
  const step = useStep(id)
  return (
    <Shell id={id} kind="Create image" icon={<ImagePlus className="w-3 h-3" />} color={PORT_COLOR.image} selected={selected} step={step} width="w-64">
      <Title id={id} value={data.label} />
      <Field id={id} label="Style added to the prompt" value={data.style} field="style" />
      <Preview step={step} />
      <TypeTag type="image" />
      <Port type="target" id="in" kind="text" />
      <Port type="source" id="out" kind="image" />
    </Shell>
  )
})

export const TranscribeNodeView = memo(({ id, data, selected }: NodeProps<TranscribeNode>) => {
  const step = useStep(id)
  return (
    <Shell id={id} kind="Transcribe" icon={<Mic className="w-3 h-3" />} color={PORT_COLOR.audio} selected={selected} step={step} width="w-60">
      <Title id={id} value={data.label} />
      <p className="text-xs text-neutral-400">Turns speech into text with Whisper.</p>
      <Preview step={step} />
      <TypeTag type="text" />
      <Port type="target" id="in" kind="audio" />
      <Port type="source" id="out" kind="text" />
    </Shell>
  )
})

export const SpeakNodeView = memo(({ id, data, selected }: NodeProps<SpeakNode>) => {
  const updateNode = useApp(s => s.updateNode)
  const step = useStep(id)
  return (
    <Shell id={id} kind="Speak" icon={<AudioLines className="w-3 h-3" />} color={PORT_COLOR.audio} selected={selected} step={step} width="w-60">
      <Title id={id} value={data.label} />
      <label className="flex flex-col gap-1 text-xs text-neutral-400">
        Voice
        <select
          value={data.voice}
          onChange={e => updateNode(id, { voice: e.target.value })}
          className="nodrag rounded-md bg-neutral-950 border border-neutral-800 px-2 py-1.5 text-xs text-neutral-200 outline-none"
        >
          {VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
        </select>
      </label>
      <Preview step={step} />
      <TypeTag type="audio" />
      <Port type="target" id="in" kind="text" />
      <Port type="source" id="out" kind="audio" />
    </Shell>
  )
})

export const VideoNodeView = memo(({ id, data, selected }: NodeProps<VideoNode>) => {
  const step = useStep(id)
  return (
    <Shell id={id} kind="Create video" icon={<Clapperboard className="w-3 h-3" />} color={PORT_COLOR.video} selected={selected} step={step} width="w-64" local={false}>
      <Title id={id} value={data.label} />
      <Field id={id} label="fal.ai model" value={data.model} field="model" mono />
      <p className="text-[11px] text-amber-800">Video models don't fit in a browser: this one runs on fal.ai with your key.</p>
      <Preview step={step} />
      <TypeTag type="video" />
      <Port type="target" id="in" kind="text" />
      <Port type="source" id="out" kind="video" />
    </Shell>
  )
})

export const OutputNodeView = memo(({ id, data, selected }: NodeProps<OutputNode>) => {
  const step = useStep(id)
  return (
    <Shell id={id} kind="Answer" icon={<LogOut className="w-3 h-3" />} color="#ff3a1f" selected={selected} step={step} width="w-56">
      <Title id={id} value={data.label} />
      <p className="text-xs text-neutral-400">What reaches here is shown as the answer.</p>
      <Port type="target" id="in" kind="any" />
    </Shell>
  )
})

export const nodeTypes = {
  input: InputNodeView,
  assistant: AssistantNodeView,
  join: JoinNodeView,
  split: SplitNodeView,
  condition: ConditionNodeView,
  output: OutputNodeView,
  describe: DescribeNodeView,
  imagine: ImagineNodeView,
  transcribe: TranscribeNodeView,
  speak: SpeakNodeView,
  video: VideoNodeView,
}
