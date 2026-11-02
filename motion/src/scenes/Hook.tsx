import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { display, EASE, FONT, Grid, INK, label, MARGIN, PAPER, RED, tween } from '../brand'
import { T, VO_START } from '../timing'

// 1. «Every prompt you type goes to someone else's server.» Lo que escribes aparece en una barra de chat; al decir
// «goes to», se convierte en una ficha roja que sale disparada hacia una caja negra, el servidor de otro, que se la traga.
// Al final el disco rojo entra, aplasta la caja y lo llena todo
const TYPED = 'Every prompt you type'
const BOX = { x: 1180, y: 330, w: 620, h: 420 }

export function Hook() {
  const f = useCurrentFrame()
  const typed = Math.floor(TYPED.length * tween(f, VO_START - 2, VO_START + 30, 0, 1, (t: number) => t))
  const caret = Math.floor(f / 8) % 2 === 0
  const box = tween(f, 38, 50, 0, 1, EASE.out)
  // La ficha: sale de la barra y entra en la caja
  const shoot = tween(f, 48, 66, 0, 1, EASE.in)
  const swallowed = f > 66
  const tokenX = MARGIN + 40 + shoot * (BOX.x + BOX.w / 2 - MARGIN - 200)
  const tokenScale = 1 - shoot * 0.55
  // El disco: entra rodando desde la derecha, aplasta la caja y crece hasta cubrir la pantalla
  const roll = tween(f, 80, 92, 0, 1, EASE.in)
  const flood = tween(f, 90, T.not, 0, 1, EASE.in)
  const cx = BOX.x + BOX.w / 2 + (1 - roll) * 1100
  const r = 260 + flood * 1900
  const shake = f >= 92 && f < 98 ? Math.sin(f * 7) * 6 : 0

  return (
    <AbsoluteFill style={{ background: PAPER, transform: `translate(${shake}px, ${shake / 2}px)` }}>
      <Grid frame={f} />
      {/* La barra de chat */}
      <div style={{ position: 'absolute', left: MARGIN, top: 430, width: 980, height: 150, border: `4px solid ${INK}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', padding: '0 36px', opacity: 1 - tween(f, 48, 56) }}>
        <span style={{ fontFamily: FONT, fontSize: 64, fontWeight: 700, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
          {TYPED.slice(0, typed)}
          <span style={{ display: 'inline-block', width: 5, height: 64, marginLeft: 6, verticalAlign: '-10%', background: RED, opacity: caret ? 1 : 0 }} />
        </span>
      </div>
      <div style={{ ...label, position: 'absolute', left: MARGIN, top: 390, opacity: 1 - tween(f, 48, 56) }}>Your prompt</div>

      {/* La ficha roja */}
      {f >= 48 && !swallowed && (
        <div style={{ position: 'absolute', left: tokenX, top: 470, height: 70, padding: '0 28px', background: RED, display: 'flex', alignItems: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 40, whiteSpace: 'nowrap', transform: `scale(${tokenScale})`, transformOrigin: 'left center' }}>
          Every prompt you type
        </div>
      )}

      {/* La caja negra: el servidor de otro */}
      <div style={{ position: 'absolute', left: BOX.x, top: BOX.y, width: BOX.w, height: BOX.h, background: INK, color: PAPER, padding: 36, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transform: `scale(${0.6 + box * 0.4 + (swallowed ? tween(f, 66, 74, 0.04, 0, EASE.out) : 0)})`, opacity: box, transformOrigin: 'center' }}>
        <span style={{ ...label, color: PAPER, fontSize: 32 }}>Someone else’s</span>
        <span style={{ ...display, color: PAPER, fontSize: 130 }}>Server</span>
      </div>

      {/* El disco */}
      {roll > 0 && <div style={{ position: 'absolute', left: cx - r, top: BOX.y + BOX.h / 2 - r, width: r * 2, height: r * 2, borderRadius: '50%', background: RED }} />}
    </AbsoluteFill>
  )
}
