import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { display, EASE, FONT, H, INK, MARGIN, MUTED, PAPER, RED, tween, W } from '../brand'
import { T } from '../timing'
import { IRIS_LENGTH, RedField } from './Iris'

// 8. «MeshMind. Free, in your browser.» El rojo sube en las doce columnas de la retícula llevándose la frase, y la
// firma cae letra a letra. Con «Free, in your browser» llegan la frase, la dirección (grande, en minúsculas: lo único
// que hay que recordar) y lo que hace falta; todo queda quieto casi seis segundos para poder leerlo
export const END_LENGTH = T.total - T.end
const FREE = T.free - T.end
const COLUMN = W / 12

export function EndCard() {
  const f = useCurrentFrame()
  const line = (start: number) => ({ opacity: tween(f, start, start + 8), transform: `translateY(${(1 - tween(f, start, start + 10)) * 30}px)` })
  const push = 1 + 0.03 * tween(f, 0, END_LENGTH, 0, 1, EASE.soft)

  return (
    <AbsoluteFill style={{ background: PAPER }}>
      <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: `${MARGIN}px 540px` }}>
        <div style={{ position: 'absolute', left: MARGIN, top: 200, ...display, fontSize: 280, lineHeight: 0.8, whiteSpace: 'nowrap' }}>
          {'MESHMIND'.split('').map((ch, i) => {
            const drop = tween(f, 2 + i * 1.5, 10 + i * 1.5, 0, 1, EASE.out)
            return <span key={i} style={{ display: 'inline-block', transform: `translateY(${(1 - drop) * -220}px)`, opacity: drop }}>{ch}</span>
          })}
          <span style={{ display: 'inline-block', width: 60, height: 60, marginLeft: 22, borderRadius: '50%', background: RED, transform: `scale(${tween(f, 16, 26, 0, 1, EASE.out)})` }} />
        </div>
        <div style={{ position: 'absolute', left: MARGIN, top: 500, fontFamily: FONT, fontSize: 64, fontWeight: 700, letterSpacing: '-0.02em', ...line(FREE) }}>Free, in your browser.</div>
        <div style={{ position: 'absolute', left: MARGIN, top: 610, fontFamily: FONT, fontSize: 72, fontWeight: 700, letterSpacing: '-0.01em', color: INK, ...line(FREE + 10) }}>
          delriodevelops.github.io/meshmind
          <div style={{ height: 8, marginTop: 10, background: RED, transform: `scaleX(${tween(f, FREE + 16, FREE + 34, 0, 1, EASE.out)})`, transformOrigin: 'left' }} />
        </div>
        <div style={{ position: 'absolute', left: MARGIN, top: 760, fontFamily: FONT, fontSize: 44, color: MUTED, ...line(FREE + 20) }}>No account · No API key · Open source · Chrome or Edge</div>
      </AbsoluteFill>

      {/* El campo rojo de la escena anterior, cortado en columnas que suben a destiempo */}
      {Array.from({ length: 12 }, (_, i) => {
        const lift = tween(f, i * 1.5, 14 + i * 1.5, 0, 1, EASE.inOut)
        if (lift >= 1) return null
        return (
          <div key={i} style={{ position: 'absolute', top: 0, left: i * COLUMN, width: COLUMN, height: H, overflow: 'hidden', transform: `translateY(${-lift * 101}%)` }}>
            <div style={{ position: 'absolute', top: 0, left: -i * COLUMN, width: W, height: H }}>
              <RedField f={IRIS_LENGTH + f} />
            </div>
          </div>
        )
      })}
    </AbsoluteFill>
  )
}
