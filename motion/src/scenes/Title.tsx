import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { display, EASE, FONT, Grid, label, MARGIN, PAPER, RED, tween } from '../brand'
import { T } from '../timing'

// 3. «This is MeshMind.» El rojo se recoge en el disco del cartel y las letras caen una a una con rebote;
// al acabar salen disparadas hacia los lados
export const TITLE_LENGTH = T.flow - T.title
const DISC = { x: 1560, y: 340, r: 190 }

export function Title() {
  const f = useCurrentFrame()
  const settle = tween(f, 0, 12, 0, 1, EASE.inOut)
  const x = 960 + (DISC.x - 960) * settle
  const y = 540 + (DISC.y - 540) * settle
  const r = 1300 + (DISC.r - 1300) * settle
  const out = tween(f, TITLE_LENGTH - 9, TITLE_LENGTH, 0, 1, EASE.in)
  const letters = 'MESHMIND'.split('')

  return (
    <AbsoluteFill style={{ background: PAPER }}>
      <Grid frame={f} at={2} />
      <div style={{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', background: RED, transform: `translateX(${out * 900}px)` }} />
      <div style={{ ...label, fontSize: 36, position: 'absolute', left: MARGIN, top: 300, opacity: tween(f, 2, 8) * (1 - out) }}>This is</div>
      <div style={{ position: 'absolute', left: MARGIN, top: 360, fontFamily: FONT, ...display, fontSize: 300, lineHeight: 0.8, whiteSpace: 'nowrap' }}>
        {letters.map((ch, i) => {
          const drop = tween(f, 6 + i * 2, 14 + i * 2, 0, 1, EASE.out)
          const side = i < 4 ? -1 : 1
          const away = out * side * (700 + Math.abs(i - 3.5) * 220)
          return <span key={i} style={{ display: 'inline-block', transform: `translate(${away}px, ${(1 - drop) * -260}px) rotate(${(1 - drop) * (i % 2 ? 8 : -8)}deg)`, opacity: drop }}>{ch}</span>
        })}
      </div>
      <div style={{ position: 'absolute', left: MARGIN, top: 640, fontFamily: FONT, fontSize: 52, fontWeight: 600, letterSpacing: '-0.015em', opacity: tween(f, 18, 26) * (1 - out) }}>AI flows that run in your browser.</div>
    </AbsoluteFill>
  )
}
