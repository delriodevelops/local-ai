import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { display, EASE, MARGIN, RED, tween } from '../brand'
import { T, at } from '../timing'

// 2. «Not anymore.» Todo rojo; las dos palabras caen como un sello, cada una con su golpe
export const NOT_LENGTH = T.title - T.not

function Slam({ f, at: start, children }: { f: number; at: number; children: string }) {
  const p = tween(f, start, start + 6, 0, 1, EASE.out)
  return <div style={{ ...display, fontSize: 280, transform: `translateY(${(1 - p) * -40}px) scale(${1.6 - p * 0.6})`, opacity: p, transformOrigin: 'left center' }}>{children}</div>
}

export function NotAnymore() {
  const f = useCurrentFrame()
  const second = at(3.16) - T.not
  const shake = (f < 4 || (f >= second && f < second + 4)) ? Math.sin(f * 9) * 8 : 0
  return (
    <AbsoluteFill style={{ background: RED }}>
      <AbsoluteFill style={{ justifyContent: 'center', paddingLeft: MARGIN, transform: `translate(${shake}px, 0)` }}>
        <Slam f={f} at={0}>Not</Slam>
        <Slam f={f} at={second}>anymore.</Slam>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
