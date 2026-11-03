import { ArrowUpRight } from 'lucide-react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { face, INK, label, mono, PAPER, RED, W } from '../brand'
import { clamp, ease, mix, prog, spring } from '../lib/motion'
import { TOTAL, V } from '../timing'

// 12. «Free, in your browser.»: las doce columnas de la retícula caen una tras otra y el negro de la firma se vuelve
// el papel de la landing. «FREE,» llega en la expandida y «IN YOUR BROWSER.» en la condensada, como MESH y MIND; el
// disco rojo entra rodando por la derecha con su malla y la señal dentro. Abajo, la dirección y el botón de la app.
// El cierre no se queda quieto: la señal sigue corriendo y la cámara sigue acercándose hasta el último fotograma

export const FROM = V.free - 13
const DISC = { x: 1452, y: 560, r: 300 }
const NODES = [[40, 205], [120, 115], [150, 245], [230, 165], [300, 255], [320, 105]]
const EDGES = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [1, 5], [2, 4]]

function Disc({ f }: { f: number }) {
  const roll = spring(f - (V.in - 6), { freq: 0.07, damping: 0.55 })
  const x = mix(W + DISC.r + 40, DISC.x, roll)
  const s = (DISC.r * 2) / 360
  return (
    <div style={{ position: 'absolute', left: x - DISC.r, top: DISC.y - DISC.r, width: DISC.r * 2, height: DISC.r * 2, transform: `rotate(${(1 - roll) * 140}deg)` }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: RED }} />
      <svg viewBox="0 0 360 360" width={DISC.r * 2} height={DISC.r * 2} style={{ position: 'absolute', inset: 0 }}>
        {EDGES.map(([a, b], i) => {
          const run = ((f - V.in - i * 4) / 30) % 1
          const [x1, y1] = NODES[a]
          const [x2, y2] = NODES[b]
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={PAPER} strokeOpacity={0.7} strokeWidth={2 / s} />
              {run > 0 && <circle cx={x1 + (x2 - x1) * run} cy={y1 + (y2 - y1) * run} r={3.6} fill={PAPER} />}
            </g>
          )
        })}
        {NODES.map(([nx, ny], i) => (
          <rect key={i} x={nx - 7} y={ny - 7} width={14} height={14} fill={RED} stroke={PAPER} strokeWidth={1.8} />
        ))}
      </svg>
    </div>
  )
}

const rise = (f: number, at: number, len = 9) => {
  const t = prog(f, at, at + len, ease.out)
  return { transform: `translateY(${(1 - t) * 104}%)`, display: 'inline-block' as const }
}

export function End() {
  const f = useCurrentFrame()
  // Las doce columnas caen de izquierda a derecha, un fotograma cada una
  const cols = Array.from({ length: 12 }, (_, i) => prog(f, FROM + i * 0.5, FROM + 6 + i * 0.5, ease.drama))
  const push = mix(1, 1.03, prog(f, V.free, TOTAL, ease.linear))
  const ui = prog(f, V.lastBrowser + 6, V.lastBrowser + 16, ease.out)
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AbsoluteFill style={{ display: 'flex' }}>
        {cols.map((c, i) => (
          <div key={i} style={{ flex: 1, height: '100%', background: PAPER, transform: `scaleY(${c})`, transformOrigin: 'top' }} />
        ))}
      </AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: '50% 50%' }}>
        <div style={{ position: 'absolute', left: 92, right: 92, top: 0, bottom: 0, display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', columnGap: 24, opacity: prog(f, FROM + 8, FROM + 16) }}>
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} style={{ borderLeft: '1px solid rgba(17,17,17,0.08)', borderRight: '1px solid rgba(17,17,17,0.08)' }} />
          ))}
        </div>
        <Disc f={f} />
        <div style={{ position: 'absolute', left: 99, top: 200, color: INK }}>
          <div style={{ ...face(900, 125), fontSize: 330, lineHeight: 0.8, letterSpacing: '-0.04em', overflow: 'hidden', paddingBottom: 10 }}>
            <span style={rise(f, V.free - 1, 8)}>FREE,</span>
          </div>
          <div style={{ ...face(900, 64), fontSize: 236, lineHeight: 0.82, letterSpacing: '-0.03em', overflow: 'hidden', marginTop: 14, display: 'flex', gap: '0.22em', paddingLeft: 15 }}>
            <span style={rise(f, V.in - 1)}>IN</span>
            <span style={rise(f, V.yourBrowser - 1)}>YOUR</span>
            <span style={rise(f, V.lastBrowser - 1)}>BROWSER.</span>
          </div>
        </div>
      </AbsoluteFill>
      {/* La cabecera y el pie de la landing: la firma, el botón de la app y la dirección */}
      <div style={{ position: 'absolute', left: 96, top: 64, opacity: ui, transform: `translateY(${(1 - ui) * -12}px)`, lineHeight: 1.25 }}>
        <div style={{ ...face(800, 100), fontSize: 30, color: INK, letterSpacing: '-0.01em' }}>MeshMind</div>
        <div style={{ ...face(400, 100), fontSize: 30, color: '#555' }}>Local AI flows</div>
      </div>
      <div style={{ position: 'absolute', right: 96, top: 66, opacity: ui, transform: `translateY(${(1 - ui) * -12}px)`, display: 'flex', alignItems: 'center', gap: 12, height: 64, padding: '0 28px', background: INK, color: PAPER, ...face(700, 100), fontSize: 26 }}>
        Open the app
        <ArrowUpRight size={28} />
      </div>
      <div style={{ position: 'absolute', left: 96, right: 96, bottom: 64, display: 'flex', alignItems: 'flex-end', opacity: ui, transform: `translateY(${(1 - ui) * 16}px)` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={label(15, '#555')}>Try it now</span>
          <span style={{ ...mono(36, INK), letterSpacing: '-0.01em', borderBottom: `3px solid ${RED}`, paddingBottom: 6 }}>delriodevelops.github.io/meshmind</span>
        </div>
        <span style={{ ...mono(16, '#555'), marginLeft: 'auto', lineHeight: 1.6, textAlign: 'right', whiteSpace: 'pre' }}>{'NO SERVER · NO ACCOUNT · NO API KEY\nCHROME OR EDGE WITH WEBGPU'}</span>
      </div>
      {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y], i) => (
        <span key={i} style={{ position: 'absolute', [x ? 'right' : 'left']: 22, [y ? 'bottom' : 'top']: 22, width: 22, height: 22, [x ? 'borderRight' : 'borderLeft']: `2px solid ${INK}`, [y ? 'borderBottom' : 'borderTop']: `2px solid ${INK}`, opacity: clamp(ui) }} />
      ))}
    </AbsoluteFill>
  )
}

