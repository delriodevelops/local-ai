import { AudioLines, Eye, Mic, Play, Sparkles } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { face, H, mono, NIGHT, PAPER, RED, W } from '../brand'
import { Node, NodeField, NodeTitle, Port, TypeTag } from '../app/Node'
import { UI, uiMono, type PortType } from '../app/theme'
import { Wire, wirePath } from '../app/Wire'
import { rgba } from '../fx/Glow'
import { bezier, clamp, ease, impulse, mix, prog, rand, track } from '../lib/motion'
import { V } from '../timing'

// 7. «They think. They see. They listen. They speak.»: un travelling lateral por el lienzo, de latigazo en latigazo.
// En cada verbo la cámara frena delante de un nodo enorme que se pone a trabajar de verdad: piensa (el texto sale
// a borbotones), mira (una línea roja barre la foto y la describe), escucha (la nota de voz se vuelve texto) y habla
// (el texto se vuelve onda y el sonido sale del nodo). Detrás, en otro plano y desenfocada, la palabra a toda la
// anchura. Los cuatro puntos del contador de la landing van cambiando arriba

const GAP = 2600
const NODE_SCALE = 2.6
const NODE_W = 288
const WORD_Z = -520
const PERSPECTIVE = 1600
const DEPTH = PERSPECTIVE / (PERSPECTIVE - WORD_Z)

type Sense = { word: string; at: number; kind: string; icon: ReactNode; title: string; input: PortType; output: PortType; model: string }
const SENSES: Sense[] = [
  { word: 'THINK', at: V.think, kind: 'Assistant', icon: <Sparkles size={12} />, title: 'Brainstorm', input: 'text', output: 'text', model: 'qwen3.5-4b · 42 tok/s' },
  { word: 'SEE', at: V.see, kind: 'See image', icon: <Eye size={12} />, title: 'Describe the photo', input: 'image', output: 'text', model: 'janus-pro-1b · webgpu' },
  { word: 'LISTEN', at: V.listen, kind: 'Transcribe', icon: <Mic size={12} />, title: 'Voice note', input: 'audio', output: 'text', model: 'whisper-base · webgpu' },
  { word: 'SPEAK', at: V.speak, kind: 'Speak', icon: <AudioLines size={12} />, title: 'Read it aloud', input: 'text', output: 'audio', model: 'kokoro-82m · af_heart' },
]

// Dónde está cada nodo en el mundo (x) y adónde mira la cámara en cada momento: llega a cada uno con un latigazo que
// arranca en «They» y frena justo antes del verbo
const nodeX = (i: number) => i * GAP
function cameraX(f: number) {
  const keys: [number, number, (t: number) => number][] = [[V.they[0] - 1, nodeX(0) + 1500, ease.glide], [V.think, nodeX(0), ease.glide]]
  for (let i = 1; i < 4; i++) {
    keys.push([V.they[i] - 3, nodeX(i - 1) + 60, bezier(0.72, 0, 0.22, 1)])
    keys.push([SENSES[i].at - 1, nodeX(i), ease.glide])
  }
  keys.push([V.speakEnd - 2, nodeX(3) + 60, ease.drama])
  keys.push([V.all, nodeX(1.5), ease.drama])
  return track(f, keys)
}

// El radio máximo de los anillos de sonido, en píxeles del nodo
const RING = 420

const THOUGHT = 'Three names for a bakery run by a fox: Foxglove & Crumb. The Sly Loaf. Den of Dough. The first sounds warm and a little wild.'
const CAPTION = 'A red sun setting behind dark mountains.'
const HEARD = 'Remind me to take the bread out at six.'
const SPOKEN = 'Your bread is ready.'

