import { useLayoutEffect, useRef } from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { H, mono, NIGHT, PAPER, RED, W } from '../brand'
import { Glow, rgba } from '../fx/Glow'
import { clamp, ease, impulse, prog, rand, shake, track, tween } from '../lib/motion'
import { V } from '../timing'
import { LAUNCH } from './Prompts'

// 2. «goes to someone else's server.»: seguimos al punto rojo por el pasillo de un centro de datos, entre dos paredes
// de racks con miles de luces que pasan a toda velocidad. Al fondo, la pared del final; el punto entra en una ranura
// y el servidor apunta tu pregunta en su registro. Luego la música se va (88) y solo queda esa línea, guardada en un
// sitio que no es tuyo.
//
// Las luces se pintan en un canvas con una cámara de agujero hecha a mano: son miles y el desenfoque de movimiento
// pinta cada fotograma diez veces

export const START = LAUNCH + 6
export const IMPACT = V.server + 3
const VOID = 88
const END_Z = -14000
const AISLE = 760
const EYE = 520
const FOCAL = 900
const TOP = 2300

type Cam = { z: number; roll: number }

function project(cam: Cam, x: number, y: number, z: number) {
  const d = cam.z - z
  if (d < 40) return null
  const k = FOCAL / d
  return { x: W / 2 + x * k, y: H / 2 - (y - EYE) * k, k }
}

const RACK = 560
const COLS = 3
const ROWS = 34

// Una luz de un rack: parpadea a su ritmo; unas pocas son rojas. Tras el vacío se quedan quietas
function led(seed: number, f: number) {
  const rate = 3 + Math.floor(rand(seed) * 10)
  const on = Math.floor((f + rand(seed * 7.1) * 50) / rate) % 3 !== 0
  return { level: f >= VOID ? 0.3 : on ? 0.95 : 0.18, red: rand(seed * 3.3) > 0.965 }
}

