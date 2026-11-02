import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { display, EASE, H, INK, MARGIN, PAPER, RED, tween, W, wirePath } from '../brand'
import { T } from '../timing'

// 7. «Your machine is the server.» El disco se abre sobre la tinta hasta llenarlo todo de rojo; detrás se dibuja la
// malla de modelos, sin nombres que se crucen con la frase, y la frase sube palabra a palabra
export const IRIS_LENGTH = T.end - T.iris
const POINTS: [number, number][] = [[0.03, 0.08], [0.03, 0.62], [0.22, 0.93], [0.3, 0.12], [0.45, 0.9], [0.52, 0.08], [0.68, 0.88], [0.72, 0.15], [0.86, 0.7], [0.95, 0.3]]
const EDGES: [number, number][] = [[0, 3], [1, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 7], [6, 8], [7, 9], [8, 9], [3, 4], [5, 6]]
const WORDS = [['Your', 'machine'], ['is', 'the', 'server.']]
const place = ([x, y]: [number, number]) => [x * W, y * H]

// El campo rojo con la malla y la frase, en el fotograma f de la escena; la tarjeta final se lo lleva en columnas
export function RedField({ f }: { f: number }) {
  const mesh = tween(f, 6, 34, 0, 1, EASE.soft)
  return (
    <AbsoluteFill style={{ background: RED }}>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }} fill="none" stroke={PAPER} strokeWidth={3} strokeOpacity={0.55}>
        {EDGES.map(([a, b], i) => {
          const [x1, y1] = place(POINTS[a])
          const [x2, y2] = place(POINTS[b])
          const p = tween(mesh, i * 0.04, i * 0.04 + 0.5)
          return <path key={i} d={wirePath(x1, y1, x2, y2).d} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
        })}
        {POINTS.map((point, i) => {
          const [x, y] = place(point)
          const p = tween(mesh, 0.2 + i * 0.05, 0.4 + i * 0.05)
          return <rect key={i} x={x - 14} y={y - 14} width={28} height={28} fill={PAPER} stroke="none" opacity={p} />
        })}
      </svg>
      <div style={{ position: 'absolute', left: MARGIN, right: MARGIN, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {WORDS.map((line, l) => (
          <div key={l} style={{ overflow: 'hidden', paddingBottom: '0.04em' }}>
            {line.map((w, i) => {
              const start = 8 + l * 8 + i * 3
              const p = tween(f, start, start + 10, 0, 1, EASE.out)
              return <span key={w} style={{ ...display, display: 'inline-block', fontSize: 210, marginRight: '0.24em', transform: `translateY(${(1 - p) * 115}%)` }}>{w}</span>
            })}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  )
}

export function Iris() {
  const f = useCurrentFrame()
  const radius = 60 + tween(f, 0, 14, 0, 1, EASE.in) * 1150
  return (
    <AbsoluteFill style={{ background: INK }}>
      <AbsoluteFill style={{ clipPath: `circle(${radius}px at 960px 540px)` }}>
        <RedField f={f} />
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
