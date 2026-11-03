import { LogIn, LogOut, Sparkles } from 'lucide-react'
import { RED } from '../brand'
import { Node, NodeField, NodeTitle, Port, TypeTag, type NodeState } from './Node'
import { PORT, portText, tag, UI } from './theme'
import { Wire, wirePath } from './Wire'

// La plantilla «Panel of experts» de la app (flow/presets.ts) con sus nombres, colores e instrucciones reales. Las
// columnas van más separadas que en la app para que los cables se vean tender de cerca
export const FLOW = {
  in: { x: 0, y: 300, w: 240, h: 150 },
  r: { x: 440, y: 0, w: 288, h: 196, label: 'Researcher', color: '#60a5fa', text: 'Investigate the request. List the key facts, user needs and open questions.' },
  d: { x: 440, y: 300, w: 288, h: 196, label: 'Designer', color: '#f472b6', text: 'Turn the input into a clear product or UX proposal: screens, flows and decisions.' },
  c: { x: 440, y: 600, w: 288, h: 196, label: 'Critic', color: '#f87171', text: 'Find the weaknesses, risks and missing pieces in the input. Be direct.' },
  s: { x: 900, y: 300, w: 288, h: 196, label: 'Summarizer', color: RED, text: 'Combine everything you receive into one clear, well-structured answer.' },
  out: { x: 1360, y: 334, w: 240, h: 128 },
} as const
export type FlowId = keyof typeof FLOW
export const FLOW_SIZE = { w: 1600, h: 796 }

export const portOut = (id: FlowId) => ({ x: FLOW[id].x + FLOW[id].w, y: FLOW[id].y + FLOW[id].h * (id === 'in' ? 0.38 : 0.5) })
export const portIn = (id: FlowId) => ({ x: FLOW[id].x, y: FLOW[id].y + FLOW[id].h * 0.5 })

export const EDGES = [
  ['in', 'r'],
  ['in', 'd'],
  ['in', 'c'],
  ['r', 's'],
  ['d', 's'],
  ['c', 's'],
  ['s', 'out'],
] as const
export type Edge = (typeof EDGES)[number]
export const edgeKey = (e: Edge) => `${e[0]}-${e[1]}`
export const edgePath = ([a, b]: Edge) => {
  const p = portOut(a)
  const q = portIn(b)
  return wirePath(p.x, p.y, q.x, q.y)
}

export type FlowState = {
  // Por cable: cuánto está tendido y por dónde va la señal
  wires: Record<string, { draw: number; run: number }>
  // Por nodo: su estado y cuántos fotogramas lleva en él
  nodes: Partial<Record<FlowId, { state: NodeState; t: number; lit?: number }>>
  // El cable que se está arrastrando con el ratón, del puerto de salida hasta (x, y)
  drag?: { from: FlowId; x: number; y: number }
}

function FlowNode({ id, state = 'idle', t = 0, lit = 0 }: { id: FlowId; state?: NodeState; t?: number; lit?: number }) {
  const p = FLOW[id]
  const at = { position: 'absolute' as const, left: p.x, top: p.y }
  if (id === 'in')
    return (
      <div style={at}>
        <Node kind="Message" icon={<LogIn size={12} />} width={p.w} height={p.h} state={state} t={t}>
          <NodeTitle>Your message</NodeTitle>
          <p style={{ margin: 0, paddingRight: 64, fontSize: 12, lineHeight: 1.4, color: UI.t500 }}>A bakery run by a fox</p>
        </Node>
        {(['text', 'image', 'audio'] as const).map((type, i) => (
          <span key={type} style={{ ...tag, position: 'absolute', right: 14, top: `${38 + i * 20}%`, transform: 'translateY(-50%)', fontSize: 9, fontWeight: 600, color: portText(PORT[type]) }}>
            {type}
          </span>
        ))}
        <Port side="right" top="38%" lit={lit} />
        <Port side="right" top="58%" type="image" />
        <Port side="right" top="78%" type="audio" />
      </div>
    )
  if (id === 'out')
    return (
      <div style={at}>
        <Node kind="Answer" icon={<LogOut size={12} />} width={p.w} height={p.h} state={state} t={t} tone="ink">
          <NodeTitle>Answer</NodeTitle>
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.4, color: 'rgba(17,17,17,.7)' }}>What reaches here is shown as the answer.</p>
        </Node>
        <Port side="left" top="50%" any lit={lit} />
      </div>
    )
  const a = p as (typeof FLOW)['r']
  return (
    <div style={at}>
      <Node kind="Assistant" icon={<Sparkles size={12} />} width={a.w} height={a.h} state={state} t={t}>
        <NodeTitle swatch={a.color}>{a.label}</NodeTitle>
        <NodeField active={state === 'running'}>{a.text}</NodeField>
        <TypeTag type="text" />
      </Node>
      <Port side="left" top="50%" any lit={lit} />
      <Port side="right" top="50%" />
    </div>
  )
}

// El grafo en coordenadas del lienzo: los cables detrás, los nodos encima
export function FlowGraph({ state }: { state: FlowState }) {
  const drag = state.drag
  return (
    <div style={{ position: 'relative', width: FLOW_SIZE.w, height: FLOW_SIZE.h }}>
      <svg width={FLOW_SIZE.w} height={FLOW_SIZE.h} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        {EDGES.map(e => {
          const w = state.wires[edgeKey(e)]
          return w ? <Wire key={edgeKey(e)} path={edgePath(e)} draw={w.draw} run={w.run} /> : null
        })}
        {drag && (
          <Wire
            path={wirePath(portOut(drag.from).x, portOut(drag.from).y, drag.x, drag.y)}
            dim={0.9}
          />
        )}
      </svg>
      {(Object.keys(FLOW) as FlowId[]).map(id => (
        <FlowNode key={id} id={id} {...state.nodes[id]} />
      ))}
    </div>
  )
}

// La flecha del ratón. press (0-1): el clic, un anillo que se abre y se apaga
export const Cursor = ({ x, y, press, scale = 1 }: { x: number; y: number; press?: number; scale?: number }) => (
  <svg width={60} height={60} style={{ position: 'absolute', left: x - 30, top: y - 30, overflow: 'visible', transform: `scale(${scale})`, transformOrigin: '30px 30px' }}>
    {press !== undefined && press > 0 && press < 1 && <circle cx={30} cy={30} r={10 + 18 * press} fill="none" stroke={UI.text} strokeWidth={2} opacity={1 - press} />}
    <path d="M30 30 L30 54 L36.5 48.5 L41 58.5 L45.5 56.5 L41 46.5 L49.5 46.5 Z" fill="#ffffff" stroke="#111" strokeWidth={1.6} strokeLinejoin="round" />
  </svg>
)
