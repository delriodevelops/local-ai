import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// La película del hero. El scroll la avanza y la rebobina, con algo de inercia para que pese:
// 1. MESH y MIND se abren letra a letra y salen de cuadro; la retícula se corta en columnas.
// 2. El disco rojo se abre como un diafragma hasta llenar la pantalla y dentro se dibuja una malla de modelos.
// 3. Sube la frase. 4. El rojo se va en doce columnas y queda el papel.

const SVG = 'http://www.w3.org/2000/svg'
const PAPER = '#f2f2ef'
const FRAMES = 240

// La malla, de 0 a 1 en pantallas apaisadas; en vertical se traspone, como el lienzo de la app.
// key: las que conservan su nombre en pantallas estrechas
const NODES = [
  { label: 'Message', x: 0.05, y: 0.22, key: true },
  { label: 'Voice note', x: 0.08, y: 0.55 },
  { label: 'Photo', x: 0.04, y: 0.84 },
  { label: 'Whisper', x: 0.22, y: 0.62, key: true },
  { label: 'Qwen 2.5', x: 0.3, y: 0.16, key: true },
  { label: 'Janus-Pro', x: 0.25, y: 0.9 },
  { label: 'Researcher', x: 0.47, y: 0.1 },
  { label: 'Critic', x: 0.52, y: 0.4 },
  { label: 'Designer', x: 0.45, y: 0.72 },
  { label: 'Split', x: 0.6, y: 0.88 },
  { label: 'Summarizer', x: 0.72, y: 0.24 },
  { label: 'MCP tool', x: 0.68, y: 0.6 },
  { label: 'Kokoro', x: 0.82, y: 0.66, key: true },
  { label: 'Answer', x: 0.95, y: 0.42, key: true },
]
// De izquierda a derecha, en el orden en que se dibujan
const EDGES: [number, number][] = [
  [0, 4], [1, 3], [3, 4], [3, 7], [2, 5], [5, 8], [4, 6], [4, 7], [4, 8],
  [8, 9], [6, 10], [7, 10], [9, 11], [11, 10], [10, 13], [10, 12], [12, 13],
]
// Los cables por los que corre la señal
const PULSED = [0, 2, 5, 7, 9, 11, 14, 16]

function make<K extends keyof SVGElementTagNameMap>(name: K, attrs: Record<string, string | number> = {}) {
  const node = document.createElementNS(SVG, name)
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value))
  return node
}

function buildMesh(svg: SVGSVGElement) {
  const wires = EDGES.map((_, i) => make('path', { id: `mm-wire-${i}`, class: 'mesh-wire', pathLength: 1 }))
  const pulses = make('g')
  PULSED.forEach((edge, i) => {
    const dot = make('circle', { r: 4, class: 'mesh-pulse' })
    const motion = make('animateMotion', { dur: `${2.2 + (i % 3) * 0.6}s`, begin: `${(-i * 0.45).toFixed(2)}s`, repeatCount: 'indefinite' })
    motion.append(make('mpath', { href: `#mm-wire-${edge}` }))
    dot.append(motion)
    pulses.append(dot)
  })
  const nodes = NODES.map(() => {
    const at = make('g')
    const pop = make('g')
    const box = make('rect', { x: -7, y: -7, width: 14, height: 14, class: 'mesh-node' })
    const label = make('text', { class: 'mesh-label' })
    pop.append(box)
    at.append(pop, label)
    return { at, pop, box, label }
  })
  nodes.forEach((n, i) => { n.label.textContent = NODES[i].label.toUpperCase() })
  const wireLayer = make('g')
  wireLayer.append(...wires)
  const nodeLayer = make('g')
  nodeLayer.append(...nodes.map(n => n.at))
  svg.replaceChildren(wireLayer, pulses, nodeLayer)
  return { wires, pulses, nodes }
}

type Mesh = ReturnType<typeof buildMesh>

