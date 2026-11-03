import { Activity, ArrowLeft, ArrowRight, ArrowUp, ChevronDown, Cpu, ImagePlus, LayoutTemplate, Lock, Maximize, Mic, Minus, PanelLeftClose, Plus, RotateCw, Settings2, SquarePen } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { FONT, RED } from '../brand'
import { FLOW, FLOW_SIZE, FlowGraph, type FlowId, type FlowState } from './Flow'
import { PORT, tag, UI, uiMono } from './theme'

// La app entera en su tema oscuro, dentro de una ventana de navegador sin marca. Medidas en píxeles de la app
export const APP = { w: 1600, h: 1000, bar: 84, side: 288, top: 64, chat: 576 }
// El lienzo dentro de la ventana (con la barra del navegador) y cómo encaja el grafo en él
export const CANVAS = { x: APP.side + APP.chat, y: APP.bar + APP.top, w: APP.w - APP.side - APP.chat, h: APP.h - APP.top }
export const GRAPH = { scale: 0.42, x: CANVAS.x + 32, y: CANVAS.y + 268 }
// Un punto del grafo en píxeles de la ventana
export const inWindow = (x: number, y: number) => ({ x: GRAPH.x + x * GRAPH.scale, y: GRAPH.y + y * GRAPH.scale })
export const nodeCenter = (id: FlowId) => inWindow(FLOW[id].x + FLOW[id].w / 2, FLOW[id].y + FLOW[id].h / 2)

const rule = `1px solid ${UI.line}`

// El icono de la app (public/favicon.svg): la malla sobre tinta y su nodo rojo
const Favicon = () => (
  <svg viewBox="0 0 64 64" width={14} height={14} style={{ flexShrink: 0 }}>
    <rect width={64} height={64} fill="#f2f2ef" />
    <g stroke="#111" strokeWidth={4}>
      <line x1={16} y1={46} x2={32} y2={18} />
      <line x1={32} y1={18} x2={48} y2={46} />
      <line x1={16} y1={46} x2={48} y2={46} />
    </g>
    <rect x={9} y={39} width={14} height={14} fill="#111" />
    <rect x={41} y={39} width={14} height={14} fill="#111" />
    <circle cx={32} cy={18} r={8} fill={RED} />
  </svg>
)

