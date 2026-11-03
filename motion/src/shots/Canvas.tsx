import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { H, mono, NIGHT, PAPER, W } from '../brand'
import { Cursor, EDGES, edgeKey, FLOW, portIn, portOut, type FlowId, type FlowState } from '../app/Flow'
import { GRAPH, inWindow, nodeCenter, APP, Window, ANSWER } from '../app/Window'
import { rgba } from '../fx/Glow'
import { clamp, ease, mix, prog, track, tween } from '../lib/motion'
import { V } from '../timing'

// 5 y 6. «Wire AI models into flows, right in your browser.»: la cámara está pegada al lienzo de la app, casi a ras.
// El ratón tira un cable del mensaje al primer asistente y encaja con «Wire»; los demás cables se tienden solos con
// la música. Con «flows,» la señal sale a la vez por los tres cables, los asistentes se encienden, el resumen los
// junta y llega la respuesta. Con «right in your browser.» la cámara se aleja de golpe y la app entera queda
// flotando en su ventana de navegador, con la respuesta escribiéndose en el chat

const DRAG_FROM = V.wire - 4
export const SNAP = V.wire + 9
export const RUN = V.flows

// Cuándo se tiende cada cable (tendido de 7 fotogramas) y cuándo pasa la señal
const LAY: Record<string, number> = { 'in-d': V.ai + 3, 'in-c': V.models + 1, 'r-s': V.models + 5, 'd-s': V.into, 'c-s': V.into + 3, 's-out': V.into + 7 }
const PASS: Record<string, [number, number]> = {
  'in-r': [RUN, RUN + 8],
  'in-d': [RUN + 1, RUN + 9],
  'in-c': [RUN + 2, RUN + 10],
  'r-s': [RUN + 18, RUN + 25],
  'd-s': [RUN + 19, RUN + 26],
  'c-s': [RUN + 20, RUN + 27],
  's-out': [RUN + 32, RUN + 38],
}
// [empieza a trabajar, acaba]
const WORK: Partial<Record<FlowId, [number, number]>> = {
  in: [RUN - 4, RUN + 2],
  r: [RUN + 8, RUN + 19],
  d: [RUN + 9, RUN + 20],
  c: [RUN + 10, RUN + 21],
  s: [RUN + 26, RUN + 33],
  out: [RUN + 38, RUN + 40],
}
export const ANSWER_FROM = RUN + 38

function flowAt(f: number): FlowState {
  const wires: FlowState['wires'] = {}
  for (const e of EDGES) {
    const k = edgeKey(e)
    const draw = k === 'in-r' ? (f >= SNAP ? 1 : 0) : prog(f, LAY[k], LAY[k] + 7, ease.out)
    const [a, b] = PASS[k]
    wires[k] = { draw, run: prog(f, a, b, ease.inOut) }
  }
  const nodes: FlowState['nodes'] = {}
  for (const id of Object.keys(FLOW) as FlowId[]) {
    const w = WORK[id]
    if (!w) continue
    const lit = Math.max(...EDGES.filter(e => e[1] === id).map(e => clamp(1 - Math.abs(f - PASS[edgeKey(e)][1]) / 5)), id === 'r' ? clamp(1 - Math.abs(f - SNAP) / 6) : 0)
    if (f >= w[1]) nodes[id] = { state: 'done', t: f - w[1], lit }
    else if (f >= w[0]) nodes[id] = { state: 'running', t: f - w[0], lit }
    else nodes[id] = { state: 'idle', t: 0, lit }
  }
  // El ratón: del puerto de texto del mensaje al de entrada del investigador, con una curva y frenando al final
  let drag: FlowState['drag']
  if (f >= DRAG_FROM && f < SNAP) {
    const t = prog(f, DRAG_FROM, SNAP, ease.inOut)
    const a = portOut('in')
    const b = portIn('r')
    drag = { from: 'in', x: mix(a.x + 20, b.x, t), y: mix(a.y, b.y, t) - Math.sin(t * Math.PI) * 60 }
  }
  return { wires, nodes, drag }
}