// Coloca la malla a la medida del escenario, en píxeles: así los textos tienen siempre el mismo tamaño
function layout(svg: SVGSVGElement, mesh: Mesh, w: number, h: number) {
  const tall = w / h < 0.85
  const points = NODES.map(n => (tall
    ? { x: (0.12 + n.y * 0.76) * w, y: (0.08 + n.x * 0.84) * h }
    : { x: (0.04 + n.x * 0.92) * w, y: (0.12 + n.y * 0.76) * h }))
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
  EDGES.forEach(([from, to], i) => {
    const p = points[from]
    const q = points[to]
    const bend = tall ? (q.y - p.y) / 2 : (q.x - p.x) / 2
    const c1 = tall ? `${p.x.toFixed(1)} ${(p.y + bend).toFixed(1)}` : `${(p.x + bend).toFixed(1)} ${p.y.toFixed(1)}`
    const c2 = tall ? `${q.x.toFixed(1)} ${(q.y - bend).toFixed(1)}` : `${(q.x - bend).toFixed(1)} ${q.y.toFixed(1)}`
    mesh.wires[i].setAttribute('d', `M${p.x.toFixed(1)} ${p.y.toFixed(1)}C${c1} ${c2} ${q.x.toFixed(1)} ${q.y.toFixed(1)}`)
  })
  mesh.nodes.forEach((n, i) => {
    const { x, y } = points[i]
    n.at.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`)
    // Cerca del borde derecho, el nombre va a la izquierda del nodo
    const flip = x > w * 0.78
    n.label.setAttribute('x', String(flip ? -14 : 14))
    n.label.setAttribute('y', '-12')
    n.label.setAttribute('text-anchor', flip ? 'end' : 'start')
    n.label.style.display = w < 640 && !NODES[i].key ? 'none' : ''
  })
}

export function startFilm() {
  const q = <T extends Element = HTMLElement>(selector: string) => document.querySelector<T>(selector)!
  const pin = q('.hero-pin')
  const stage = q('.hero-stage')
  const title = q('.hero-title')
  const disc = q('.disc')
  const discWrap = q('.disc-wrap')
  const aperture = q('.aperture')
  const svg = q<SVGSVGElement>('.mesh')
  const say = q('.say')
  const counter = q('.hud-n')
  const mesh = buildMesh(svg)
  const relayout = () => layout(svg, mesh, stage.clientWidth, stage.clientHeight)
  relayout()

  // move: el centro del disco va al centro de la pantalla; grow: su radio crece hasta cubrirla
  const lens = { move: 0, grow: 0 }
  let tl!: gsap.core.Timeline
  let open = false
  let clip = ''
  let frame = -1

  // El disco del cartel se queda en su sitio (cae al cargar, flota, sigue al ratón). Mientras el iris no lo
  // ha tapado todo, el círculo sale de dónde esté el disco en cada fotograma, y el cambio no se nota
  const render = () => {
    const engaged = lens.move > 0.0005 || lens.grow > 0.0005
    if (engaged !== open) {
      open = engaged
      aperture.style.visibility = engaged ? 'visible' : ''
      disc.style.visibility = engaged ? 'hidden' : ''
    }
    let next = 'none'
    if (engaged && lens.grow < 1) {
      const s = stage.getBoundingClientRect()
      const d = disc.getBoundingClientRect()
      const x0 = d.left + d.width / 2 - s.left
      const y0 = d.top + d.height / 2 - s.top
      const r0 = d.width / 2
      const x = x0 + (s.width / 2 - x0) * lens.move
      const y = y0 + (s.height / 2 - y0) * lens.move
      const r = r0 + (Math.hypot(s.width, s.height) / 2 + 2 - r0) * lens.grow
      next = `circle(${r.toFixed(1)}px at ${x.toFixed(1)}px ${y.toFixed(1)}px)`
    }
    if (engaged && next !== clip) {
      clip = next
      aperture.style.clipPath = next
    }
    title.classList.toggle('is-off', tl.progress() > 0.34)
    const now = Math.round(tl.progress() * FRAMES)
    if (now !== frame) {
      frame = now
      counter.textContent = String(now).padStart(3, '0')
    }
  }

  const listeners: [EventTarget, string, EventListener][] = []
  const listen = (target: EventTarget, type: string, handler: EventListener) => {
    target.addEventListener(type, handler)
    listeners.push([target, type, handler])
  }

  const ctx = gsap.context(() => {
    // La malla se dibuja del centro hacia fuera, a la vez que el disco la va descubriendo;
    // la señal la enciende después en el orden del flujo, de izquierda a derecha
    const fromCenter = (x: number, y: number) => Math.hypot(x - 0.5, y - 0.5)
    const nearFirst = <T>(items: T[], distance: (item: T, i: number) => number) =>
      items.map((item, i) => ({ item, d: distance(item, i) })).sort((a, b) => a.d - b.d).map(entry => entry.item)
    const nodes = nearFirst(mesh.nodes, (_, i) => fromCenter(NODES[i].x, NODES[i].y))
    const pops = nodes.map(n => n.pop)
    const labels = nodes.map(n => n.label)
    const wires = nearFirst(mesh.wires, (_, i) => {
      const [a, b] = EDGES[i].map(n => NODES[n])
      return fromCenter((a.x + b.x) / 2, (a.y + b.y) / 2)
    })
    const flow = mesh.nodes.map((n, i) => ({ box: n.box, x: NODES[i].x })).sort((a, b) => a.x - b.x).map(n => n.box)
    // Los estados de partida van aparte: con stagger, un from() solo pinta al principio el primer elemento
    gsap.set(say, { visibility: 'visible' })
    gsap.set('.say .w', { yPercent: 115 })
    gsap.set('.say-line', { fontVariationSettings: '"wdth" 62' })
    gsap.set(svg, { scale: 1.35, autoAlpha: 0, transformOrigin: '50% 50%' })
    gsap.set(pops, { scale: 0, transformOrigin: '50% 50%' })
    gsap.set([labels, mesh.pulses], { autoAlpha: 0 })
    tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: pin, start: 'top top', end: 'bottom bottom', scrub: 0.8, invalidateOnRefresh: true },
    })

    // 1. El cartel se rompe: las letras de fuera salen antes y más deprisa, y crecen como si pasaran junto a la cámara.
    // Los recorridos dan para que salgan enteras también cuando el título respira hacia lo ancho
    tl.to('.cue-wrap, .hero-note', { autoAlpha: 0, y: 24, duration: 1.2, ease: 'power2.in' }, 0)
    tl.to('.gridline', { y: (i: number) => (i % 2 ? 1 : -1) * innerHeight * 0.4, autoAlpha: 0, duration: 1.8, stagger: 0.03, ease: 'power2.in' }, 0)
    const left = gsap.utils.toArray<HTMLElement>('.line-l .ltr')
    const right = gsap.utils.toArray<HTMLElement>('.line-r .ltr')
    // Dónde está cada letra en el escenario, sin contar transformaciones. En móvil el título tiene un tamaño mínimo
    // y las letras ocupan más pantalla: el recorrido se mide para que salgan enteras, también estiradas (×1.3)
    const box = (el: HTMLElement) => {
      let x = 0
      for (let node: HTMLElement | null = el; node && node !== stage; node = node.offsetParent as HTMLElement | null) x += node.offsetLeft
      return { center: x + el.offsetWidth / 2, half: el.offsetWidth / 2 }
    }
    left.forEach((ltr, i) => {
      const f = (left.length - i) / left.length
      const scale = 1 + 2.2 * f
      const x = () => -Math.max((0.85 + 0.25 * f) * innerWidth, box(ltr).center + box(ltr).half * scale * 1.3 + 24)
      tl.to(ltr, { x, y: () => -(0.08 + 0.1 * f) * innerHeight, rotation: -7 * f, scale, duration: 3.2, ease: 'power2.in' }, 0.12 * (1 - f))
    })
    right.forEach((ltr, i) => {
      const f = (i + 1) / right.length
      const scale = 1 + 2.2 * f
      const x = () => Math.max((0.9 + 0.3 * f) * innerWidth, stage.clientWidth - box(ltr).center + box(ltr).half * scale * 1.3 + 24)
      tl.to(ltr, { x, y: () => (0.08 + 0.1 * f) * innerHeight, rotation: 7 * f, scale, duration: 3.2, ease: 'power2.in' }, 0.12 * (1 - f))
    })

    // 2. El disco se abre hasta llenar la pantalla y, dentro, la malla se acerca y se dibuja cable a cable
    tl.to(lens, { move: 1, duration: 4, ease: 'power2.inOut' }, 0.4)
    tl.to(lens, { grow: 1, duration: 4, ease: 'power3.in' }, 0.4)
    tl.to(svg, { scale: 1, autoAlpha: 1, duration: 2.8, ease: 'power2.out' }, 1.6)
    tl.to(wires, { strokeDashoffset: 0, duration: 1.1, stagger: 0.11 }, 1.8)
    tl.to(pops, { scale: 1, duration: 0.5, stagger: 0.09, ease: 'back.out(2)' }, 2)
    tl.to(labels, { autoAlpha: 1, duration: 0.5, stagger: 0.09 }, 2.2)
    tl.to(mesh.pulses, { autoAlpha: 1, duration: 0.8 }, 3.8)

    // 3. La frase sube palabra a palabra y se ensancha; la señal enciende los nodos por orden
    tl.to('.say .w', { yPercent: 0, duration: 1.1, stagger: 0.16, ease: 'power3.out' }, 4.8)
    tl.to('.say-line', { fontVariationSettings: '"wdth" 100', duration: 2.2, ease: 'power2.out' }, 4.8)
    tl.to(flow, { fill: PAPER, duration: 0.3, stagger: 0.08 }, 6.2)

    // 4. El rojo se va columna a columna. Hasta aquí lo pinta el fondo del iris, sin juntas entre columnas.
    // La malla es del color del papel: desaparece con el rojo
    tl.set(aperture, { backgroundColor: 'transparent' }, 7.6)
    tl.to('.shutter span', { yPercent: -101, duration: 1.3, stagger: 0.06, ease: 'power3.inOut' }, 7.6)
    tl.to(say, { y: () => -innerHeight * 0.06, duration: 2, ease: 'power1.inOut' }, 8)
    tl.to({}, { duration: 0.4 }, 9.6)

    // Con ratón, el disco se acerca al puntero y el título se aparta un poco: profundidad sin hacer scroll
    if (matchMedia('(pointer: fine)').matches) {
      const discX = gsap.quickTo(discWrap, 'x', { duration: 1, ease: 'power3' })
      const discY = gsap.quickTo(discWrap, 'y', { duration: 1, ease: 'power3' })
      const titleX = gsap.quickTo(title, 'x', { duration: 1.4, ease: 'power3' })
      const titleY = gsap.quickTo(title, 'y', { duration: 1.4, ease: 'power3' })
      listen(stage, 'pointermove', event => {
        const { clientX, clientY } = event as PointerEvent
        const nx = clientX / innerWidth - 0.5
        const ny = clientY / innerHeight - 0.5
        discX(nx * 70)
        discY(ny * 70)
        titleX(nx * -18)
        titleY(ny * -12)
      })
      listen(stage, 'pointerleave', () => {
        discX(0)
        discY(0)
        titleX(0)
        titleY(0)
      })
    }
  })

  gsap.ticker.add(render)
  listen(window, 'resize', relayout)
  // Con la fuente ya cargada cambian las medidas del título
  document.fonts?.ready.then(() => ScrollTrigger.refresh())

  return () => {
    gsap.ticker.remove(render)
    for (const [target, type, handler] of listeners) target.removeEventListener(type, handler)
    ctx.revert()
    aperture.style.removeProperty('visibility')
    aperture.style.removeProperty('clip-path')
    disc.style.removeProperty('visibility')
    title.classList.remove('is-off')
    counter.textContent = '000'
  }
}
