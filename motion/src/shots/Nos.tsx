import { Copy, KeyRound, Server as ServerIcon, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { face, FONT, H, mono, NIGHT, PAPER, RED, W } from '../brand'
import { rgba } from '../fx/Glow'
import { ease, impulse, mix, prog, rand, shake } from '../lib/motion'
import { V } from '../timing'

// 9. «No server. No account. No API key.»: tres planos a sangre, uno detrás de otro. En cada uno, lo que te piden las
// otras apps (el servidor de otro, la cuenta, la clave), enorme y desenfocado al fondo, y su nombre delante. Con «No»
// cae en rojo el NO; con el sustantivo, una hoja roja lo corta en diagonal y el plano se parte en dos mitades que
// salen despedidas. Detrás espera el siguiente; detrás del último, el rojo de «Your machine is the server.»

type Cut = { noun: string; no: number; slash: number; split: number; angle: number; Back: () => ReactNode; icon: ReactNode }

const field = (labelText: string, value: string, wide = 900) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <span style={{ ...mono(22, rgba(PAPER, 0.5)), letterSpacing: '0.14em' }}>{labelText}</span>
    <div style={{ width: wide, height: 96, boxSizing: 'border-box', border: `2px solid ${rgba(PAPER, 0.35)}`, display: 'flex', alignItems: 'center', padding: '0 28px', ...mono(40, PAPER) }}>{value}</div>
  </div>
)

// Lo de detrás de cada plano: el servidor de otro, la ficha para crear la cuenta, la clave de la API
const Rack = () => (
  <svg width={1500} height={1000} viewBox="0 0 1500 1000">
    <rect width={1500} height={1000} fill="#121212" stroke="#2e2e2e" strokeWidth={4} />
    {Array.from({ length: 12 }, (_, u) => (
      <g key={u} transform={`translate(30 ${30 + u * 80})`}>
        <rect width={1440} height={68} fill="#171717" stroke="#2a2a2a" strokeWidth={2} />
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x={20 + i * 70} y={12} width={60} height={44} fill="#1f1f1f" stroke="#333" strokeWidth={2} />
        ))}
        {Array.from({ length: 22 }, (_, i) => (
          <rect key={i} x={620 + i * 22} y={20} width={10} height={28} fill="#0d0d0d" />
        ))}
        {Array.from({ length: 6 }, (_, i) => (
          <circle key={i} cx={1150 + i * 40} cy={34} r={7} fill={rand(u * 9 + i) > 0.9 ? RED : PAPER} opacity={rand(u * 31 + i * 3) > 0.35 ? 0.9 : 0.15} />
        ))}
      </g>
    ))}
  </svg>
)

