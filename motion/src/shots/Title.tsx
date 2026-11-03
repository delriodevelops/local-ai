import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { face, H, INK, label, mono, PAPER, RED } from '../brand'
import { clamp, ease, mix, prog, rand, spring, track } from '../lib/motion'
import { TOTAL, V } from '../timing'

// 4. «This is MeshMind.»: el rojo se ha cerrado en el disco del cartel de la landing, sobre el papel y su retícula de
// doce columnas. Las letras de MESH (la expandida negra) y MIND (la condensada) llegan volando desde el fondo, cada
// una desde un sitio y un giro distintos, y encajan justo con la palabra. Dentro del disco se tiende la malla y la
// señal la recorre

// El disco, en píxeles de la pantalla: aquí se cierra el rojo de «ANYMORE.»
export const DISC = { x: 1428, y: 498, r: 236 }

const MESH = { text: 'MESH', size: 404, x: 92, top: 150, wdth: 125 }
const MIND = { text: 'MIND', size: 404, x: 516, top: 452, wdth: 64 }
const LAND = V.meshmind + 4

// La malla del disco (la misma del icono de la app y de la bienvenida), en un cuadro de 360
const NODES = [[40, 205], [120, 115], [150, 245], [230, 165], [300, 255], [320, 105]]
const EDGES = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [1, 5], [2, 4]]

// Una letra que llega desde la profundidad. i: su orden; t0: cuándo sale
function Letter({ ch, i, t0, f, word }: { ch: string; i: number; t0: number; f: number; word: number }) {
  const t = prog(f, t0, t0 + 16, ease.out)
  const seed = word * 10 + i
  const z = mix(-2600 - rand(seed) * 1800, 0, t)
  const ry = mix((rand(seed + 1) - 0.5) * 150, 0, t)
  const rx = mix((rand(seed + 2) - 0.5) * 110, 0, t)
  const dx = mix((rand(seed + 3) - 0.5) * 1400, 0, t)
  const dy = mix((rand(seed + 4) - 0.5) * 900, 0, t)
  return (
    <span
      style={{
        display: 'inline-block',
        transform: `translate3d(${dx}px, ${dy}px, ${z}px) rotateX(${rx}deg) rotateY(${ry}deg)`,
        opacity: clamp(t * 3),
      }}
    >
      {ch}
    </span>
  )
}

function Word({ spec, f, t0, step, word }: { spec: typeof MESH; f: number; t0: number; step: number; word: number }) {
  return (
    <div
      style={{
        ...face(900, spec.wdth),
        position: 'absolute',
        left: spec.x,
        top: spec.top,
        fontSize: spec.size,
        lineHeight: 0.8,
        letterSpacing: '-0.035em',
        color: INK,
        whiteSpace: 'nowrap',
        transformStyle: 'preserve-3d',
      }}
    >
      {spec.text.split('').map((ch, i) => (
        <Letter key={i} ch={ch} i={i} t0={t0 + i * step} f={f} word={word} />
      ))}
    </div>
  )
}

// La malla dentro del disco: los cables se tienden uno tras otro y la señal los recorre en bucle
function Mesh({ f }: { f: number }) {
  const s = (DISC.r * 2) / 360
  return (
    <svg width={DISC.r * 2} height={DISC.r * 2} viewBox="0 0 360 360" style={{ position: 'absolute', left: DISC.x - DISC.r, top: DISC.y - DISC.r, overflow: 'visible' }}>
      {EDGES.map(([a, b], i) => {
        const draw = prog(f, LAND - 6 + i * 1.5, LAND + 4 + i * 1.5, ease.out)
        const run = ((f - LAND - i * 3) / 26) % 1
        const [x1, y1] = NODES[a]
        const [x2, y2] = NODES[b]
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x1 + (x2 - x1) * draw} y2={y1 + (y2 - y1) * draw} stroke={PAPER} strokeOpacity={0.7} strokeWidth={1.6 / s} />
            {draw >= 1 && run > 0 && <circle cx={x1 + (x2 - x1) * run} cy={y1 + (y2 - y1) * run} r={3.4} fill={PAPER} />}
          </g>
        )
      })}
      {NODES.map(([x, y], i) => {
        const pop = spring(f - (LAND - 4 + i * 1.5), { freq: 0.12, damping: 0.4 })
        return <rect key={i} x={x - 7 * pop} y={y - 7 * pop} width={14 * pop} height={14 * pop} fill={RED} stroke={PAPER} strokeWidth={1.8} />
      })}
    </svg>
  )
}