// La foto que mira el nodo: montañas en facetas y un sol rojo, pintada en SVG
function Photo({ scan, boxes }: { scan: number; boxes: number }) {
  return (
    <svg viewBox="0 0 264 150" width={264} height={150} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a2a2a" />
          <stop offset="100%" stopColor="#4a3a36" />
        </linearGradient>
      </defs>
      <rect width={264} height={150} fill="url(#sky)" />
      <circle cx={176} cy={74} r={26} fill={RED} />
      <polygon points="0,150 0,96 46,62 88,104 120,80 164,118 210,86 264,112 264,150" fill="#1c1c1c" />
      <polygon points="0,150 0,118 60,92 104,126 150,104 200,132 264,120 264,150" fill="#111" />
      <polygon points="46,62 66,84 88,104 60,92" fill="#262626" />
      <polygon points="210,86 236,104 264,112 226,110" fill="#262626" />
      {/* Las cajas de lo que ve: el sol y las montañas */}
      {boxes > 0 && (
        <g fill="none" stroke={PAPER} strokeWidth={1.4} opacity={boxes}>
          <path d="M146 44h8M146 44v8M206 44h-8M206 44v8M146 104h8M146 104v-8M206 104h-8M206 104v-8" />
          <path d="M8 66h8M8 66v8M256 66h-8M256 66v8M8 144h8M8 144v-8M256 144h-8M256 144v-8" />
          <text x={148} y={40} fill={PAPER} stroke="none" fontSize={8} fontFamily="IBM Plex Mono" letterSpacing={0.6}>SUN 0.98</text>
          <text x={10} y={62} fill={PAPER} stroke="none" fontSize={8} fontFamily="IBM Plex Mono" letterSpacing={0.6}>MOUNTAINS 0.95</text>
        </g>
      )}
      {scan > 0 && scan < 1 && (
        <g>
          <rect x={0} y={0} width={264} height={150 * scan} fill={RED} opacity={0.12} />
          <rect x={0} y={150 * scan - 1.5} width={264} height={3} fill={RED} style={{ filter: `drop-shadow(0 0 6px ${RED})` }} />
        </g>
      )}
    </svg>
  )
}

// La nota de voz o la voz que sale: barras como las de la app. play: por dónde va (0-1); grow: cuánto se ha generado
function Bars({ play = 0, grow = 1, live = 0, f }: { play?: number; grow?: number; live?: number; f: number }) {
  const n = 46
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 46 }}>
      {Array.from({ length: n }, (_, i) => {
        const shape = 0.25 + 0.75 * Math.abs(Math.sin(i * 0.55) * Math.sin(i * 0.17 + 1.2)) * (0.6 + 0.4 * rand(i))
        const wobble = live > 0 ? 0.7 + 0.3 * Math.sin(f * 0.9 + i * 1.7) : 1
        const shown = i / n < grow
        const played = i / n < play
        return <span key={i} style={{ width: 3, height: shown ? 4 + 40 * shape * wobble : 2, background: played ? UI.signal : shown ? UI.t300 : UI.t700, boxShadow: played ? `0 0 6px ${rgba(UI.signal, 0.7)}` : undefined }} />
      })}
    </div>
  )
}

