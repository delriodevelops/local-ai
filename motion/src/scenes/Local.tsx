import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { display, EASE, INK, label, MARGIN, PAPER, RED, tween } from '../brand'
import { T } from '../timing'

// 6. «All on your own graphics card. No server. No account. No API key.» Fondo de tinta. La gráfica y el procesador
// se llenan a la vez, en paralelo; luego los tres «No» caen uno debajo de otro y el anterior se apaga. Al final aparece
// el disco rojo pequeño en el centro, que abre la escena siguiente
export const LOCAL_LENGTH = T.iris - T.local
const NOS = [T.noServer, T.noAccount, T.noKey].map(t => t - T.local)
const LINES = ['No server.', 'No account.', 'No API key.']

export function Local() {
  const f = useCurrentFrame()
  const lanes = 1 - tween(f, NOS[0] - 6, NOS[0], 0, 1, EASE.in)
  const disc = tween(f, LOCAL_LENGTH - 12, LOCAL_LENGTH, 0, 1, EASE.out)

  return (
    <AbsoluteFill style={{ background: INK, overflow: 'hidden' }}>
      {/* La gráfica y el procesador trabajando a la vez */}
      <div style={{ position: 'absolute', left: MARGIN, right: MARGIN, top: 250, opacity: lanes, transform: `translateY(${(1 - lanes) * -60}px)` }}>
        <div style={{ ...display, color: PAPER, fontSize: 150, marginBottom: 70 }}>Your own <span style={{ color: RED }}>GPU</span></div>
        {[
          { name: 'Graphics card', color: RED, from: 4, to: 40 },
          { name: 'Processor', color: PAPER, from: 10, to: 46 },
        ].map(lane => (
          <div key={lane.name} style={{ display: 'flex', alignItems: 'center', gap: 32, marginBottom: 28 }}>
            <span style={{ ...label, color: '#bdbdb8', fontSize: 36, width: 360 }}>{lane.name}</span>
            <div style={{ flex: 1, height: 64, background: '#2a2a2a' }}>
              <div style={{ height: '100%', background: lane.color, transform: `scaleX(${tween(f, lane.from, lane.to, 0, 1, EASE.soft)})`, transformOrigin: 'left' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Los tres «No»: cada uno cae debajo del anterior, que se apaga */}
      <div style={{ position: 'absolute', left: MARGIN, top: 230, opacity: 1 - tween(f, LOCAL_LENGTH - 12, LOCAL_LENGTH - 2) }}>
        {LINES.map((line, i) => {
          const p = tween(f, NOS[i], NOS[i] + 6, 0, 1, EASE.out)
          const dim = i < 2 && f >= NOS[i + 1] ? 0.35 : 1
          return (
            <div key={line} style={{ ...display, color: PAPER, fontSize: 200, lineHeight: 0.9, opacity: p * dim, transform: `translateX(${(1 - p) * -120}px) scale(${1.25 - p * 0.25})`, transformOrigin: 'left center' }}>
              <span style={{ color: RED }}>No</span>{line.slice(2)}
            </div>
          )
        })}
      </div>

      {disc > 0 && <div style={{ position: 'absolute', left: 960 - 60 * disc, top: 540 - 60 * disc, width: 120 * disc, height: 120 * disc, borderRadius: '50%', background: RED }} />}
    </AbsoluteFill>
  )
}
