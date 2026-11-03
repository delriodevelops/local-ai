import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { face, H, INK, label, PAPER, RED, W } from '../brand'
import { wirePath } from '../app/Wire'
import { rgba } from '../fx/Glow'
import { clamp, ease, mix, prog, rand, track } from '../lib/motion'
import { V } from '../timing'
import { LAST_SPLIT } from './Nos'
import { DOT } from './Sign'

// 10. «Your machine is the server.»: detrás del último corte espera el rojo de la landing con su malla de modelos,
// en tres planos que se mueven a distinta velocidad: cables de papel, nodos cuadrados con su nombre y señales que
// corren por ellos. En tinta, a toda la anchura, la frase entra palabra a palabra con la voz. Al acabar, el rojo se
// cierra como un diafragma en el punto de la firma

export const FROM = LAST_SPLIT - 2
export const IRIS = V.theServer + 14

type MeshNode = { x: number; y: number; name: string }
// Tres capas: lejos, en medio y cerca. Coordenadas en un lienzo de 2400 × 1400 centrado en la pantalla
const LAYERS: { z: number; blur: number; alpha: number; nodes: MeshNode[]; edges: [number, number][] }[] = [
  {
    z: -900,
    blur: 2.5,
    alpha: 0.4,
    nodes: [
      { x: 140, y: 260, name: 'Split' }, { x: 620, y: 120, name: 'Join' }, { x: 980, y: 300, name: 'Condition' }, { x: 1500, y: 160, name: 'MCP tool' },
      { x: 1980, y: 320, name: 'Agent' }, { x: 300, y: 1100, name: 'Create image' }, { x: 900, y: 1240, name: 'Llama 3.2' }, { x: 1700, y: 1180, name: 'Gemma 4' }, { x: 2260, y: 1020, name: 'Answer' },
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [2, 6], [3, 7]],
  },
  {
    z: -350,
    blur: 0.8,
    alpha: 0.75,
    nodes: [
      { x: 80, y: 520, name: 'Message' }, { x: 520, y: 380, name: 'Qwen3.5' }, { x: 900, y: 560, name: 'Researcher' }, { x: 1340, y: 420, name: 'Summarizer' },
      { x: 1880, y: 560, name: 'Answer' }, { x: 380, y: 900, name: 'Voice note' }, { x: 820, y: 980, name: 'Whisper' }, { x: 1300, y: 860, name: 'Designer' }, { x: 1760, y: 960, name: 'Kokoro' },
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 3], [7, 8], [1, 7]],
  },
  {
    z: 0,
    blur: 0,
    alpha: 1,
    nodes: [{ x: -40, y: 700, name: 'Photo' }, { x: 420, y: 720, name: 'Janus-Pro' }, { x: 860, y: 640, name: 'Critic' }, { x: 2120, y: 700, name: 'Speak' }, { x: 2520, y: 640, name: 'Answer' }],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
]
const FIELD = { w: 2400, h: 1400 }

function Layer({ layer, f, li }: { layer: (typeof LAYERS)[number]; f: number; li: number }) {
  const draw = prog(f, FROM + li * 3, FROM + 22 + li * 3, ease.out)
  return (
    <div style={{ position: 'absolute', left: (W - FIELD.w) / 2, top: (H - FIELD.h) / 2, width: FIELD.w, height: FIELD.h, transform: `translateZ(${layer.z}px)`, filter: layer.blur ? `blur(${layer.blur}px)` : undefined, opacity: layer.alpha }}>
      <svg width={FIELD.w} height={FIELD.h} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        {layer.edges.map(([a, b], i) => {
          const A = layer.nodes[a]
          const B = layer.nodes[b]
          const path = wirePath(A.x, A.y, B.x, B.y)
          const run = ((f - FROM - i * 5 - li * 7) / (22 + rand(i + li * 10) * 14)) % 1
          const head = run > 0 && draw >= 1 ? path.at(run) : undefined
          return (
            <g key={i}>
              <path d={path.d} fill="none" stroke={PAPER} strokeWidth={2} strokeOpacity={0.85} pathLength={1} strokeDasharray={`${draw} 2`} />
              {head && <circle cx={head[0]} cy={head[1]} r={7} fill={PAPER} style={{ filter: `drop-shadow(0 0 10px ${rgba(PAPER, 0.9)})` }} />}
            </g>
          )
        })}
      </svg>
      {layer.nodes.map((n, i) => {
        const pop = prog(f, FROM + 4 + i * 1.5 + li * 3, FROM + 12 + i * 1.5 + li * 3, ease.back)
        return (
          <div key={i} style={{ position: 'absolute', left: n.x, top: n.y, transform: `translate(-50%, -50%) scale(${pop})` }}>
            <div style={{ width: 22, height: 22, background: PAPER }} />
            <div style={{ ...label(15, PAPER), position: 'absolute', left: 30, top: -24 }}>{n.name}</div>
          </div>
        )
      })}
    </div>
  )
}

const WORDS: { text: string; at: number; line: number }[] = [
  { text: 'YOUR', at: V.your, line: 0 },
  { text: 'MACHINE', at: V.machine, line: 0 },
  { text: 'IS', at: V.is, line: 1 },
  { text: 'THE', at: V.the, line: 1 },
  { text: 'SERVER.', at: V.theServer, line: 1 },
]

export function Machine() {
  const f = useCurrentFrame()
  const iris = prog(f, IRIS, IRIS + 9, ease.drama)
  const r = mix(1300, DOT.r, iris)
  const cx = mix(W / 2, DOT.x, iris)
  const cy = mix(H / 2, DOT.y, iris)
  const yaw = track(f, [[FROM, -9], [IRIS, 4, ease.linear]])
  const dolly = track(f, [[FROM, -200], [IRIS, 160, ease.linear], [IRIS + 9, 700, ease.in]])
  return (
    <AbsoluteFill style={{ clipPath: `circle(${r}px at ${cx}px ${cy}px)` }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 75% at 45% 45%, #ff4b30, ${RED} 50%, #e8311a)` }} />
      <AbsoluteFill style={{ perspective: 1500 }}>
        <AbsoluteFill style={{ transformStyle: 'preserve-3d', transform: `translateZ(${dolly}px) rotateY(${yaw}deg) rotateX(4deg)` }}>
          {LAYERS.map((layer, li) => (
            <Layer key={li} layer={layer} f={f} li={li} />
          ))}
        </AbsoluteFill>
      </AbsoluteFill>
      <div style={{ ...face(900, 92), position: 'absolute', left: 92, top: H / 2, transform: `translateY(-50%) scale(${mix(1, 1.04, prog(f, V.your, IRIS, ease.linear))})`, transformOrigin: '0 50%', fontSize: 206, lineHeight: 0.86, letterSpacing: '-0.045em', color: INK }}>
        {[0, 1].map(line => (
          <div key={line} style={{ display: 'flex', gap: '0.2em', overflow: 'hidden', paddingBottom: 8 }}>
            {WORDS.filter(w => w.line === line).map(w => {
              const t = prog(f, w.at - 1, w.at + 7, ease.out)
              return (
                <span key={w.text} style={{ display: 'inline-block', transform: `translateY(${(1 - t) * 100}%)`, opacity: clamp(t * 3) }}>
                  {w.text}
                </span>
              )
            })}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  )
}