// Las dos paredes, la del fondo con la ranura, y el destello que corre desde la ranura tras el impacto
function draw(ctx: CanvasRenderingContext2D, cam: Cam, f: number, bloom: boolean) {
  ctx.clearRect(0, 0, W, H)
  const lit = f - IMPACT
  for (const side of [-1, 1]) {
    for (let r = 0; r < 26; r++) {
      const z0 = -200 - r * RACK
      if (z0 > cam.z - 40 || z0 < END_Z) continue
      for (let c = 0; c < COLS; c++) {
        const z = z0 - 90 - c * 150
        for (let row = 0; row < ROWS; row++) {
          const y = 120 + row * 62
          const p = project(cam, side * AISLE, y, z)
          if (!p) continue
          const { level, red } = led(side * 1000 + r * 97 + c * 13 + row, f)
          const fade = clamp(1 - (cam.z - z) / 13000)
          const s = Math.max(1.2, 9 * p.k)
          ctx.globalAlpha = level * (0.25 + 0.75 * fade)
          ctx.fillStyle = red ? RED : PAPER
          ctx.fillRect(p.x - s / 2, p.y - s * 0.3, s, s * 0.6)
        }
      }
      // El canto de cada rack, una raya vertical oscura que se ve pasar
      if (!bloom) {
        const a = project(cam, side * AISLE, TOP, z0)
        const b = project(cam, side * AISLE, 0, z0)
        if (a && b) {
          ctx.globalAlpha = 0.5
          ctx.strokeStyle = '#2a2a2a'
          ctx.lineWidth = Math.max(1, 5 * a.k)
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }
    }
  }
  // La pared del fondo: racks de frente, con la ranura en el centro a la altura de los ojos
  for (let r = -2; r <= 2; r++) {
    for (let c = 0; c < 6; c++) {
      for (let row = 0; row < ROWS; row++) {
        const x = r * 300 + (c - 2.5) * 40
        const y = 120 + row * 62
        const p = project(cam, x, y, END_Z)
        if (!p) continue
        const { level, red } = led(5000 + r * 131 + c * 17 + row, f)
        const dist = Math.hypot(x, y - EYE)
        const wave = lit > 0 ? Math.max(0, 1 - Math.abs(dist - lit * 120) / 90) * Math.exp(-lit / 14) : 0
        const s = Math.max(1.2, 9 * p.k)
        ctx.globalAlpha = Math.min(1, level * 0.8 + wave)
        ctx.fillStyle = red || wave > 0.35 ? RED : PAPER
        ctx.fillRect(p.x - s / 2, p.y - s * 0.3, s, s * 0.6)
      }
    }
  }
  ctx.globalAlpha = 1
}

// El brillo se pinta a un tercio de la resolución y se estira: el desenfoque lo iguala y ocupa nueve veces menos
// memoria, que cuenta cuando el desenfoque de movimiento pinta el pasillo dieciocho veces
const GLOW = 3

function Aisle({ cam, f }: { cam: Cam; f: number }) {
  const sharp = useRef<HTMLCanvasElement>(null)
  const glow = useRef<HTMLCanvasElement>(null)
  useLayoutEffect(() => {
    const a = sharp.current?.getContext('2d')
    const b = glow.current?.getContext('2d')
    if (a) draw(a, cam, f, false)
    if (b) {
      b.setTransform(1 / GLOW, 0, 0, 1 / GLOW, 0, 0)
      draw(b, cam, f, true)
    }
  }, [cam, f])
  return (
    <>
      <canvas ref={glow} width={W / GLOW} height={H / GLOW} style={{ position: 'absolute', inset: 0, width: W, height: H, filter: 'blur(3px)', mixBlendMode: 'screen', opacity: 0.9 }} />
      <canvas ref={sharp} width={W} height={H} style={{ position: 'absolute', inset: 0 }} />
    </>
  )
}

// El suelo de rejilla y las bandejas de cable del techo, en líneas que corren hacia el fondo
function Lines({ cam }: { cam: Cam }) {
  const lines: [number, number, number, number, number][] = []
  for (let z = Math.floor((cam.z - 60) / 400) * 400; z > END_Z; z -= 400) {
    const a = project(cam, -AISLE, 0, z)
    const b = project(cam, AISLE, 0, z)
    if (a && b) lines.push([a.x, a.y, b.x, b.y, 0.16 * clamp(1 - (cam.z - z) / 12000)])
    const c = project(cam, -AISLE, TOP, z)
    const d = project(cam, AISLE, TOP, z)
    if (c && d) lines.push([c.x, c.y, d.x, d.y, 0.08 * clamp(1 - (cam.z - z) / 12000)])
  }
  for (const x of [-AISLE, -AISLE / 2, 0, AISLE / 2, AISLE]) {
    for (const y of [0, TOP]) {
      const a = project(cam, x, y, cam.z - 60)
      const b = project(cam, x, y, END_Z)
      if (a && b) lines.push([a.x, a.y, b.x, b.y, 0.1])
    }
  }
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
      {lines.map(([x1, y1, x2, y2, o], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={PAPER} strokeOpacity={o} strokeWidth={1.2} />
      ))}
    </svg>
  )
}

const signalZ = (f: number) => track(f, [[START - 2, -700], [START + 6, -3600, ease.in], [START + 19, -12400, ease.linear], [IMPACT, END_Z, ease.out]])

// Lo que el servidor apunta: tu pregunta, de quién es y cuánto tiempo se queda
const LOG = [
  ['POST', '/v1/chat/completions', '200 OK'],
  ['user', '8f3a-42c1-9be0', ''],
  ['prompt', '"explain my blood test results"', ''],
  ['stored', '30 days', ''],
]

