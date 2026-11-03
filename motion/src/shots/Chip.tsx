import { useLayoutEffect, useRef } from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { face, H, mono, NIGHT, PAPER, RED, W } from '../brand'
import { rgba } from '../fx/Glow'
import { clamp, ease, mix, prog, rand, track } from '../lib/motion'
import { V } from '../timing'

// 8. «All on your own graphics card.»: corte seco a la tarjeta gráfica vista desde arriba y en escorzo, girando
// despacio. Su chip son miles de núcleos; cada modelo del flujo que trabaja es una onda de luz roja que los recorre.
// Las cuatro ondas salen de donde están los cuatro sentidos, uno tras otro. Alrededor, lecturas de la máquina; la de
// la red marca cero: nada sale de aquí

const GRID = 64
const DIE = 1100
const PACKAGE = 1700
const RES = 880

// Las ondas: de dónde salen (en celdas) y cuándo
const WAVES = [
  { x: 14, y: 16, at: V.all - 2 },
  { x: 48, y: 20, at: V.all + 6 },
  { x: 20, y: 48, at: V.own - 2 },
  { x: 50, y: 50, at: V.graphics + 2 },
  { x: 32, y: 32, at: V.card - 2 },
]

function heat(cx: number, cy: number, f: number) {
  let h = 0
  for (const w of WAVES) {
    const t = f - w.at
    if (t < 0) continue
    const d = Math.hypot(cx - w.x, cy - w.y)
    const r = t * 2.1
    const ring = 0.85 * Math.exp(-(((d - r) / 2.8) ** 2))
    // Detrás del frente la zona queda encendida, más floja, mientras el modelo sigue trabajando
    const wake = d < r ? 0.12 * Math.exp(-(r - d) / 14) : 0
    h += (ring + wake) * Math.exp(-t / 70)
  }
  return h
}

function paint(ctx: CanvasRenderingContext2D, f: number, bloom: boolean) {
  const cell = RES / GRID
  ctx.fillStyle = bloom ? '#000' : '#0d0d0d'
  ctx.fillRect(0, 0, RES, RES)
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      // Cada bloque de 4 × 4 núcleos es una unidad de cálculo: entre bloques queda un pasillo
      const gx = x * cell + Math.floor(x / 4) * 0 + 1
      const gy = y * cell + 1
      const flick = rand(x * 131 + y * 7 + Math.floor(f / 3) * 17) > 0.985 ? 0.5 : 0
      const h = Math.min(1.4, heat(x, y, f) + flick * prog(f, V.all, V.all + 6))
      const base = bloom ? 0 : 0.11
      if (h < 0.04 && bloom) continue
      // De gris apagado a rojo, y a casi blanco donde la onda pega fuerte
      const r = Math.round(mix(28, 255, clamp(h * 1.6)) + (h > 0.9 ? 0 : 0))
      const g = Math.round(h > 0.85 ? mix(58, 210, clamp((h - 0.85) / 0.5)) : mix(28, 58, clamp(h * 1.6)))
      const b = Math.round(h > 0.85 ? mix(31, 196, clamp((h - 0.85) / 0.5)) : mix(28, 31, clamp(h * 1.6)))
      ctx.globalAlpha = bloom ? clamp(h) : 1
      ctx.fillStyle = h < 0.04 ? `rgba(242,242,239,${base})` : `rgb(${r},${g},${b})`
      const gap = x % 4 === 3 || y % 4 === 3 ? 3.2 : 1.6
      ctx.fillRect(gx, gy, cell - gap, cell - gap)
    }
  }
  ctx.globalAlpha = 1
}

function Die({ f }: { f: number }) {
  const sharp = useRef<HTMLCanvasElement>(null)
  const glow = useRef<HTMLCanvasElement>(null)
  useLayoutEffect(() => {
    const a = sharp.current?.getContext('2d')
    const b = glow.current?.getContext('2d')
    if (a) paint(a, f, false)
    if (b) {
      b.setTransform(0.25, 0, 0, 0.25, 0, 0)
      paint(b, f, true)
    }
  }, [f])
  return (
    <div style={{ position: 'absolute', left: (PACKAGE - DIE) / 2, top: (PACKAGE - DIE) / 2, width: DIE, height: DIE }}>
      <canvas ref={sharp} width={RES} height={RES} style={{ position: 'absolute', inset: 0, width: DIE, height: DIE }} />
      <canvas ref={glow} width={RES / 4} height={RES / 4} style={{ position: 'absolute', inset: 0, width: DIE, height: DIE, filter: 'blur(3px)', mixBlendMode: 'screen', opacity: 0.95 }} />
    </div>
  )
}

