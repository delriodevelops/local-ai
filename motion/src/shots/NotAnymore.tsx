import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { face, H, INK, NIGHT, PAPER, RED, W } from '../brand'
import { rgba } from '../fx/Glow'
import { clamp, ease, impulse, mix, prog, shake, spring, track } from '../lib/motion'
import { DROP, V } from '../timing'
import { DISC } from './Title'

// 3. «Not anymore.»: corte seco a negro y «NOT» a toda la altura, con la O hecha del disco rojo: la señal que vuelve.
// En el golpe de la música (DROP, en «anymore.») el disco se abre como un diafragma y se traga la pantalla; dentro,
// en tinta, «ANYMORE.» se estira a lo ancho. Luego el rojo se cierra hasta el disco del título, que espera detrás

const SIZE = 900
const R0 = 300
const CY = H / 2 + 10
export const CLOSE = V.this - 6

export function NotAnymore() {
  const f = useCurrentFrame()
  const slam = prog(f, V.not, V.not + 4, ease.out)
  const pop = spring(f - V.not, { freq: 0.16, damping: 0.42 })
  const open = prog(f, DROP, DROP + 8, ease.drama)
  const close = prog(f, CLOSE, CLOSE + 9, ease.drama)
  // El círculo rojo: en su sitio como la O, abierto hasta las esquinas, y cerrado sobre el disco del título
  const r = close > 0 ? mix(1300, DISC.r, close) : mix(R0 * pop, 1300, open)
  const cx = mix(W / 2, DISC.x, close)
  const cy = mix(CY, DISC.y, close)
  const [sx, sy] = shake(f, V.not, 22, 4)
  const [dx, dy] = shake(f, DROP, 30, 5)
  // N y T se apartan empujadas por el disco
  const push = open * 1100
  const word = prog(f, DROP + 3, DROP + 14, ease.out)
  const stretch = track(f, [[DROP + 3, 64], [DROP + 16, 116, ease.out], [CLOSE + 6, 122, ease.linear]])
  const flash = impulse(f, DROP, 3)
  const letter = { ...face(900, 62), position: 'absolute' as const, top: CY, fontSize: SIZE, lineHeight: 1, color: PAPER, transform: `translateY(-52%) scale(${mix(1.25, 1, slam)})`, filter: slam < 1 ? `blur(${(1 - slam) * 18}px)` : undefined, opacity: slam }
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {f < DROP + 10 && <AbsoluteFill style={{ background: NIGHT }} />}
      <AbsoluteFill style={{ transform: `translate(${sx + dx}px, ${sy + dy}px)` }}>
        {f < DROP + 10 && (
          <>
            <div style={{ ...letter, right: W / 2 + R0 + 26 + push, transformOrigin: '100% 50%' }}>N</div>
            <div style={{ ...letter, left: W / 2 + R0 + 26 + push, transformOrigin: '0% 50%' }}>T</div>
          </>
        )}
        {/* El halo del disco antes de abrirse: es una luz */}
        {f < DROP + 4 && <div style={{ position: 'absolute', left: W / 2 - R0 * 2, top: CY - R0 * 2, width: R0 * 4, height: R0 * 4, borderRadius: '50%', background: `radial-gradient(circle, ${rgba(RED, 0.35 * pop)} 30%, ${rgba(RED, 0)} 70%)`, mixBlendMode: 'screen' }} />}
        <AbsoluteFill style={{ clipPath: `circle(${Math.max(0, r)}px at ${cx}px ${cy}px)` }}>
          <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 70% at 50% 45%, #ff4a2e, ${RED} 55%, #e93218)` }} />
          {f >= DROP && (
            <div
              style={{
                ...face(900, stretch),
                position: 'absolute',
                left: 0,
                right: 0,
                top: CY,
                textAlign: 'center',
                fontSize: 238,
                lineHeight: 1,
                letterSpacing: '-0.02em',
                color: INK,
                transform: `translateY(-50%) translateY(${(1 - word) * 120}px) scale(${mix(0.92, 1, word) * mix(1, 0.4, close)})`,
                transformOrigin: `${cx}px 50%`,
                opacity: clamp(word * 2),
                filter: word < 1 ? `blur(${(1 - word) * 12}px)` : undefined,
              }}
            >
              ANYMORE.
            </div>
          )}
        </AbsoluteFill>
      </AbsoluteFill>
      {flash > 0.02 && <AbsoluteFill style={{ background: PAPER, opacity: flash * 0.5, mixBlendMode: 'screen' }} />}
    </AbsoluteFill>
  )
}
