import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import {
  Background, BackgroundVariant, Controls, MiniMap, Panel, ReactFlow, ReactFlowProvider, useReactFlow,
  type Connection, type Edge,
} from '@xyflow/react'
import * as Popover from '@radix-ui/react-popover'
import { GitBranch, LayoutTemplate, LogIn, LogOut, Merge, Plus, Sparkles, Split } from 'lucide-react'
import '@xyflow/react/dist/style.css'
import { useApp } from './store'
import { checkConnection, outputType } from './graph'
import { nodeTypes } from './nodes'
import { ASSISTANTS, TEMPLATES, newId } from './presets'
import { useSession } from '@/chat/session'
import type { FlowNode } from './types'

function MenuItem({ icon, title, text, onSelect }: { icon: ReactNode; title: string; text?: string; onSelect: () => void }) {
  return (
    <Popover.Close asChild>
      <button type="button" onClick={onSelect} className="w-full flex items-start gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-neutral-800 duration-200">
        <span className="mt-0.5 text-neutral-300">{icon}</span>
        <span className="flex flex-col">
          <span className="text-sm text-neutral-100">{title}</span>
          {text && <span className="text-xs text-neutral-400">{text}</span>}
        </span>
      </button>
    </Popover.Close>
  )
}

function Menu({ trigger, children }: { trigger: ReactNode; children: ReactNode }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start" sideOffset={6}
          className="z-50 w-72 max-h-[70vh] overflow-y-auto rounded-xl border border-neutral-700 bg-neutral-900/95 backdrop-blur-md p-1.5 shadow-2xl shadow-black/60 animate-rise"
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

const ToolbarButton = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    {...props}
    className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900/90 backdrop-blur px-3 py-2 text-sm text-neutral-200 hover:border-neutral-500 duration-200 ease-snap"
  >
    {children}
  </button>
)

function Flow() {
  const { nodes, edges, onNodesChange, onEdgesChange, connect, addNode, loadTemplate } = useApp()
  const steps = useSession(s => s.turns.at(-1)?.steps)
  const running = useSession(s => s.running)
  const { screenToFlowPosition, fitView } = useReactFlow()
  const wrapper = useRef<HTMLDivElement>(null)
  const templateKey = useApp(s => s.templateKey)

  useEffect(() => {
    if (templateKey) requestAnimationFrame(() => fitView({ padding: 0.2, duration: 400 }))
  }, [templateKey, fitView])

  // Las conexiones toman el color de lo que transportan y se animan mientras pasa la señal
  const styledEdges = useMemo<Edge[]>(() => edges.map(edge => {
    const type = outputType(edge.source, nodes, edges)
    const source = steps?.find(s => s.nodeId === edge.source)
    const target = steps?.find(s => s.nodeId === edge.target)
    const active = running && target?.state === 'running' && (source?.state === 'done' || !source)
    const dead = source?.state === 'skipped' || (source?.branch && edge.sourceHandle !== source.branch)
    return {
      ...edge,
      animated: active,
      style: { stroke: type === 'list' ? '#60a5fa' : '#c8f560', strokeWidth: active ? 2.5 : 1.5, opacity: dead ? 0.15 : active ? 1 : 0.55 },
    }
  }), [edges, nodes, steps, running])

  const add = (node: Omit<FlowNode, 'id' | 'position'>) => {
    const rect = wrapper.current?.getBoundingClientRect()
    const position = screenToFlowPosition({
      x: (rect?.left ?? 0) + (rect?.width ?? 600) / 2 - 120,
      y: (rect?.top ?? 0) + (rect?.height ?? 400) / 2 - 60,
    })
    addNode({ ...node, id: newId(node.type as string), position } as FlowNode)
  }

  return (
    <div ref={wrapper} className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={styledEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={(c: Connection) => connect(c)}
        isValidConnection={c => checkConnection(c, nodes, edges).ok}
        colorMode="dark"
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#26281f" />
        <Controls showInteractive={false} className="!shadow-none" />
        <MiniMap pannable zoomable className="!hidden md:!block" maskColor="rgba(11,12,9,0.75)" nodeColor="#3a3d33" />
        <Panel position="top-left" className="flex gap-2">
          <Menu trigger={<ToolbarButton><Plus className="w-4 h-4" /> Add node</ToolbarButton>}>
            <p className="label px-2.5 pt-1.5 pb-1">Assistants</p>
            {ASSISTANTS.map(a => (
              <MenuItem
                key={a.label}
                icon={<span className="block w-3 h-3 rounded-full mt-1" style={{ background: a.color }} />}
                title={a.label} text={a.instructions}
                onSelect={() => add({ type: 'assistant', data: { ...a } })}
              />
            ))}
            <MenuItem icon={<Sparkles className="w-4 h-4" />} title="Blank assistant" text="Write its instructions yourself." onSelect={() => add({ type: 'assistant', data: { label: 'Assistant', color: '#a78bfa', instructions: '' } })} />
            <p className="label px-2.5 pt-3 pb-1">Logic</p>
            <MenuItem icon={<Split className="w-4 h-4" />} title="Split" text="Text → list, one item per line." onSelect={() => add({ type: 'split', data: { label: 'Split', max: 6 } })} />
            <MenuItem icon={<Merge className="w-4 h-4" />} title="Join" text="Many inputs or a list → one text." onSelect={() => add({ type: 'join', data: { label: 'Join', separator: '\n\n' } })} />
            <MenuItem icon={<GitBranch className="w-4 h-4" />} title="Condition" text="Route by whether the text contains a word." onSelect={() => add({ type: 'condition', data: { label: 'Condition', match: 'yes' } })} />
            <p className="label px-2.5 pt-3 pb-1">Ends</p>
            <MenuItem icon={<LogIn className="w-4 h-4" />} title="Message" text="Where your chat message enters." onSelect={() => add({ type: 'input', data: { label: 'Your message' } })} />
            <MenuItem icon={<LogOut className="w-4 h-4" />} title="Answer" text="What reaches it is shown in the chat." onSelect={() => add({ type: 'output', data: { label: 'Answer' } })} />
          </Menu>
          <Menu trigger={<ToolbarButton><LayoutTemplate className="w-4 h-4" /> Templates</ToolbarButton>}>
            {TEMPLATES.map(t => (
              <MenuItem
                key={t.id}
                icon={<LayoutTemplate className="w-4 h-4" />}
                title={t.name} text={t.description}
                onSelect={() => loadTemplate(t.id)}
              />
            ))}
          </Menu>
        </Panel>
        <Panel position="bottom-right" className="hidden 2xl:flex gap-4 !mb-3 !mr-[220px] font-mono text-[10px] uppercase tracking-widest text-neutral-500">
          <span><i className="inline-block w-2 h-2 rounded-full bg-[#c8f560] mr-1.5" />text</span>
          <span><i className="inline-block w-2 h-2 rounded-full bg-[#60a5fa] mr-1.5" />list</span>
          <span>drag from a dot to connect · backspace deletes</span>
        </Panel>
      </ReactFlow>
    </div>
  )
}

export default function Canvas() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  )
}
