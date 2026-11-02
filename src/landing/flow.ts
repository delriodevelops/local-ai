// Los cables del flujo de 01 salen de donde estén los nodos (posiciones en el CSS): por la derecha y entran por la
// izquierda; en pantallas estrechas el flujo baja de arriba abajo y salen por abajo y entran por arriba.
// Se dibujan siempre, también sin movimiento; la película (scenes/canvas.ts) solo los anima

const SVG = 'http://www.w3.org/2000/svg'
const EDGES: [string, string][] = [
  ['message', 'researcher'], ['message', 'designer'], ['message', 'critic'],
  ['researcher', 'summarizer'], ['designer', 'summarizer'], ['critic', 'summarizer'],
  ['summarizer', 'answer'],
]
const narrow = matchMedia('(max-width: 760px)')

export type Flow = { cam: HTMLElement; svg: SVGSVGElement; wires: SVGPathElement[]; node: (id: string) => HTMLElement }

let flow: Flow | null | undefined

// Medidas de maquetación, sin transformaciones: la cámara puede estar ampliada y los cables no deben moverse
function box(el: HTMLElement) {
  return { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }
}

function layout({ cam, svg, wires, node }: Flow) {
  svg.setAttribute('viewBox', `0 0 ${cam.offsetWidth} ${cam.offsetHeight}`)
  const down = narrow.matches
  for (const wire of wires) {
    const a = box(node(wire.dataset.from!))
    const b = box(node(wire.dataset.to!))
    const [x1, y1, x2, y2] = down
      ? [a.x + a.w / 2, a.y + a.h, b.x + b.w / 2, b.y]
      : [a.x + a.w, a.y + a.h / 2, b.x, b.y + b.h / 2]
    const bend = down ? (y2 - y1) / 2 : (x2 - x1) / 2
    const c = down ? `${x1} ${y1 + bend} ${x2} ${y2 - bend}` : `${x1 + bend} ${y1} ${x2 - bend} ${y2}`
    wire.setAttribute('d', `M${x1} ${y1}C${c} ${x2} ${y2}`)
  }
}

export function getFlow(): Flow | null {
  if (flow !== undefined) return flow
  const cam = document.querySelector<HTMLElement>('.flow-cam')
  const svg = cam?.querySelector<SVGSVGElement>('.flow-wires')
  if (!cam || !svg) return (flow = null)
  const wires = EDGES.map(([from, to]) => {
    const wire = document.createElementNS(SVG, 'path')
    wire.setAttribute('class', 'flow-wire')
    wire.setAttribute('pathLength', '1')
    wire.dataset.from = from
    wire.dataset.to = to
    return wire
  })
  svg.replaceChildren(...wires)
  flow = { cam, svg, wires, node: id => cam.querySelector<HTMLElement>(`[data-node="${id}"]`)! }
  const current = flow
  layout(current)
  new ResizeObserver(() => layout(current)).observe(cam)
  return flow
}
