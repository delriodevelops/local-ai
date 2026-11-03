import { useId } from 'react'
import { PORT, UI, type PortType } from './theme'

// Un punto de una curva de Bézier cúbica
function bezier(p0: number[], p1: number[], p2: number[], p3: number[], t: number) {
  const u = 1 - t
  return [0, 1].map(k => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]) as [number, number]
}

// Un cable entre dos puertos con la curva de los cables de la app (sale y entra en horizontal), y el punto del
// recorrido en t de 0 a 1
export function wirePath(x1: number, y1: number, x2: number, y2: number) {
  const bend = Math.max(40, Math.abs(x2 - x1) / 2)
  const pts = [[x1, y1], [x1 + bend, y1], [x2 - bend, y2], [x2, y2]]
  return { d: `M${x1} ${y1}C${x1 + bend} ${y1} ${x2 - bend} ${y2} ${x2} ${y2}`, at: (t: number) => bezier(pts[0], pts[1], pts[2], pts[3], t) }
}
export type WirePath = ReturnType<typeof wirePath>

// Un cable. draw (0-1): cuánto está tendido, desde el puerto de salida. run (0-1): por dónde va la señal; detrás deja
// el cable rojo, como el cable activo de la app, y la cabeza es un punto de luz. Va dentro de un <svg>
export function Wire({ path, type = 'text', draw = 1, run = 0, width = 2, dim = 0.55 }: { path: WirePath; type?: PortType; draw?: number; run?: number; width?: number; dim?: number }) {
  const id = useId().replace(/:/g, '')
  const head = run > 0 && run < 1 ? path.at(run) : undefined
  if (draw <= 0) return null
  return (
    <g>
      <defs>
        <radialGradient id={`h${id}`}>
          <stop offset="0%" stopColor="#fff4ef" />
          <stop offset="18%" stopColor="#ffb4a2" stopOpacity={0.95} />
          <stop offset="34%" stopColor={UI.signal} stopOpacity={0.55} />
          <stop offset="100%" stopColor={UI.signal} stopOpacity={0} />
        </radialGradient>
      </defs>
      <path d={path.d} fill="none" stroke={PORT[type]} strokeOpacity={dim} strokeWidth={width} pathLength={1} strokeDasharray={`${draw} 2`} />
      {run > 0 && <path d={path.d} fill="none" stroke={UI.signal} strokeWidth={width + 0.8} pathLength={1} strokeDasharray={`${Math.min(run, 1)} 2`} />}
      {head && (
        <>
          <circle cx={head[0]} cy={head[1]} r={34} fill={`url(#h${id})`} style={{ mixBlendMode: 'screen' }} />
          <circle cx={head[0]} cy={head[1]} r={5} fill="#fff4ef" />
        </>
      )}
    </g>
  )
}