function Chrome({ url }: { url: ReactNode }) {
  return (
    <div style={{ height: APP.bar, boxSizing: 'border-box', background: '#1a1a19', borderBottom: rule, fontFamily: FONT }}>
      <div style={{ height: 40, display: 'flex', alignItems: 'flex-end', padding: '0 12px', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, padding: '0 8px 14px 4px' }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: '#3a3a3a' }} />
          ))}
        </div>
        <div style={{ height: 32, width: 240, background: UI.bg, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', fontSize: 13, color: UI.t100 }}>
          <Favicon />
          MeshMind
        </div>
      </div>
      <div style={{ height: 43, background: UI.bg, display: 'flex', alignItems: 'center', gap: 14, padding: '0 16px', color: UI.t500 }}>
        <ArrowLeft size={16} />
        <ArrowRight size={16} />
        <RotateCw size={15} />
        <div style={{ flex: 1, height: 30, background: '#1a1a19', display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', fontSize: 14, color: UI.t100 }}>
          <Lock size={13} color={UI.t500} />
          {url}
        </div>
      </div>
    </div>
  )
}

const square: CSSProperties = { width: 40, height: 40, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }

function Sidebar() {
  return (
    <div style={{ width: APP.side, boxSizing: 'border-box', borderRight: rule, display: 'flex', flexDirection: 'column', fontFamily: FONT }}>
      <div style={{ height: APP.top, flexShrink: 0, boxSizing: 'border-box', borderBottom: `2px solid ${UI.text}`, display: 'flex', alignItems: 'center', gap: 4, padding: '0 16px' }}>
        <div style={{ flex: 1, fontSize: 15, lineHeight: 1.3, color: UI.text }}>
          <div style={{ fontWeight: 800, letterSpacing: '-0.01em' }}>MeshMind</div>
          <div style={{ color: UI.t500 }}>Local AI flows</div>
        </div>
        {[SquarePen, PanelLeftClose].map((Icon, i) => (
          <span key={i} style={{ ...square, width: 36, height: 36, color: UI.t400 }}>
            <Icon size={16} />
          </span>
        ))}
      </div>
      <div style={{ ...tag, padding: '24px 16px 8px' }}>History</div>
      <div style={{ margin: '4px 8px', padding: '8px 10px', fontSize: 14, color: UI.text, background: UI.t800, borderLeft: `2px solid ${UI.signal}` }}>A bakery run by a fox</div>
      <div style={{ margin: '0 8px', padding: '8px 10px', fontSize: 14, color: UI.t500 }}>Plan a trip to Lisbon</div>
      <div style={{ margin: '0 8px', padding: '8px 10px', fontSize: 14, color: UI.t500 }}>Name for a coffee cart</div>
      <div style={{ flex: 1 }} />
      <div style={{ ...tag, fontSize: 10, color: UI.t600, padding: 16, borderTop: rule }}>Everything stays in this browser</div>
    </div>
  )
}

function Header() {
  return (
    <div style={{ height: APP.top, flexShrink: 0, boxSizing: 'border-box', borderBottom: `2px solid ${UI.text}`, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', fontFamily: FONT, color: UI.text }}>
      <div style={{ width: 300, height: 40, boxSizing: 'border-box', border: `1.5px solid ${UI.text}`, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px' }}>
        <Cpu size={16} color={UI.t500} />
        <span style={tag}>Model</span>
        <span style={uiMono}>Qwen3.5 4B</span>
        <ChevronDown size={16} color={UI.t600} style={{ marginLeft: 'auto' }} />
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 24 }}>
        {['Chat', 'Both', 'Flow'].map((name, i) => {
          const on = name === 'Both'
          return (
            <span
              key={name}
              style={{
                display: 'flex',
                gap: 6,
                padding: '4px 0 5px',
                fontSize: 13,
                fontVariantNumeric: 'tabular-nums',
                color: on ? UI.text : UI.t500,
                background: on ? `linear-gradient(${UI.signal}, ${UI.signal}) 0 100% / 100% 2px no-repeat` : undefined,
              }}
            >
              <span>0{i + 1}</span>
              {name}
            </span>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, marginLeft: 8 }}>
        {[Activity, Settings2].map((Icon, i) => (
          <span key={i} style={{ ...square, border: `1.5px solid ${UI.text}` }}>
            <Icon size={16} />
          </span>
        ))}
      </div>
    </div>
  )
}

export const ANSWER =
  'Foxglove & Crumb opens before dawn. The Researcher found what neighbours want: sourdough by seven and a place to sit. The Designer drew a counter shaped like a den; the Critic asked for a gluten-free shelf. Together: a small bakery with one long table, a fox on the sign and bread that sells out by noon.'

// El chat (chat/Thread.tsx): cada turno abre con su número en rojo y tu mensaje como titular; la respuesta lleva la
// regla roja y va saliendo palabra a palabra. answer: cuántas letras de la respuesta se ven
function Chat({ answer }: { answer: number }) {
  const shown = ANSWER.slice(0, Math.round(answer))
  return (
    <div style={{ width: APP.chat, flexShrink: 0, boxSizing: 'border-box', borderRight: rule, display: 'flex', flexDirection: 'column', fontFamily: FONT }}>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '40px 32px 0' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
          <span style={{ ...uiMono, fontSize: 13, color: UI.signalInk }}>01</span>
          <span style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em', color: UI.text }}>A bakery run by a fox</span>
        </div>
        <div style={{ ...tag, margin: '28px 0 10px 32px', fontSize: 10, color: UI.t600 }}>Panel of experts · 4 assistants</div>
        <div style={{ marginLeft: 32, paddingLeft: 16, borderLeft: `2px solid ${UI.signal}`, fontSize: 16, lineHeight: 1.65, color: UI.t100, minHeight: 24 }}>
          {shown}
          {answer > 0 && answer < ANSWER.length && <span style={{ display: 'inline-block', width: 9, height: 18, marginLeft: 2, background: UI.signal, verticalAlign: '-3px' }} />}
        </div>
      </div>
      <div style={{ flexShrink: 0, padding: '0 16px 12px' }}>
        <div style={{ border: `2px solid ${UI.text}`, padding: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          {[ImagePlus, Mic].map((Icon, i) => (
            <span key={i} style={{ ...square, color: UI.t600 }}>
              <Icon size={20} />
            </span>
          ))}
          <span style={{ flex: 1, padding: 8, fontSize: 15, color: UI.t600 }}>Message the flow · 4 assistants</span>
          <span style={{ ...square, background: UI.t800, color: UI.t600 }}>
            <ArrowUp size={20} />
          </span>
        </div>
        <div style={{ ...tag, marginTop: 8, fontSize: 10, textAlign: 'center', color: UI.t600 }}>Runs locally · answers may be inaccurate</div>
      </div>
    </div>
  )
}

const tool: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, height: 40, boxSizing: 'border-box', padding: '0 14px', fontFamily: FONT, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }

// El lienzo (flow/Canvas.tsx): la retícula de líneas, los botones, el zoom, la leyenda de los tipos y el minimapa
function CanvasChrome() {
  const gap = 80 * GRAPH.scale
  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(${UI.grid} 1px, transparent 1px), linear-gradient(90deg, ${UI.grid} 1px, transparent 1px)`,
          backgroundSize: `${gap}px ${gap}px`,
          backgroundPosition: `${(GRAPH.x - CANVAS.x) % gap}px ${(GRAPH.y - CANVAS.y) % gap}px`,
        }}
      />
      <div style={{ position: 'absolute', left: 15, top: 15, display: 'flex', gap: 8 }}>
        <span style={{ ...tool, background: UI.text, color: UI.bg }}>
          <Plus size={16} />
          Add node
        </span>
        <span style={{ ...tool, border: `1.5px solid ${UI.text}`, color: UI.text }}>
          <LayoutTemplate size={16} />
          Templates
        </span>
      </div>
      <div style={{ position: 'absolute', left: 15, bottom: 15, border: `2px solid ${UI.text}`, color: UI.text, background: UI.bg }}>
        {[Plus, Minus, Maximize].map((Icon, i) => (
          <span key={i} style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: i ? rule : undefined }}>
            <Icon size={12} />
          </span>
        ))}
      </div>
      <div style={{ ...tag, position: 'absolute', left: 60, bottom: 18, display: 'flex', gap: 16, fontSize: 10, color: UI.t600 }}>
        {(Object.keys(PORT) as (keyof typeof PORT)[]).map(name => (
          <span key={name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, background: PORT[name] }} />
            {name}
          </span>
        ))}
      </div>
      <div style={{ position: 'absolute', right: 15, bottom: 15, width: 180, height: 120, border: `2px solid ${UI.text}`, background: UI.bg }}>
        {(Object.keys(FLOW) as FlowId[]).map(id => (
          <span
            key={id}
            style={{ position: 'absolute', left: 14 + (FLOW[id].x / FLOW_SIZE.w) * 150, top: 22 + (FLOW[id].y / FLOW_SIZE.h) * 72, width: (FLOW[id].w / FLOW_SIZE.w) * 150, height: (FLOW[id].h / FLOW_SIZE.h) * 72, background: UI.t700 }}
          />
        ))}
      </div>
    </>
  )
}

// La ventana entera. El grafo va encima del lienzo, en coordenadas de la ventana, para que la cámara pueda acercarse
export function Window({ url, flow, answer = 0, cursor }: { url: ReactNode; flow: FlowState; answer?: number; cursor?: ReactNode }) {
  return (
    <div style={{ position: 'relative', width: APP.w, height: APP.h + APP.bar, background: UI.bg, overflow: 'hidden', outline: `1px solid ${UI.line}` }}>
      <Chrome url={url} />
      <div style={{ display: 'flex', height: APP.h }}>
        <Sidebar />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Header />
          <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
            <Chat answer={answer} />
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              <CanvasChrome />
            </div>
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: GRAPH.x, top: GRAPH.y, transform: `scale(${GRAPH.scale})`, transformOrigin: '0 0' }}>
        <FlowGraph state={flow} />
        {cursor}
      </div>
    </div>
  )
}