export function Server() {
  const f = useCurrentFrame()
  const z = track(f, [[START - 2, 0], [START + 5, -1600, ease.in], [START + 18, -10200, ease.linear], [IMPACT + 3, -12450, ease.out], [VOID, -12900, ease.soft], [V.not, -13300, ease.linear]])
  const roll = track(f, [[START - 2, -2.5], [START + 14, 1.5, ease.soft], [IMPACT + 4, 0, ease.soft]])
  const cam = { z, roll }
  const [sx, sy] = shake(f, IMPACT, 12, 5)
  const sig = project(cam, 0, EYE - 40, signalZ(f))
  const slot = project(cam, 0, EYE, END_Z)
  const dim = prog(f, VOID - 2, VOID + 8, ease.soft)
  const rows = LOG.map((_, i) => prog(f, IMPACT + 4 + i * 3, IMPACT + 9 + i * 3, ease.out))
  const dist = Math.round(tween(f, START - 2, IMPACT, 0, 8214, ease.in))
  return (
    <AbsoluteFill style={{ background: NIGHT, overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px) rotate(${roll}deg) scale(1.06)` }}>
        {/* El fondo del pasillo brilla frío: la luz de un sitio enorme que no es tuyo */}
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 30% 34% at 50% 50%, rgba(205,214,222,${0.09 + 0.08 * prog(f, START, IMPACT)}), rgba(0,0,0,0) 70%)` }} />
        <AbsoluteFill style={{ opacity: 1 - 0.86 * dim }}>
          <Lines cam={cam} />
          <Aisle cam={cam} f={f} />
        </AbsoluteFill>
        {sig && f < IMPACT && (
          <>
            <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
              <line x1={W / 2} y1={H + 40} x2={sig.x} y2={sig.y} stroke={RED} strokeWidth={2} strokeOpacity={0.55} />
            </svg>
            <Glow x={sig.x} y={sig.y} size={Math.max(10, 40 * sig.k)} power={1.6} streak={1.4} />
          </>
        )}
        {slot && f >= IMPACT - 1 && (
          <>
            <div style={{ position: 'absolute', left: slot.x - 90 * slot.k, top: slot.y - 10 * slot.k, width: 180 * slot.k, height: 20 * slot.k, background: RED, boxShadow: `0 0 ${50 * slot.k}px ${rgba(RED, 0.9)}`, opacity: 0.55 + 0.45 * impulse(f, IMPACT, 10) }} />
            <Glow x={slot.x} y={slot.y} size={80 * slot.k} power={1.8 * impulse(f, IMPACT, 7)} streak={1.6} />
          </>
        )}
        {/* El registro, en la pantalla del rack, encima de la ranura */}
        {slot && f >= IMPACT + 3 && (
          <div style={{ position: 'absolute', left: slot.x, top: slot.y, transform: `scale(${slot.k}) translate(-50%, -112%)`, transformOrigin: '0 0', width: 1180 }}>
            <div style={{ background: 'rgba(8,8,8,0.94)', border: `2px solid ${rgba(PAPER, 0.22 - 0.12 * dim)}`, padding: '26px 34px', boxShadow: '0 40px 140px rgba(0,0,0,0.8)' }}>
              <div style={{ ...mono(20, rgba(PAPER, 0.42)), letterSpacing: '0.18em', marginBottom: 16, opacity: 1 - 0.6 * dim }}>SOMEONE ELSE'S SERVER · REQUEST LOG</div>
              {LOG.map(([k, v, s], i) => (
                <div key={k} style={{ ...mono(34, PAPER), lineHeight: 1.6, opacity: rows[i] * (i === 2 ? 1 : 1 - 0.78 * dim), display: 'flex', gap: 26 }}>
                  <span style={{ width: 130, color: rgba(PAPER, 0.45) }}>{k}</span>
                  <span style={{ color: i === 2 ? PAPER : rgba(PAPER, 0.8), clipPath: `inset(0 ${100 - rows[i] * 100}% 0 0)`, textShadow: i === 2 ? `0 0 ${24 * dim}px ${rgba(PAPER, 0.65)}` : undefined }}>{v}</span>
                  {s && <span style={{ marginLeft: 'auto', color: rgba(PAPER, 0.45) }}>{s}</span>}
                  {i === 3 && f >= VOID && Math.floor(f / 6) % 2 === 0 && <span style={{ width: 20, background: RED, boxShadow: `0 0 20px ${RED}` }} />}
                </div>
              ))}
            </div>
          </div>
        )}
      </AbsoluteFill>
      {/* El contador de distancia, como el de la landing */}
      <div style={{ position: 'absolute', left: 96, bottom: 76, display: 'flex', alignItems: 'baseline', gap: 18, opacity: 1 - dim }}>
        <span style={mono(15, rgba(PAPER, 0.5))}>DISTANCE</span>
        <span style={{ ...mono(46, PAPER), letterSpacing: '-0.01em' }}>{dist.toLocaleString('en-US')} KM</span>
      </div>
      <div style={{ position: 'absolute', right: 96, bottom: 80, ...mono(15, rgba(PAPER, 0.5)), opacity: 1 - dim }}>→ SOMEONE ELSE'S SERVER</div>
    </AbsoluteFill>
  )
}
