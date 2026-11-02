import type { CSSProperties } from 'react'
import { Easing, interpolate } from 'remotion'

// La marca de la landing: papel, tinta y un solo rojo; Archivo de ancho variable
export const PAPER = '#f2f2ef'
export const INK = '#111111'
export const RED = '#ff3a1f'
export const MUTED = '#5c5c58'
export const FONT = "'Archivo', system-ui, sans-serif"
export const W = 1920
export const H = 1080
export const MARGIN = 120

// Las mismas curvas que la web: salida elástica, entrada y salida dramática, aceleración
export const EASE = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  inOut: Easing.bezier(0.87, 0, 0.13, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  soft: Easing.bezier(0.65, 0, 0.35, 1),
}

// Un valor que va de a a b entre dos fotogramas, quieto antes y después
export const tween = (frame: number, from: number, to: number, a = 0, b = 1, easing = EASE.out) =>
  interpolate(frame, [from, to], [a, b], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing })

export const display: CSSProperties = {
  fontFamily: FONT,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '-0.045em',
  lineHeight: 0.84,
  color: INK,
  margin: 0,
}

export const label: CSSProperties = {
  fontFamily: FONT,
  fontSize: 28,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: INK,
}

// La retícula de doce columnas, que se dibuja de arriba abajo
export function Grid({ frame, at = 0, color = 'rgba(17,17,17,.1)', out }: { frame: number; at?: number; color?: string; out?: number }) {
  const fade = out === undefined ? 1 : tween(frame, out, out + 20, 1, 0)
  const step = (W - MARGIN * 2) / 12
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0, opacity: fade }}>
      {Array.from({ length: 13 }, (_, i) => {
        const p = tween(frame, at + i * 2, at + i * 2 + 30, 0, 1, EASE.inOut)
        const x = MARGIN + i * step
        return <line key={i} x1={x} x2={x} y1={0} y2={H * p} stroke={color} strokeWidth={1.5} />
      })}
    </svg>
  )
}

// Un punto de una curva de Bézier cúbica
function bezier(p0: number[], p1: number[], p2: number[], p3: number[], t: number) {
  const u = 1 - t
  return [0, 1].map(k => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k])
}

// Un cable entre dos puntos, con la curva de los cables de la app, y su recorrido de 0 a 1
export function wirePath(x1: number, y1: number, x2: number, y2: number) {
  const bend = (x2 - x1) / 2
  const pts = [[x1, y1], [x1 + bend, y1], [x2 - bend, y2], [x2, y2]]
  return { d: `M${x1} ${y1}C${x1 + bend} ${y1} ${x2 - bend} ${y2} ${x2} ${y2}`, at: (t: number) => bezier(pts[0], pts[1], pts[2], pts[3], t) }
}
