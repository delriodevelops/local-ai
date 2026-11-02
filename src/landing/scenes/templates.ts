import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Cada plantilla como un flujo pequeño: nodos (nombre, x, y en fracciones del tablero, si es la salida)
// y cables entre ellos. back: el cable que vuelve atrás, el revisor que devuelve el borrador
type Template = { nodes: [string, number, number, boolean?][]; edges: [number, number][]; back?: [number, number] }
const ROW = 0.43
const TEMPLATES: Template[] = [
  { nodes: [['Message', 0.04, ROW], ['Assistant', 0.41, ROW], ['Answer', 0.78, ROW, true]], edges: [[0, 1], [1, 2]] },
  {
    nodes: [['Message', 0.02, ROW], ['Researcher', 0.28, 0.12], ['Designer', 0.28, ROW], ['Critic', 0.28, 0.74], ['Summarizer', 0.54, ROW], ['Answer', 0.8, ROW, true]],
    edges: [[0, 1], [0, 2], [0, 3], [1, 4], [2, 4], [3, 4], [4, 5]],
  },
  { nodes: [['Message', 0.02, ROW], ['Writer', 0.28, ROW], ['Reviewer', 0.54, ROW], ['Answer', 0.8, ROW, true]], edges: [[0, 1], [1, 2], [2, 3]], back: [2, 1] },
  {
    nodes: [['Message', 0.02, ROW], ['Split', 0.27, ROW], ['Judge', 0.52, 0.12], ['Judge', 0.52, ROW], ['Judge', 0.52, 0.74], ['Rank', 0.8, ROW, true]],
    edges: [[0, 1], [1, 2], [1, 3], [1, 4], [2, 5], [3, 5], [4, 5]],
  },
  {
    nodes: [['Message', 0.02, ROW], ['Writer', 0.27, ROW], ['Paint', 0.53, 0.2], ['Speak', 0.53, 0.66], ['Picture', 0.8, 0.2, true], ['Voice', 0.8, 0.66, true]],
    edges: [[0, 1], [1, 2], [1, 3], [2, 4], [3, 5]],
  },
  { nodes: [['Photo', 0.02, ROW], ['See', 0.28, ROW], ['Paint', 0.54, ROW], ['Image', 0.8, ROW, true]], edges: [[0, 1], [1, 2], [2, 3]] },
  { nodes: [['Voice note', 0.02, ROW], ['Listen', 0.28, ROW], ['Assistant', 0.54, ROW], ['Speak', 0.8, ROW, true]], edges: [[0, 1], [1, 2], [2, 3]] },
]
const W = 0.18
const H = 0.14
const SVG = 'http://www.w3.org/2000/svg'

// 04: a la izquierda, fijo, el flujo de la plantilla que pasa por el centro; al cambiar, los nodos se mueven a su
// sitio nuevo y los cables se vuelven a dibujar
export function templates() {
  const stage = document.querySelector<HTMLElement>('.tpl-stage')
  const board = stage?.querySelector<HTMLElement>('.tpl-board')
  const svg = stage?.querySelector<SVGSVGElement>('.tpl-wires')
  if (!stage || !board || !svg) return () => {}
  const nodes = gsap.utils.toArray<HTMLElement>('.tpl-node', board)
  const rows = gsap.utils.toArray<HTMLElement>('.tpl', stage)
  const number = stage.querySelector<HTMLElement>('.tpl-caption-n')!
  const name = stage.querySelector<HTMLElement>('.tpl-caption-name')!
  // Dónde está cada nodo ahora (fracciones del tablero): los cables se dibujan desde aquí en cada fotograma del cambio
  const at = nodes.map(() => ({ x: 0.41, y: ROW }))
  const wires = Array.from({ length: 8 }, () => {
    const wire = document.createElementNS(SVG, 'path')
    wire.setAttribute('class', 'tpl-wire')
    wire.setAttribute('pathLength', '1')
    svg.append(wire)
    return wire
  })
  let current: Template | null = null
  const drawn = { t: 0 }

  const render = () => {
    if (!current) return
    const links: [number, number, boolean][] = current.edges.map(([a, b]) => [a, b, false])
    if (current.back) links.push([...current.back, true])
    wires.forEach((wire, i) => {
      const link = links[i]
      if (!link) {
        wire.style.display = 'none'
        return
      }
      const [a, b, back] = link
      const p = at[a]
      const q = at[b]
      wire.style.display = ''
      wire.classList.toggle('is-back', back)
      // Las coordenadas del SVG son las del tablero: 400 × 300
      if (back) {
        const x1 = (p.x + W / 2) * 400
        const x2 = (q.x + W / 2) * 400
        const y = (p.y + H) * 300
        wire.setAttribute('d', `M${x1} ${y}C${x1} ${y + 60} ${x2} ${y + 60} ${x2} ${y}`)
      } else {
        const x1 = (p.x + W) * 400
        const y1 = (p.y + H / 2) * 300
        const x2 = q.x * 400
        const y2 = (q.y + H / 2) * 300
        const bend = (x2 - x1) / 2
        wire.setAttribute('d', `M${x1} ${y1}C${x1 + bend} ${y1} ${x2 - bend} ${y2} ${x2} ${y2}`)
      }
      wire.style.strokeDasharray = back ? '' : '1'
      wire.style.strokeDashoffset = back ? '' : String(1 - drawn.t)
      wire.style.opacity = back ? String(drawn.t) : ''
    })
  }

  let morph: gsap.core.Timeline | null = null
  const show = (index: number) => {
    const template = TEMPLATES[index]
    if (!template || template === current) return
    current = template
    number.textContent = String(index + 1).padStart(2, '0')
    name.textContent = rows[index]?.querySelector('.t-name')?.textContent ?? ''
    rows.forEach((row, i) => row.classList.toggle('is-active', i === index))
    morph?.kill()
    drawn.t = 0
    morph = gsap.timeline({ onUpdate: render })
    nodes.forEach((node, i) => {
      const spec = template.nodes[i]
      if (!spec) {
        morph!.to(node, { autoAlpha: 0, scale: 0.6, duration: 0.3 }, 0)
        return
      }
      const [label, x, y, out] = spec
      morph!.to(at[i], { x, y, duration: 0.7, ease: 'power3.inOut' }, 0)
      morph!.to(node, { left: `${x * 100}%`, top: `${y * 100}%`, autoAlpha: 1, scale: 1, duration: 0.7, ease: 'power3.inOut' }, 0)
      morph!.add(() => {
        node.textContent = label
        node.classList.toggle('is-out', !!out)
      }, 0.2)
    })
    morph.to(drawn, { t: 1, duration: 0.6, ease: 'power2.out' }, 0.55)
  }

  const ctx = gsap.context(() => {
    nodes.forEach(node => gsap.set(node, { left: `${0.41 * 100}%`, top: `${ROW * 100}%`, width: `${W * 100}%`, height: `${H * 100}%`, autoAlpha: 0 }))
    rows.forEach((row, i) => {
      ScrollTrigger.create({ trigger: row, start: 'top 58%', end: 'bottom 58%', onToggle: self => self.isActive && show(i) })
    })
  })
  show(0)

  return () => {
    morph?.kill()
    ctx.revert()
    gsap.set(nodes, { clearProps: 'all' })
    wires.forEach(wire => wire.remove())
    nodes.forEach(node => {
      node.textContent = ''
      node.classList.remove('is-out')
    })
    rows.forEach(row => row.classList.remove('is-active'))
  }
}
