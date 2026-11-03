import { Check, LoaderCircle } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { FONT } from '../brand'
import { rgba } from '../fx/Glow'
import { clamp, ease } from '../lib/motion'
import { PORT, portText, tag, UI, type PortType } from './theme'

export type NodeState = 'idle' | 'running' | 'done'

// Un nodo de la app (flow/nodes/index.tsx, Shell) en el tema oscuro: marco de 2 px de la tinta del tema, el icono y
// el tipo arriba sobre una regla, el nombre en negrita. Trabajando, el marco pasa a rojo y la señal recorre el pie;
// aquí además el marco brilla, porque en la película la señal es luz. tone 'ink' lo invierte, como el nodo Answer.
// t: fotogramas desde que cambió de estado
export function Node({ kind, icon, width = 288, height, state = 'idle', t = 0, tone = 'paper', glow = 1, children, style }: {
  kind: string
  icon: ReactNode
  width?: number
  height?: number
  state?: NodeState
  t?: number
  tone?: 'paper' | 'ink'
  glow?: number
  children: ReactNode
  style?: CSSProperties
}) {
  const ink = tone === 'ink'
  const running = state === 'running'
  // El brillo sube al empezar y se queda latiendo mientras trabaja
  const light = running ? glow * clamp(t / 6) * (0.8 + 0.2 * Math.sin(t * 0.35)) : 0
  const bar = running ? ease.out(clamp(t / 16)) : 0
  return (
    <div
      style={{
        position: 'relative',
        boxSizing: 'border-box',
        width,
        height,
        background: ink ? UI.text : UI.bg,
        color: ink ? UI.bg : UI.t100,
        border: `2px solid ${running ? UI.signal : ink ? UI.text : UI.text}`,
        fontFamily: FONT,
        boxShadow: light > 0 ? `0 0 ${28 * light}px ${4 * light}px ${rgba(UI.signal, 0.45 * light)}, inset 0 0 ${18 * light}px ${rgba(UI.signal, 0.18 * light)}` : undefined,
        ...style,
      }}
    >
      <div style={{ height: 34, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', borderBottom: `1px solid ${ink ? 'rgba(17,17,17,.2)' : UI.line}` }}>
        <span style={{ display: 'flex', color: ink ? UI.bg : UI.text }}>{icon}</span>
        <span style={{ ...tag, flex: 1, color: ink ? 'rgba(17,17,17,.7)' : UI.t500 }}>{kind}</span>
        {/* animate-spin de la app: una vuelta por segundo */}
        {running && <LoaderCircle size={14} color={UI.signalInk} style={{ transform: `rotate(${t * 12}deg)` }} />}
        {state === 'done' && <Check size={14} />}
      </div>
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
      {bar > 0 && (
        <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, background: UI.signal, transform: `scaleX(${bar})`, transformOrigin: 'left', boxShadow: `0 0 14px ${rgba(UI.signal, 0.8)}` }} />
      )}
    </div>
  )
}

// El nombre del nodo en negrita, con la muestra cuadrada del color del asistente
export const NodeTitle = ({ children, swatch, size = 16 }: { children: ReactNode; swatch?: string; size?: number }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: size, lineHeight: 1.45, fontWeight: 700, letterSpacing: '-0.01em' }}>
    {swatch && <span style={{ width: 12, height: 12, flexShrink: 0, background: swatch }} />}
    {children}
  </div>
)

// Un campo de la app: regla fina alrededor sobre el mismo fondo. rows: alto en líneas
export const NodeField = ({ children, rows = 3, active = false }: { children: ReactNode; rows?: number; active?: boolean }) => (
  <div
    style={{
      boxSizing: 'border-box',
      height: 14 + rows * 19.5,
      overflow: 'hidden',
      border: `1px solid ${active ? UI.signal : UI.line}`,
      padding: '6px 8px',
      fontSize: 12,
      lineHeight: 1.625,
      color: UI.t300,
    }}
  >
    {children}
  </div>
)

// Lo que sale de un nodo (TypeTag): «→ text» en el color de su tipo
export const TypeTag = ({ type }: { type: PortType }) => (
  <span style={{ ...tag, fontSize: 9, fontWeight: 600, color: portText(PORT[type]) }}>→ {type}</span>
)

// Un puerto: un cuadrado del fondo con el borde del color de su tipo, centrado en el borde del nodo. lit: la señal
// acaba de pasar por él
export const Port = ({ side, top, type = 'text', lit = 0, any = false }: { side: 'left' | 'right'; top: string | number; type?: PortType; lit?: number; any?: boolean }) => {
  const color = any ? '#8a8a83' : PORT[type]
  return (
    <span
      style={{
        position: 'absolute',
        [side]: -7,
        top,
        width: 12,
        height: 12,
        boxSizing: 'border-box',
        transform: 'translateY(-50%)',
        background: lit > 0 ? UI.signal : UI.bg,
        border: `2px solid ${lit > 0 ? UI.signal : color}`,
        boxShadow: lit > 0 ? `0 0 ${16 * lit}px ${4 * lit}px ${rgba(UI.signal, 0.6 * lit)}` : undefined,
      }}
    />
  )
}
