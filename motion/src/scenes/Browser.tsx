import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { EASE, FONT, INK, label, PAPER, RED, tween, W, wirePath } from '../brand'
import { T } from '../timing'

// 4. «Wire AI models into flows, right in your browser.» Primero, muy cerca, los nodos aparecen y los cables se
// conectan; la señal roja corre hasta la respuesta. Al decir «right in your browser» la cámara se aleja y se ve la
// ventana del navegador con la dirección
export const BROWSER_LENGTH = T.think - T.flow
const PULL = T.browser - T.flow

// El lienzo dentro de la ventana, en sus propias coordenadas (1600 × 760)
const NW = 330
const NH = 150
const NODES: Record<string, { x: number; y: number; kind: string; name: string; dark?: boolean; at: number }> = {
  message: { x: 40, y: 305, kind: 'Message', name: 'A bakery run by a fox', at: 0 },
  researcher: { x: 520, y: 60, kind: 'Assistant', name: 'Researcher', at: 6 },
  designer: { x: 520, y: 305, kind: 'Assistant', name: 'Designer', at: 9 },
  critic: { x: 520, y: 550, kind: 'Assistant', name: 'Critic', at: 12 },
  answer: { x: 1000, y: 305, kind: 'Answer', name: 'One clear reply', dark: true, at: 18 },
}
const WIRES: [string, string, number][] = [
  ['message', 'researcher', 14], ['message', 'designer', 16], ['message', 'critic', 18],
  ['researcher', 'answer', 30], ['designer', 'answer', 32], ['critic', 'answer', 34],
]

export function Browser() {
  const f = useCurrentFrame()
  // Cámara: muy cerca del lienzo; se aleja en «right in your browser»
  const pull = tween(f, PULL - 6, PULL + 14, 0, 1, EASE.inOut)
  const zoom = 1.4 - pull * 0.4
  const enter = tween(f, 0, 8, 0, 1, EASE.out)
  // La barra con la dirección entra cuando la ventana ya casi está en su sitio (si no, pisa el título) y cae en «browser.»
  const chrome = tween(f, PULL + 8, PULL + 16)

  return (
    <AbsoluteFill style={{ background: PAPER, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 160, top: 140, width: 1600, height: 840, transformOrigin: '30% 55%', transform: `scale(${zoom * (0.92 + enter * 0.08)})` }}>
        {/* La ventana: barra con la dirección y el marco */}
        <div style={{ position: 'absolute', inset: 0, border: `4px solid ${INK}`, opacity: chrome }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 80, borderBottom: `4px solid ${INK}`, display: 'flex', alignItems: 'center', gap: 24, padding: '0 28px', boxSizing: 'border-box', opacity: chrome }}>
          <span style={{ width: 18, height: 18, borderRadius: '50%', background: RED }} />
          <span style={{ fontFamily: FONT, fontSize: 34, fontWeight: 600 }}>delriodevelops.github.io/meshmind</span>
        </div>
        <div style={{ position: 'absolute', left: 0, top: 80 }}>
          <svg width={1600} height={760} style={{ position: 'absolute', inset: 0, overflow: 'visible' }} fill="none" stroke={INK} strokeWidth={4}>
            {WIRES.map(([a, b, start]) => {
              const p = NODES[a]
              const q = NODES[b]
              const wire = wirePath(p.x + NW, p.y + NH / 2, q.x, q.y + NH / 2)
              const t = tween(f, start, start + 12, 0, 1, EASE.soft)
              const [x, y] = wire.at(t)
              return (
                <g key={`${a}-${b}`}>
                  <path d={wire.d} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - t} />
                  {t > 0 && t < 1 && <circle cx={x} cy={y} r={14} fill={RED} stroke="none" />}
                </g>
              )
            })}
          </svg>
          {Object.entries(NODES).map(([id, n]) => {
            const pop = tween(f, n.at, n.at + 6, 0, 1, EASE.out)
            const typed = id === 'answer' ? tween(f, 44, 54, 0, 1, EASE.soft) : 1
            const think = id === 'researcher' || id === 'designer' || id === 'critic' ? tween(f, 24 + (n.at - 6) / 2, 36 + (n.at - 6) / 2, 0, 1, EASE.soft) : 0
            return (
              <div key={id} style={{ position: 'absolute', left: n.x, top: n.y, width: NW, height: NH, boxSizing: 'border-box', border: `4px solid ${INK}`, background: n.dark ? INK : PAPER, color: n.dark ? PAPER : INK, padding: 22, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden', transform: `scale(${0.7 + pop * 0.3})`, opacity: pop }}>
                <span style={{ ...label, fontSize: 24, color: 'inherit' }}>{n.kind}</span>
                <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: id === 'message' || id === 'answer' ? 36 : 44, lineHeight: 1.05, clipPath: `inset(0 ${(1 - typed) * 100}% 0 0)` }}>{n.name}</span>
                {think > 0 && <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 12, background: RED, transform: `scaleX(${think})`, transformOrigin: 'left' }} />}
              </div>
            )
          })}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 160, top: 50, display: 'flex', alignItems: 'baseline', gap: 28, opacity: tween(f, 2, 8) }}>
        <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 64, letterSpacing: '-0.04em', textTransform: 'uppercase' }}>Wire models into flows</span>
      </div>
      {/* La banda roja que tapa el corte hacia los verbos entra por la izquierda */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: tween(f, BROWSER_LENGTH - 8, BROWSER_LENGTH - 1, -W, 0, EASE.in), width: W, background: RED }} />
    </AbsoluteFill>
  )
}