// La placa: el sustrato, los condensadores alrededor del chip y una regla con marcas, en papel muy apagado
function Package() {
  const caps = []
  for (let i = 0; i < 28; i++) {
    const side = i % 4
    const k = Math.floor(i / 4)
    const along = 300 + k * 160
    const off = 210
    const pos = [
      [along, off],
      [PACKAGE - off, along],
      [PACKAGE - along, PACKAGE - off],
      [off, PACKAGE - along],
    ][side]
    caps.push(<rect key={i} x={pos[0] - 22} y={pos[1] - 12} width={44} height={24} fill="#1b1b1b" stroke="#333" strokeWidth={2} />)
  }
  return (
    <svg width={PACKAGE} height={PACKAGE} style={{ position: 'absolute', inset: 0 }}>
      <rect x={1} y={1} width={PACKAGE - 2} height={PACKAGE - 2} fill="#111" stroke="#2c2c2c" strokeWidth={3} />
      <rect x={(PACKAGE - DIE) / 2 - 24} y={(PACKAGE - DIE) / 2 - 24} width={DIE + 48} height={DIE + 48} fill="none" stroke="#3a3a3a" strokeWidth={2} />
      {caps}
      {Array.from({ length: 41 }, (_, i) => (
        <line key={i} x1={100 + i * 37.5} y1={60} x2={100 + i * 37.5} y2={i % 5 === 0 ? 92 : 76} stroke="#444" strokeWidth={2} />
      ))}
      <text x={100} y={PACKAGE - 64} fill="#555" fontFamily="IBM Plex Mono" fontSize={30} letterSpacing={6}>YOUR GPU · WEBGPU</text>
    </svg>
  )
}

const READOUTS = [
  ['MODELS LOADED', '4'],
  ['VRAM', '6.2 / 16 GB'],
  ['NETWORK', '0 B/s'],
]

export function Chip() {
  const f = useCurrentFrame()
  const spin = track(f, [[V.all - 1, -38], [V.card + 16, -22, ease.linear]])
  const tilt = track(f, [[V.all - 1, 58], [V.card + 16, 50, ease.soft]])
  const z = track(f, [[V.all - 1, -500], [V.all + 10, -260, ease.out], [V.card + 16, 40, ease.linear]])
  const lines = [
    { text: 'ALL ON YOUR OWN', at: V.all },
    { text: 'GRAPHICS CARD.', at: V.graphics },
  ]
  const words = (text: string, at: number) =>
    text.split(' ').map((w, i) => {
      const t = prog(f, at + i * 3, at + i * 3 + 9, ease.out)
      return (
        <span key={i} style={{ display: 'inline-block', marginRight: '0.22em', transform: `translateY(${(1 - t) * 70}%)`, opacity: clamp(t * 2.5) }}>
          {w}
        </span>
      )
    })
  return (
    <AbsoluteFill style={{ background: NIGHT, overflow: 'hidden' }}>
      <AbsoluteFill style={{ perspective: 1700, perspectiveOrigin: '50% 40%' }}>
        <div
          style={{
            position: 'absolute',
            left: W / 2 + 160 - PACKAGE / 2,
            top: H / 2 - 80 - PACKAGE / 2,
            width: PACKAGE,
            height: PACKAGE,
            transform: `translateZ(${z}px) rotateX(${tilt}deg) rotateZ(${spin}deg)`,
          }}
        >
          <Package />
          <Die f={f} />
        </div>
      </AbsoluteFill>
      {/* Las lecturas de la máquina, a la derecha */}
      <div style={{ position: 'absolute', right: 96, top: 96, display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'flex-end' }}>
        {READOUTS.map(([k, v], i) => {
          const t = prog(f, V.all + 4 + i * 4, V.all + 12 + i * 4)
          return (
            <div key={k} style={{ display: 'flex', alignItems: 'baseline', gap: 16, opacity: t, transform: `translateX(${(1 - t) * 30}px)` }}>
              <span style={mono(15, rgba(PAPER, 0.5))}>{k}</span>
              <span style={{ ...mono(30, k === 'NETWORK' ? RED : PAPER), textShadow: k === 'NETWORK' ? `0 0 18px ${rgba(RED, 0.6)}` : undefined }}>{v}</span>
            </div>
          )
        })}
      </div>
      {/* El texto, abajo a la izquierda, sobre una sombra para que se lea encima del chip */}
      <AbsoluteFill style={{ background: 'linear-gradient(0deg, rgba(10,10,10,0.92) 0%, rgba(10,10,10,0.5) 34%, rgba(10,10,10,0) 58%)' }} />
      <div style={{ ...face(900, 100), position: 'absolute', left: 92, bottom: 78, fontSize: 150, lineHeight: 0.88, letterSpacing: '-0.035em', color: PAPER }}>
        {lines.map(l => (
          <div key={l.text} style={{ overflow: 'hidden', paddingBottom: 6 }}>
            {words(l.text, l.at)}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  )
}
