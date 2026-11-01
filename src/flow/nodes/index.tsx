import { memo, type ReactNode } from 'react'
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { Check, GitBranch, LogIn, LogOut, Merge, Split, Sparkles, X, LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useApp } from '../store'
import { outputType } from '../graph'
import { COLORS } from '../presets'
import { useSession } from '@/chat/session'
import type { AssistantNode, ConditionNode, InputNode, JoinNode, OutputNode, PortType, SplitNode, StepResult } from '../types'

const PORT_COLOR: Record<PortType, string> = { text: '#c8f560', list: '#60a5fa' }

// Estado del nodo en la última ejecución
function useStep(id: string): StepResult | undefined {
  return useSession(s => s.turns.at(-1)?.steps.find(step => step.nodeId === id))
}

function useOutType(id: string) {
  return useApp(s => outputType(id, s.nodes, s.edges))
}

function Port({ type, kind, id, top, label }: { type: 'source' | 'target'; kind: PortType | 'any'; id: string; top?: string; label?: string }) {
  const color = kind === 'any' ? '#a9ad9a' : PORT_COLOR[kind]
  return (
    <Handle
      type={type}
      id={id}
      position={type === 'target' ? Position.Left : Position.Right}
      style={{ top, background: '#0b0c09', borderColor: color }}
      className="!w-3 !h-3 !border-2"
    >
      {label && (
        <span className={cn('pointer-events-none absolute top-1/2 -translate-y-1/2 font-mono text-[9px] uppercase tracking-widest', type === 'source' ? 'left-4' : 'right-4')} style={{ color }}>
          {label}
        </span>
      )}
    </Handle>
  )
}

const STATE_RING: Record<string, string> = {
  running: 'border-lime-300/80 shadow-[0_0_32px_-6px_rgba(200,245,96,0.45)]',
  done: 'border-neutral-600',
  skipped: 'border-neutral-800 opacity-50',
  error: 'border-red-400/70',
}

function Shell({ id, kind, icon, color, selected, step, children, width = 'w-64' }: {
  id: string; kind: string; icon: ReactNode; color?: string; selected?: boolean; step?: StepResult; children: ReactNode; width?: string
}) {
  const { deleteElements } = useReactFlow()
  return (
    <div className={cn(
      'group rounded-xl border bg-neutral-900/95 backdrop-blur text-neutral-100 duration-300 ease-snap',
      width,
      step ? STATE_RING[step.state] ?? 'border-neutral-700' : 'border-neutral-700',
      selected && 'ring-1 ring-lime-300/60',
    )}>
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-2 border-b border-neutral-800">
        <span className="w-5 h-5 rounded-md flex items-center justify-center text-neutral-950" style={{ background: color ?? '#3a3d33', color: color ? '#0b0c09' : '#cdd0c0' }}>
          {icon}
        </span>
        <span className="label flex-1">{kind}</span>
        {step?.state === 'running' && <LoaderCircle className="w-3.5 h-3.5 text-lime-300 animate-spin" />}
        {step?.state === 'done' && <Check className="w-3.5 h-3.5 text-lime-300" />}
        {step?.progress && step.state === 'running' && (
          <span className="font-mono text-[10px] text-neutral-400">{step.progress.index + 1}/{step.progress.total}</span>
        )}
        <button
          type="button"
          onClick={() => deleteElements({ nodes: [{ id }] })}
          className="nodrag opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 duration-200"
          title="Remove node"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="p-3 flex flex-col gap-2">{children}</div>
    </div>
  )
}

function Title({ id, value }: { id: string; value: string }) {
  const updateNode = useApp(s => s.updateNode)
  return (
    <input
      value={value}
      onChange={e => updateNode(id, { label: e.target.value })}
      className="nodrag bg-transparent text-[15px] font-medium outline-none focus:text-white w-full"
      aria-label="Node name"
    />
  )
}

function Preview({ step }: { step?: StepResult }) {
  if (!step?.value || step.state === 'skipped') return null
  const text = step.value.type === 'text' ? step.value.text : step.value.items.map((t, i) => `${i + 1}. ${t}`).join('\n')
  return (
    <p className="line-clamp-3 whitespace-pre-wrap rounded-md bg-neutral-950 border border-neutral-800 px-2 py-1.5 text-[11.5px] leading-relaxed text-neutral-300">
      {text || '…'}
    </p>
  )
}

const TypeTag = ({ type }: { type: PortType }) => (
  <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: PORT_COLOR[type] }}>→ {type}</span>
)

export const InputNodeView = memo(({ id, data, selected }: NodeProps<InputNode>) => (
  <Shell id={id} kind="Message" icon={<LogIn className="w-3 h-3" />} selected={selected} width="w-52">
    <Title id={id} value={data.label} />
    <p className="text-xs text-neutral-400">What you type in the chat starts here.</p>
    <TypeTag type="text" />
    <Port type="source" id="out" kind="text" />
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
        className="nodrag nowheel resize-none rounded-md bg-neutral-950 border border-neutral-800 focus:border-lime-300/50 px-2 py-1.5 text-xs leading-relaxed text-neutral-300 outline-none"
      />
      {out === 'list' && <p className="text-[11px] text-sky-300/90">Gets a list: answers each item separately.</p>}
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
  const updateNode = useApp(s => s.updateNode)
  const step = useStep(id)
  return (
    <Shell id={id} kind="Condition" icon={<GitBranch className="w-3 h-3" />} selected={selected} step={step} width="w-60">
      <Title id={id} value={data.label} />
      <label className="flex flex-col gap-1 text-xs text-neutral-400">
        If the text contains
        <input
          value={data.match}
          onChange={e => updateNode(id, { match: e.target.value })}
          className="nodrag rounded-md bg-neutral-950 border border-neutral-800 focus:border-lime-300/50 px-2 py-1 font-mono text-neutral-100 outline-none"
        />
      </label>
      {step?.branch && (
        <p className="font-mono text-[10px] uppercase tracking-widest text-lime-300">Went → {step.branch}</p>
      )}
      <Port type="target" id="in" kind="text" />
      <Port type="source" id="yes" kind="text" top="40%" label="yes" />
      <Port type="source" id="no" kind="text" top="75%" label="no" />
    </Shell>
  )
})

export const OutputNodeView = memo(({ id, data, selected }: NodeProps<OutputNode>) => {
  const step = useStep(id)
  return (
    <Shell id={id} kind="Answer" icon={<LogOut className="w-3 h-3" />} color="#c8f560" selected={selected} step={step} width="w-56">
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
}