function Body({ i, f, t }: { i: number; f: number; t: number }) {
  const s = SENSES[i]
  if (i === 0) {
    const shown = THOUGHT.slice(0, Math.round(clamp(t / 26) * THOUGHT.length))
    return (
      <>
        <NodeTitle swatch="#60a5fa">{s.title}</NodeTitle>
        <NodeField rows={4} active={t > 0 && t < 30}>
          {shown}
          {t > 0 && t < 30 && <span style={{ display: 'inline-block', width: 6, height: 12, marginLeft: 1, background: UI.signal, verticalAlign: '-1px' }} />}
        </NodeField>
      </>
    )
  }
  if (i === 1) {
    const scan = prog(t, 0, 10, ease.inOut)
    const caption = CAPTION.slice(0, Math.round(prog(t, 8, 20, ease.linear) * CAPTION.length))
    return (
      <>
        <NodeTitle>{s.title}</NodeTitle>
        <div style={{ border: `1px solid ${UI.line}` }}>
          <Photo scan={t > 0 ? scan : 0} boxes={prog(t, 9, 13)} />
        </div>
        <div style={{ minHeight: 20, fontSize: 12, lineHeight: 1.5, color: UI.t100, borderLeft: `2px solid ${UI.text}`, paddingLeft: 8 }}>{caption || ' '}</div>
      </>
    )
  }
  if (i === 2) {
    const play = prog(t, 0, 14, ease.linear)
    const words = HEARD.split(' ')
    const n = Math.round(prog(t, 3, 16, ease.linear) * words.length)
    return (
      <>
        <NodeTitle>{s.title}</NodeTitle>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${UI.line}`, padding: '6px 10px' }}>
          <span style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: UI.text, color: UI.bg, flexShrink: 0 }}>
            <Play size={12} fill="currentColor" />
          </span>
          <Bars play={t > 0 ? play : 0} f={f} />
          <span style={{ ...uiMono, fontSize: 10, color: UI.t500 }}>0:03</span>
        </div>
        <div style={{ minHeight: 40, fontSize: 13, lineHeight: 1.5, color: UI.t100 }}>{words.slice(0, n).join(' ') || ' '}</div>
      </>
    )
  }
  const grow = prog(t, 2, 14, ease.out)
  return (
    <>
      <NodeTitle>{s.title}</NodeTitle>
      <div style={{ fontSize: 14, lineHeight: 1.5, color: UI.t100, fontWeight: 600 }}>“{SPOKEN}”</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', ...uiMono, fontSize: 10, color: UI.t500 }}>
        <span>VOICE · Heart (US, female)</span>
        <span>SPEED 1.0</span>
      </div>
      <div style={{ border: `1px solid ${t > 0 ? UI.signal : UI.line}`, padding: '4px 8px' }}>
        <Bars grow={t > 0 ? grow : 0} play={t > 0 ? grow * 0.9 : 0} live={t > 0 ? 1 : 0} f={f} />
      </div>
    </>
  )
}

function SenseNode({ i, f }: { i: number; f: number }) {
  const s = SENSES[i]
  const t = f - s.at
  const running = t >= 0 && t < 22
  const done = t >= 22
  const x = nodeX(i)
  // Los cables de entrada y salida, en coordenadas del nodo sin escalar: entran por la izquierda desde abajo y salen
  // por la derecha hacia arriba. La señal entra justo antes del verbo
  const inPath = wirePath(-520, 220, -7, 120)
  const outPath = wirePath(NODE_W + 7, 120, NODE_W + 560, -40)
  const arrive = prog(f, s.at - 7, s.at, ease.in)
  const leave = prog(f, s.at + 16, s.at + 26, ease.in)
  return (
    <div style={{ position: 'absolute', left: x - (NODE_W * NODE_SCALE) / 2 + 330, top: -70, transform: `scale(${NODE_SCALE})`, transformOrigin: '0 0' }}>
      <svg width={1} height={1} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        <Wire path={inPath} type={s.input} run={arrive >= 1 ? 1 : arrive} dim={0.7} width={1.6} />
        <Wire path={outPath} type={s.output} run={leave} dim={0.7} width={1.6} />
      </svg>
      <div style={{ position: 'relative' }}>
        <Node kind={s.kind} icon={s.icon} width={NODE_W} state={running ? 'running' : done ? 'done' : 'idle'} t={Math.max(0, t)} glow={1.4}>
          <Body i={i} f={f} t={t} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <TypeTag type={s.output} />
            <span style={{ ...uiMono, fontSize: 9, color: running ? UI.signalInk : UI.t600 }}>{s.model}</span>
          </div>
        </Node>
        <Port side="left" top={120} type={s.input} lit={impulse(f, s.at, 6)} />
        <Port side="right" top={120} type={s.output} lit={impulse(f, s.at + 18, 6)} />
      </div>
      {/* El sonido que sale del nodo que habla */}
      {i === 3 && t > 2 &&
        [0, 1, 2, 3, 4].map(k => {
          const r = Math.min(RING, Math.max(0, (t - 2 - k * 4) * 26))
          return r > 0 && r < RING ? <span key={k} style={{ position: 'absolute', left: NODE_W / 2 - r, top: 150 - r, width: r * 2, height: r * 2, borderRadius: '50%', border: `${2 / NODE_SCALE}px solid ${rgba(PAPER, 0.5 * (1 - r / RING))}`, pointerEvents: 'none' }} /> : null
        })}
    </div>
  )
}

export function Senses() {
  const f = useCurrentFrame()
  const camX = cameraX(f)
  // Lo que se balancea la cámara en cada latigazo
  const roll = track(f, [[V.they[0] - 1, 4], [V.think, 0, ease.glide], [V.they[1] - 2, 0], [V.see - 6, -2.5, ease.soft], [V.see, 0, ease.glide], [V.they[2] - 2, 0], [V.listen - 6, 2.5, ease.soft], [V.listen, 0, ease.glide], [V.they[3] - 2, 0], [V.speak - 6, -2.5, ease.soft], [V.speak, 0, ease.glide]])
  const out = prog(f, V.speakEnd - 2, V.all, ease.drama)
  const reach = Math.min(2.2, (PERSPECTIVE + 40 + out * 7200) / PERSPECTIVE)
  const grid = { x: camX - (W * reach * 1.5) / 2, w: W * reach * 1.5, h: H * reach * 1.6, alpha: 1 - clamp(out * 2) }
  // En los latigazos la cámara solo se desplaza en horizontal: en vez de pintar la escena 32 veces, se emborrona en
  // horizontal según su velocidad, como el obturador de una cámara (una sola pasada, una fracción de la memoria)
  const speed = Math.abs(cameraX(f + 0.25) - cameraX(f - 0.25)) * 2
  const smear = Math.min(140, speed * 0.16)
  const id = useId().replace(/:/g, '')
  return (
    <AbsoluteFill style={{ background: NIGHT, overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 80% 80% at 55% 55%, rgba(242,242,239,0.045), rgba(242,242,239,0.02) 45%, rgba(0,0,0,0) 90%)' }} />
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <filter id={`smear${id}`} x="-20%" y="0" width="140%" height="100%">
          <feGaussianBlur stdDeviation={`${smear} 0`} />
        </filter>
      </svg>
      <AbsoluteFill style={{ perspective: PERSPECTIVE, perspectiveOrigin: '50% 50%', filter: smear > 1 ? `url(#smear${id})` : undefined }}>
        <div style={{ position: 'absolute', left: W / 2, top: H / 2, transformStyle: 'preserve-3d', transform: `translateZ(${-out * 7200}px) rotateZ(${roll}deg) rotateY(-5deg) rotateX(3deg) translateX(${-camX}px)` }}>
          {/* La retícula del lienzo, en el plano de los nodos. Solo cubre lo que ve la cámara (crece al alejarse) y sus
              líneas quedan quietas en el mundo: una retícula del largo de todo el travelling no cabe en memoria cuando el
              desenfoque de movimiento la pinta 32 veces */}
          <div
            style={{
              position: 'absolute',
              left: grid.x,
              top: -grid.h / 2,
              width: grid.w,
              height: grid.h,
              backgroundImage: `linear-gradient(${UI.grid} 1px, transparent 1px), linear-gradient(90deg, ${UI.grid} 1px, transparent 1px)`,
              backgroundSize: '80px 80px',
              backgroundPosition: `${-((grid.x % 80) + 80) % 80}px ${(grid.h / 2) % 80}px`,
              transform: 'translateZ(-40px)',
              opacity: grid.alpha,
            }}
          />
          {SENSES.map((s, i) => (
            <div
              key={s.word}
              style={{
                ...face(900, 104),
                position: 'absolute',
                left: nodeX(i) + (110 - W / 2) / DEPTH,
                top: (-470) / DEPTH,
                fontSize: 520,
                lineHeight: 0.8,
                letterSpacing: '-0.04em',
                color: PAPER,
                whiteSpace: 'nowrap',
                transform: `translateZ(${WORD_Z}px)`,
                opacity: 0.92,
              }}
            >
              {s.word}
            </div>
          ))}
          {SENSES.map((s, i) => (
            <SenseNode key={s.word} i={i} f={f} />
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

// El contador y la nota de la esquina, como en el carrusel de los sentidos de la landing. Va en la pantalla, fuera del
// desenfoque de movimiento
export function SensesOver() {
  const f = useCurrentFrame()
  const current = SENSES.reduce((k, s, i) => (f >= s.at - 8 ? i : k), 0)
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 96, top: 72, ...mono(16, rgba(PAPER, 0.6)), display: 'flex', gap: 14 }}>
        <span style={{ color: PAPER }}>0{current + 1}</span>
        <span>/ 04</span>
      </div>
      <div style={{ position: 'absolute', right: 96, top: 72, ...mono(16, rgba(PAPER, 0.6)) }}>ON YOUR GRAPHICS CARD</div>
      <div style={{ position: 'absolute', left: 96, right: 96, top: 112, height: 2, background: rgba(PAPER, 0.15) }}>
        <div style={{ height: 2, width: `${mix(0, 100, clamp((current + prog(f, SENSES[current].at - 8, SENSES[current].at + 20)) / 4))}%`, background: RED }} />
      </div>
    </AbsoluteFill>
  )
}
