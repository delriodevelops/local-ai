import { useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import {
  Background, BackgroundVariant, Controls, MiniMap, Panel, ReactFlow, ReactFlowProvider, useReactFlow,
  type Connection, type Edge, type NodeChange,
} from '@xyflow/react'
import * as Popover from '@radix-ui/react-popover'
import { AudioLines, Bot, Clapperboard, Eye, GitBranch, ImagePlus, LayoutTemplate, LogIn, LogOut, Merge, Mic, Plus, Sparkles, Split, Wrench } from 'lucide-react'
import '@xyflow/react/dist/style.css'
import { useApp } from './store'
import { useScheme } from '@/ui/theme'
import { useMedia } from '@/lib/useMedia'
import { checkConnection, edgeType, PORT_COLOR } from './graph'
import { nodeTypes } from './nodes'
import { fromVertical, toVertical, Vertical, VERTICAL_QUERY } from './orientation'
import { ASSISTANTS, TEMPLATES, newId } from './presets'
import { useSession } from '@/chat/session'
import type { FlowNode } from './types'

// Una copia traspuesta por cada nodo guardado: los que no cambian conservan la suya y React Flow no los repinta
const verticalCopies = new WeakMap<FlowNode, FlowNode>()
function verticalNode(node: FlowNode) {
  let copy = verticalCopies.get(node)
  if (!copy) verticalCopies.set(node, (copy = { ...node, position: toVertical(node.position) }))
  return copy
}

// Fondo y minimapa se pintan como atributos SVG: necesitan el color ya resuelto, no una variable CSS
const CANVAS_COLORS = {
  light: { dots: '#c9c9c2', mask: 'rgba(242,242,239,0.75)', node: '#b5b5ad' },
  dark: { dots: '#3a3a35', mask: 'rgba(15,15,14,0.75)', node: '#4b4b45' },
}

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
          className="z-50 w-72 max-h-[70vh] overflow-y-auto border-[1.5px] border-ink bg-neutral-900 p-1.5 animate-rise"
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
    className="flex items-center gap-2 border-[1.5px] border-ink bg-neutral-900 px-3 py-2 text-sm font-medium text-neutral-50 hover:bg-ink hover:text-paper duration-200 ease-snap"
  >
    {children}
  </button>
)