// La cámara: qué punto de la ventana queda en el centro de la pantalla, a qué aumento y con qué giro
function camera(f: number) {
  const port = portOut('in')
  const p0 = inWindow(port.x + 60, port.y)
  const mid = inWindow((portOut('in').x + portIn('r').x) / 2 + 40, (portOut('in').y + portIn('r').y) / 2)
  const asst = nodeCenter('d')
  const sum = nodeCenter('s')
  const center = { x: APP.w / 2, y: (APP.h + APP.bar) / 2 }
  const x = track(f, [[V.wire - 6, p0.x], [SNAP, mid.x, ease.soft], [RUN, asst.x - 30, ease.soft], [V.right, sum.x, ease.soft], [V.right + 16, center.x, ease.drama], [V.they[0], center.x + 20, ease.linear]])
  const y = track(f, [[V.wire - 6, p0.y], [SNAP, mid.y, ease.soft], [RUN, asst.y, ease.soft], [V.right, sum.y, ease.soft], [V.right + 16, center.y, ease.drama], [V.they[0], center.y, ease.linear]])
  const m = track(f, [[V.wire - 6, 5.6], [SNAP, 4.4, ease.soft], [RUN, 3.0, ease.soft], [V.right, 2.2, ease.soft], [V.right + 16, 0.98, ease.drama], [V.they[0], 0.93, ease.linear]])
  const rx = track(f, [[V.wire - 6, 38], [RUN, 30, ease.soft], [V.right, 26, ease.soft], [V.right + 16, 7, ease.drama], [V.they[0], 6, ease.linear]])
  const ry = track(f, [[V.wire - 6, 0], [V.right, 4, ease.soft], [V.right + 16, -15, ease.drama], [V.they[0], -11, ease.linear]])
  const rz = track(f, [[V.wire - 6, -10], [RUN, -6, ease.soft], [V.right, -4, ease.soft], [V.right + 16, 0, ease.drama]])
  return { x, y, m, rx, ry, rz }
}

export function Canvas() {
  const f = useCurrentFrame()
  const flow = flowAt(f)
  const cam = camera(f)
  const answer = tween(f, ANSWER_FROM, ANSWER_FROM + 44, 0, ANSWER.length, ease.linear)
  const press = prog(f, SNAP - 1, SNAP + 8, ease.linear)
  const cursor = flow.drag
    ? <Cursor x={flow.drag.x} y={flow.drag.y} scale={1 / GRAPH.scale} />
    : f < SNAP + 10
      ? <Cursor x={portIn('r').x + 4} y={portIn('r').y + 4} press={press} scale={1 / GRAPH.scale} />
      : undefined
  const pulled = prog(f, V.right + 4, V.right + 18, ease.soft)
  return (
    <AbsoluteFill style={{ background: NIGHT, overflow: 'hidden' }}>
      {/* Detrás de la ventana: una luz suave, como un estudio */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 60% 62% at 50% 44%, rgba(242,242,239,${0.16 * pulled}), rgba(242,242,239,${0.03 * pulled}) 55%, rgba(0,0,0,0) 78%)` }} />
      <AbsoluteFill style={{ perspective: 2200, perspectiveOrigin: '50% 50%' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transformOrigin: '0 0',
            transform: `translate(${W / 2}px, ${H / 2}px) rotateX(${cam.rx}deg) rotateY(${cam.ry}deg) rotateZ(${cam.rz}deg) scale(${cam.m}) translate(${-cam.x}px, ${-cam.y}px)`,
          }}
        >
          <div style={{ boxShadow: `0 ${80 * pulled}px ${200 * pulled}px rgba(0,0,0,${0.75 * pulled}), 0 0 0 ${1 + pulled}px ${rgba(PAPER, 0.1 + 0.25 * pulled)}, 0 0 ${120 * pulled}px ${rgba('#ff3a1f', 0.12 * pulled)}` }}>
            <Window url={<span>delriodevelops.github.io/meshmind/app</span>} flow={flow} answer={answer} cursor={cursor} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

// Lo que va en la pantalla, fuera del desenfoque de movimiento (un filtro de fondo por cada copia no cabría en memoria):
// la profundidad de campo, que de cerca saca de foco la parte de arriba y la de abajo del lienzo, y la nota técnica
export function CanvasOver() {
  const f = useCurrentFrame()
  const dof = clamp((camera(f).m - 1.2) / 1.6)
  const pulled = prog(f, V.right + 4, V.right + 18, ease.soft)
  const mask = 'linear-gradient(180deg, #000 0%, rgba(0,0,0,0) 34%, rgba(0,0,0,0) 72%, #000 100%)'
  return (
    <AbsoluteFill>
      {dof > 0.02 && <AbsoluteFill style={{ backdropFilter: `blur(${7 * dof}px)`, WebkitMaskImage: mask, maskImage: mask }} />}
      <div style={{ position: 'absolute', left: 96, bottom: 72, ...mono(15, rgba(PAPER, 0.55)), opacity: 1 - pulled, display: 'flex', gap: 28 }}>
        <span>PANEL OF EXPERTS</span>
        <span>4 ASSISTANTS · 1 FLOW</span>
        <span>WEBGPU</span>
      </div>
    </AbsoluteFill>
  )
}
