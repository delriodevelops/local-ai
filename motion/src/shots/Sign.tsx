import { measureText } from '@remotion/layout-utils'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { face, FONT, H, label, NIGHT, PAPER, RED, W } from '../brand'
import { rgba } from '../fx/Glow'
import { clamp, ease, impulse, mix, prog } from '../lib/motion'
import { V } from '../timing'

// 11. «MeshMind.»: la música calla un compás entero (579-638) y en ese silencio la firma: «MeshMind» en papel sobre
// negro y, de punto final, el rojo que se acaba de cerrar. Las letras suben de una en una y el punto late al acabar
// la palabra, con el único golpecito de esta parte

const SIZE = 250
const SPACING = -0.035
const GAP = 22

// El punto: se calcula con la letra ya cargada (las tomas solo se pintan cuando lo está), para que el rojo de la
// toma anterior se cierre justo donde va
let layout: { left: number; base: number; width: number; dot: { x: number; y: number; r: number } } | undefined
export function sign() {
  if (!layout) {
    const width = measureText({ text: 'MeshMind', fontFamily: 'Archivo', fontSize: SIZE, fontWeight: '800', letterSpacing: `${SPACING}em` }).width
    const r = 27
    const left = (W - (width + GAP + r * 2)) / 2
    const base = H / 2 + SIZE * 0.36
    layout = { left, base, width, dot: { x: left + width + GAP + r, y: base - r, r } }
  }
  return layout
}
export const DOT = {
  get x() {
    return sign().dot.x
  },
  get y() {
    return sign().dot.y
  },
  get r() {
    return sign().dot.r
  },
}

export function Sign() {
  const f = useCurrentFrame()
  const { left, base, dot } = sign()
  const pulse = 1 + 0.32 * Math.sin(Math.PI * clamp((f - (V.signEnd - 4)) / 8)) * (f >= V.signEnd - 4 ? 1 : 0)
  const ripple = prog(f, V.signEnd - 2, V.signEnd + 18, ease.out)
  const push = mix(1, 1.035, prog(f, V.sign - 6, V.free, ease.linear))
  return (
    <AbsoluteFill style={{ background: NIGHT, overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: `${W / 2}px ${H / 2}px` }}>
        <div style={{ position: 'absolute', left, top: base - SIZE * 0.86, height: SIZE * 1.02, overflow: 'hidden', display: 'flex' }}>
          {'MeshMind'.split('').map((ch, i) => {
            const t = prog(f, V.sign - 2 + i * 1.6, V.sign + 8 + i * 1.6, ease.out)
            return (
              <span key={i} style={{ ...face(800, 100), fontSize: SIZE, lineHeight: 1, letterSpacing: `${SPACING}em`, color: PAPER, display: 'inline-block', transform: `translateY(${(1 - t) * 105}%)` }}>
                {ch}
              </span>
            )
          })}
        </div>
        {ripple > 0 && ripple < 1 && <span style={{ position: 'absolute', left: dot.x, top: dot.y, width: 0, height: 0 }}><span style={{ position: 'absolute', left: -dot.r * (1 + ripple * 4), top: -dot.r * (1 + ripple * 4), width: dot.r * 2 * (1 + ripple * 4), height: dot.r * 2 * (1 + ripple * 4), borderRadius: '50%', border: `2px solid ${rgba(RED, 1 - ripple)}` }} /></span>}
        <span style={{ position: 'absolute', left: dot.x - dot.r, top: dot.y - dot.r, width: dot.r * 2, height: dot.r * 2, borderRadius: '50%', background: RED, transform: `scale(${pulse})`, boxShadow: `0 0 ${40 + 60 * impulse(f, V.signEnd, 8)}px ${rgba(RED, 0.55)}` }} />
        <div style={{ ...label(20, rgba(PAPER, 0.55)), fontFamily: FONT, position: 'absolute', left: left + 8, top: base + 52, opacity: prog(f, V.sign + 10, V.sign + 20), letterSpacing: '0.3em' }}>Local AI flows</div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