export function Title() {
  const f = useCurrentFrame()
  // La cámara: el cartel entra girado y lejos, se endereza mientras las letras llegan y al final empuja hacia el disco
  const yaw = track(f, [[V.this - 8, 16], [LAND + 6, 0, ease.out]])
  const pitch = track(f, [[V.this - 8, 8], [LAND + 6, 0, ease.out]])
  const dolly = track(f, [[LAND, 0], [V.wire, 90, ease.in]])
  const grid = prog(f, V.this - 6, V.this + 10, ease.out)
  const notes = prog(f, LAND + 4, LAND + 14, ease.out)
  const breathe = 1 + 0.012 * Math.sin((f - LAND) * 0.12) * prog(f, LAND, LAND + 10)
  const push = 1 + prog(f, LAND + 8, V.wire, ease.in) * 0.05
  return (
    <AbsoluteFill style={{ background: PAPER, overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: `${DISC.x}px ${DISC.y}px` }}>
        {/* La retícula de doce columnas de la landing, que se dibuja de arriba abajo */}
        <div style={{ position: 'absolute', left: 92, right: 92, top: 0, height: H * grid, display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', columnGap: 24 }}>
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} style={{ borderLeft: '1px solid rgba(17,17,17,0.08)', borderRight: '1px solid rgba(17,17,17,0.08)' }} />
          ))}
        </div>
        <div style={{ position: 'absolute', left: DISC.x - DISC.r, top: DISC.y - DISC.r, width: DISC.r * 2, height: DISC.r * 2, borderRadius: '50%', background: RED, transform: `scale(${breathe})` }} />
        <Mesh f={f} />
        <AbsoluteFill style={{ perspective: 1400, perspectiveOrigin: '50% 45%' }}>
          <AbsoluteFill style={{ transformStyle: 'preserve-3d', transform: `translateZ(${dolly}px) rotateX(${pitch}deg) rotateY(${yaw}deg)` }}>
            <Word spec={MESH} f={f} t0={V.this - 2} step={2} word={1} />
            <Word spec={MIND} f={f} t0={V.this + 5} step={2} word={2} />
          </AbsoluteFill>
        </AbsoluteFill>
        <div style={{ ...label(17, INK), position: 'absolute', left: 96, top: 92, opacity: prog(f, V.this - 2, V.this + 6) }}>This is</div>
        {/* Las notas del pie del cartel, como en el hero de la landing */}
        <div style={{ position: 'absolute', left: 96, right: 96, bottom: 70, display: 'flex', gap: 0, opacity: notes, transform: `translateY(${(1 - notes) * 14}px)` }}>
          <span style={{ ...mono(15, INK), width: '33%', lineHeight: 1.5 }}>THINK IN MESHES.</span>
          <span style={{ ...mono(15, INK), width: '25%', lineHeight: 1.5, whiteSpace: 'pre' }}>{'TEXT, IMAGE, SOUND, TOOLS.\nWIRED INTO ONE FLOW.'}</span>
          <span style={{ ...mono(15, INK), width: '28%', lineHeight: 1.5, whiteSpace: 'pre' }}>{'ON YOUR OWN GRAPHICS CARD.\nNO SERVER, NO ACCOUNT, NO KEY.'}</span>
          <span style={{ ...mono(15, INK), marginLeft: 'auto', alignSelf: 'flex-end' }}>
            FRAME <b style={{ fontSize: 30 }}>{String(Math.floor(f)).padStart(3, '0')}</b> / {TOTAL}
          </span>
        </div>
      </AbsoluteFill>
      {/* Las marcas de corte de las esquinas */}
      {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y], i) => (
        <span key={i} style={{ position: 'absolute', [x ? 'right' : 'left']: 22, [y ? 'bottom' : 'top']: 22, width: 22, height: 22, [x ? 'borderRight' : 'borderLeft']: `2px solid ${INK}`, [y ? 'borderBottom' : 'borderTop']: `2px solid ${INK}` }} />
      ))}
    </AbsoluteFill>
  )
}