function Flow() {
  const { nodes, edges, onNodesChange, onEdgesChange, connect, addNode, loadTemplate, mcpServers } = useApp()
  const steps = useSession(s => s.turns.at(-1)?.steps)
  const running = useSession(s => s.running)
  const { screenToFlowPosition, fitView } = useReactFlow()
  const wrapper = useRef<HTMLDivElement>(null)
  const templateKey = useApp(s => s.templateKey)
  const scheme = useScheme()
  const colors = CANVAS_COLORS[scheme]
  const vertical = useContext(Vertical)

  // En vertical se pintan las posiciones traspuestas, y lo que se arrastra se guarda deshaciendo la trasposición
  const shownNodes = useMemo(() => (vertical ? nodes.map(verticalNode) : nodes), [nodes, vertical])
  const onShownNodesChange = useCallback((changes: NodeChange<FlowNode>[]) => onNodesChange(vertical
    ? changes.map(change => (change.type === 'position' && change.position ? { ...change, position: fromVertical(change.position) } : change))
    : changes), [vertical, onNodesChange])

  useEffect(() => {
    if (templateKey) requestAnimationFrame(() => fitView({ padding: 0.2, duration: 400 }))
  }, [templateKey, fitView])

  // Las conexiones toman el color de lo que transportan y se animan mientras pasa la señal
  const styledEdges = useMemo<Edge[]>(() => edges.map(edge => {
    const type = edgeType(edge, nodes, edges)
    const source = steps?.find(s => s.nodeId === edge.source)
    const target = steps?.find(s => s.nodeId === edge.target)
    const active = running && target?.state === 'running' && (source?.state === 'done' || !source)
    const dead = source?.state === 'skipped' || (source?.branch && edge.sourceHandle !== source.branch)
    return {
      ...edge,
      animated: active,
      style: { stroke: PORT_COLOR[type], strokeWidth: active ? 2.5 : 1.5, opacity: dead ? 0.15 : active ? 1 : 0.55 },
    }
  }), [edges, nodes, steps, running])

  const add = (node: Omit<FlowNode, 'id' | 'position'>) => {
    const rect = wrapper.current?.getBoundingClientRect()
    const position = screenToFlowPosition({
      x: (rect?.left ?? 0) + (rect?.width ?? 600) / 2 - 120,
      y: (rect?.top ?? 0) + (rect?.height ?? 400) / 2 - 60,
    })
    addNode({ ...node, id: newId(node.type as string), position: vertical ? fromVertical(position) : position } as FlowNode)
  }

  return (
    <div ref={wrapper} className="h-full w-full">
      {/* Al girar la pantalla se monta de nuevo: los nodos cambian de sitio y sus conexiones de lado, y se reencuadra */}
      <ReactFlow
        key={vertical ? 'down' : 'across'}
        nodes={shownNodes}
        edges={styledEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onShownNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={(c: Connection) => connect(c)}
        isValidConnection={c => checkConnection(c, nodes, edges).ok}
        colorMode={scheme}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color={colors.dots} />
        <Controls showInteractive={false} className="!shadow-none" />
        <MiniMap pannable zoomable className="!hidden md:!block" maskColor={colors.mask} nodeColor={colors.node} />
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
            <p className="label px-2.5 pt-3 pb-1">Image &amp; sound · local</p>
            <MenuItem icon={<Eye className="w-4 h-4" />} title="See image" text="Image → text: describes or reads a picture." onSelect={() => add({ type: 'describe', data: { label: 'See image', prompt: 'Describe this image in detail.' } })} />
            <MenuItem icon={<ImagePlus className="w-4 h-4" />} title="Create image" text="Text → image, generated on your GPU." onSelect={() => add({ type: 'imagine', data: { label: 'Create image', style: '' } })} />
            <MenuItem icon={<Mic className="w-4 h-4" />} title="Transcribe" text="Audio → text with Whisper." onSelect={() => add({ type: 'transcribe', data: { label: 'Transcribe' } })} />
            <MenuItem icon={<AudioLines className="w-4 h-4" />} title="Speak" text="Text → natural voice." onSelect={() => add({ type: 'speak', data: { label: 'Speak', voice: 'af_heart' } })} />
            <p className="label px-2.5 pt-3 pb-1">Online · your key</p>
            <MenuItem icon={<Clapperboard className="w-4 h-4" />} title="Create video" text="Text → video on fal.ai. Needs a fal key in Settings." onSelect={() => add({ type: 'video', data: { label: 'Create video', model: 'fal-ai/ltx-video' } })} />
            <p className="label px-2.5 pt-3 pb-1">MCP tools · online</p>
            <MenuItem icon={<Wrench className="w-4 h-4" />} title="MCP tool" text="Calls one tool of an MCP server you added." onSelect={() => add({ type: 'tool', data: { label: 'MCP tool', serverId: mcpServers[0]?.id ?? '', tool: '', args: {} } })} />
            <MenuItem icon={<Bot className="w-4 h-4" />} title="Agent" text="An assistant that decides which MCP tools to call." onSelect={() => add({ type: 'agent', data: { label: 'Agent', color: '#2dd4bf', instructions: '', tools: [], maxSteps: 3 } })} />
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
          {Object.entries(PORT_COLOR).map(([type, color]) => (
            <span key={type}><i className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: color }} />{type}</span>
          ))}
          <span>drag from a dot to connect · backspace deletes</span>
        </Panel>
      </ReactFlow>
    </div>
  )
}

export default function Canvas() {
  const vertical = useMedia(VERTICAL_QUERY)
  return (
    <ReactFlowProvider>
      <Vertical.Provider value={vertical}>
        <Flow />
      </Vertical.Provider>
    </ReactFlowProvider>
  )
}