const Signup = () => (
  <div style={{ width: 1300, boxSizing: 'border-box', padding: '70px 80px', background: '#141414', border: `2px solid ${rgba(PAPER, 0.25)}`, display: 'flex', flexDirection: 'column', gap: 40, fontFamily: FONT }}>
    <div style={{ ...face(800, 100), fontSize: 110, letterSpacing: '-0.03em', color: PAPER, lineHeight: 1 }}>Create your account</div>
    {field('EMAIL', 'you@example.com', 1140)}
    {field('PASSWORD', '••••••••••••', 1140)}
    <div style={{ height: 100, background: PAPER, color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', ...face(700, 100), fontSize: 40 }}>Continue</div>
  </div>
)

const Key = () => (
  <div style={{ width: 1500, boxSizing: 'border-box', padding: '70px 80px', background: '#141414', border: `2px solid ${rgba(PAPER, 0.25)}`, display: 'flex', flexDirection: 'column', gap: 36 }}>
    <span style={{ ...mono(24, rgba(PAPER, 0.5)), letterSpacing: '0.14em' }}>SECRET KEY · DO NOT SHARE</span>
    <div style={{ display: 'flex', gap: 24 }}>
      <div style={{ flex: 1, height: 130, boxSizing: 'border-box', border: `2px solid ${rgba(PAPER, 0.35)}`, display: 'flex', alignItems: 'center', padding: '0 34px', ...mono(56, PAPER) }}>sk-proj-4f9a2c••••••••••••</div>
      <div style={{ width: 130, height: 130, border: `2px solid ${rgba(PAPER, 0.35)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: PAPER }}>
        <Copy size={50} />
      </div>
    </div>
    <span style={{ ...mono(30, rgba(PAPER, 0.6)) }}>Billing · $0.002 per 1K tokens · usage this month $41.80</span>
  </div>
)

export const CUTS: Cut[] = [
  { noun: 'SERVER.', no: V.no[0], slash: V.noServer, split: V.noServer + 5, angle: -13, Back: Rack, icon: <ServerIcon size={34} /> },
  { noun: 'ACCOUNT.', no: V.no[1], slash: V.account, split: V.account + 4, angle: 11, Back: Signup, icon: <UserRound size={34} /> },
  { noun: 'API KEY.', no: V.no[2], slash: V.api + 4, split: V.key, angle: -9, Back: Key, icon: <KeyRound size={34} /> },
]

// Un plano: el fondo, lo de detrás y el texto. k: cuál es
function Plate({ k, f }: { k: number; f: number }) {
  const c = CUTS[k]
  const since = f - (k === 0 ? V.no[0] - 4 : CUTS[k - 1].split)
  const push = 1 + since * 0.0022
  const stamp = prog(f, c.no, c.no + 4, ease.out)
  const [sx, sy] = shake(f, c.no, 14, 4)
  return (
    <AbsoluteFill style={{ background: NIGHT, overflow: 'hidden' }}>
      <AbsoluteFill style={{ perspective: 1800 }}>
        <div style={{ position: 'absolute', left: W / 2 + 260, top: H / 2, transform: `translate(-50%, -50%) rotateY(${-16 + k * 12}deg) rotateX(6deg) scale(${push})`, filter: 'blur(5px)', opacity: 0.55 }}>
          <c.Back />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: 'linear-gradient(90deg, rgba(10,10,10,0.88) 0%, rgba(10,10,10,0.45) 55%, rgba(10,10,10,0.1) 100%)' }} />
      <div style={{ position: 'absolute', left: 92, top: H / 2, transform: `translate(${sx}px, calc(-50% + ${sy}px)) scale(${mix(1, 1.03, prog(f, c.no, c.split + 10, ease.linear))})`, transformOrigin: '0 50%' }}>
        <div style={{ ...face(900, 100), fontSize: 300, lineHeight: 0.84, letterSpacing: '-0.04em', color: RED, opacity: stamp, transform: `scale(${mix(1.4, 1, stamp)})`, transformOrigin: '0 100%', textShadow: `0 0 60px ${rgba(RED, 0.35)}` }}>NO</div>
        <div style={{ ...face(900, 96), fontSize: 300, lineHeight: 0.84, letterSpacing: '-0.04em', color: PAPER, whiteSpace: 'nowrap' }}>{c.noun}</div>
      </div>
      <div style={{ position: 'absolute', left: 96, top: 80, display: 'flex', alignItems: 'center', gap: 16, color: rgba(PAPER, 0.6), ...mono(16, rgba(PAPER, 0.6)) }}>
        {c.icon}
        <span>0{k + 1} / 03 · WHAT OTHER AI APPS NEED</span>
      </div>
    </AbsoluteFill>
  )
}

// La hoja: una línea roja que cruza la pantalla con el ángulo del corte, por el centro del sustantivo
const CENTER = { x: W / 2, y: H / 2 + 120 }
function line(angle: number) {
  const a = (angle * Math.PI) / 180
  const dx = Math.cos(a)
  const dy = Math.sin(a)
  return { dx, dy, nx: -dy, ny: dx }
}

// Las dos mitades de un plano: cada una es el plano entero recortado por un lado de la línea
function Halves({ k, f }: { k: number; f: number }) {
  const c = CUTS[k]
  const { dx, dy, nx, ny } = line(c.angle)
  const t = prog(f, c.split, c.split + 13, ease.in)
  const far = 4000
  const p = (s: number, n: number) => `${CENTER.x + dx * s + nx * n}px ${CENTER.y + dy * s + ny * n}px`
  const top = `polygon(${p(-far, 0)}, ${p(far, 0)}, ${p(far, -far)}, ${p(-far, -far)})`
  const bottom = `polygon(${p(-far, 0)}, ${p(far, 0)}, ${p(far, far)}, ${p(-far, far)})`
  const gap = t * 900
  const slide = t * 260
  return (
    <>
      <AbsoluteFill style={{ clipPath: top, transform: `translate(${-nx * gap - dx * slide}px, ${-ny * gap - dy * slide}px) rotate(${-t * 6}deg)`, opacity: 1 - t * 0.3 }}>
        <Plate k={k} f={f} />
      </AbsoluteFill>
      <AbsoluteFill style={{ clipPath: bottom, transform: `translate(${nx * gap + dx * slide}px, ${ny * gap + dy * slide}px) rotate(${t * 6}deg)`, opacity: 1 - t * 0.3 }}>
        <Plate k={k} f={f} />
      </AbsoluteFill>
    </>
  )
}

function Blade({ k, f }: { k: number; f: number }) {
  const c = CUTS[k]
  const { dx, dy } = line(c.angle)
  const draw = prog(f, c.slash - 1, c.slash + 3, ease.out)
  const fade = 1 - prog(f, c.split + 2, c.split + 8, ease.linear)
  if (draw <= 0 || fade <= 0) return null
  const len = 2600
  const x1 = CENTER.x - dx * len * 0.5
  const y1 = CENTER.y - dy * len * 0.5
  const x2 = x1 + dx * len * draw
  const y2 = y1 + dy * len * draw
  const flash = impulse(f, c.slash, 3)
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0, opacity: fade }}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={RED} strokeWidth={30 + 40 * flash} strokeOpacity={0.25} style={{ filter: 'blur(14px)' }} />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={RED} strokeWidth={7} />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffd9cf" strokeWidth={2} />
    </svg>
  )
}

export const LAST_SPLIT = CUTS[2].split

export function Nos() {
  const f = useCurrentFrame()
  // De atrás adelante: el último plano debajo; cada uno se parte en su momento y deja ver el siguiente
  return (
    <AbsoluteFill>
      {[2, 1, 0].map(k => {
        const c = CUTS[k]
        const gone = f >= c.split + 13
        const visible = k === 0 || f >= CUTS[k - 1].split - 1
        if (gone || !visible) return null
        return <AbsoluteFill key={k}>{f >= c.split ? <Halves k={k} f={f} /> : <Plate k={k} f={f} />}</AbsoluteFill>
      })}
      {[0, 1, 2].map(k => (
        <Blade key={k} k={k} f={f} />
      ))}
    </AbsoluteFill>
  )
}

