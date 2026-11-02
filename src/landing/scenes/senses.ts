import { gsap } from 'gsap'

const PAPER = '#f2f2ef'
const RED = '#ff3a1f'

// Cómo se anima el pictograma de cada sentido mientras su panel llega al centro. Los estados de partida van con
// set: con stagger, un fromTo solo pinta al principio el primer elemento
type Glyph = (tl: gsap.core.Timeline, svg: SVGSVGElement) => void
const all = (svg: SVGSVGElement, selector: string) => gsap.utils.toArray<SVGElement>(svg.querySelectorAll(selector))
const draw = (tl: gsap.core.Timeline, lines: SVGElement[], at = 0, each = 0.25) => {
  gsap.set(lines, { strokeDasharray: 1, strokeDashoffset: 1 })
  tl.to(lines, { strokeDashoffset: 0, duration: 0.6, stagger: each, ease: 'none' }, at)
}

const GLYPHS: Record<string, Glyph> = {
  // Pensar: el triángulo se traza y los tres nodos se encienden por turnos
  think: (tl, svg) => {
    draw(tl, all(svg, '.g-line'))
    tl.to(all(svg, '.g-node'), { fill: RED, duration: 0.2, stagger: 0.2 }, 0.5)
  },
  // Ordenar: una línea se parte en tres y cada rama acaba en una casilla
  sort: (tl, svg) => {
    draw(tl, all(svg, '.g-line'), 0, 0.18)
    tl.to(all(svg, '.g-node'), { fill: RED, duration: 0.2, stagger: 0.15 }, 0.7)
  },
  // Ver: el ojo se abre y la pupila aparece
  see: (tl, svg) => {
    const eye = svg.querySelector('.g-eye')
    const pupil = svg.querySelector('.g-pupil')
    gsap.set(eye, { scaleY: 0.06, transformOrigin: '50% 50%' })
    gsap.set(pupil, { scale: 0, transformOrigin: '50% 50%' })
    tl.to(eye, { scaleY: 1, duration: 0.7, ease: 'power3.out' }, 0)
    tl.to(pupil, { scale: 1, duration: 0.4, ease: 'back.out(2)' }, 0.6)
  },
  // Pintar: la cuadrícula se llena de rojo en diagonal
  paint: (tl, svg) => {
    const cells = all(svg, '.g-cell').sort((a, b) => {
      const pos = (c: SVGElement) => Number(c.getAttribute('x')) + Number(c.getAttribute('y'))
      return pos(a) - pos(b)
    })
    tl.to(cells, { fill: RED, duration: 0.15, stagger: 0.05 }, 0)
  },
  // Escuchar: las barras crecen como una onda de voz
  listen: (tl, svg) => {
    const heights = [0.3, 0.6, 0.9, 0.5, 1, 0.45, 0.8, 0.35, 0.6]
    const bars = all(svg, '.g-bar')
    gsap.set(bars, { scaleY: 0.08, transformOrigin: '50% 50%' })
    bars.forEach((bar, i) => tl.to(bar, { scaleY: heights[i], duration: 0.5, ease: 'power2.out' }, i * 0.05))
  },
  // Hablar: las ondas salen del punto una tras otra
  speak: (tl, svg) => draw(tl, all(svg, '.g-line'), 0, 0.22),
  // Película: la tira avanza un fotograma
  film: (tl, svg) => {
    tl.fromTo(svg.querySelector('.g-strip'), { x: 0 }, { x: -46, duration: 1, ease: 'none' }, 0)
  },
  // Alcanzar: el enchufe entra y la toma se enciende
  reach: (tl, svg) => {
    tl.fromTo(svg.querySelector('.g-plug'), { x: -14 }, { x: 12, duration: 0.7, ease: 'power3.inOut' }, 0)
    tl.fromTo(svg.querySelector('.g-socket'), { fill: PAPER }, { fill: RED, duration: 0.2 }, 0.65)
  },
}

// 02: la tabla se convierte en una tira de ocho paneles que pasa de lado mientras se baja
export function senses() {
  const wrap = document.querySelector<HTMLElement>('.senses')
  const track = wrap?.querySelector<HTMLElement>('.senses-track')
  if (!wrap || !track) return () => {}
  const ctx = gsap.context(() => {
    const distance = () => track.scrollWidth - wrap.clientWidth
    const slide = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: { trigger: wrap, start: 'top top', end: () => `+=${distance() * 0.8}`, pin: true, anticipatePin: 1, scrub: 0.8, invalidateOnRefresh: true },
    })
    const panels = gsap.utils.toArray<HTMLElement>('.sense', track)
    panels.forEach((panel, i) => {
      const along = (start: string, end: string) => ({ trigger: panel, containerAnimation: slide, start, end, scrub: true })
      // El verbo se ensancha al llegar al centro y vuelve a estrecharse al irse. Solo mientras cruza el centro:
      // cambiar el ancho de letra vuelve a maquetar la palabra, y con varias a la vez el scroll da tirones
      const verb = panel.querySelector('.verb')
      gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: along('left 65%', 'right 35%') })
        .to(verb, { fontVariationSettings: '"wdth" 125', duration: 1 })
        .to(verb, { fontVariationSettings: '"wdth" 62', duration: 1 })
      const svg = panel.querySelector<SVGSVGElement>('.sense-glyph')
      const glyph = svg && GLYPHS[svg.dataset.glyph ?? '']
      // El último panel se para pegado a la derecha y su centro nunca llega al 45 %: termina al llegar
      const end = i === panels.length - 1 ? 'right right' : 'center 45%'
      if (svg && glyph) glyph(gsap.timeline({ scrollTrigger: along('left 85%', end) }), svg)
    })
  }, wrap)
  return () => ctx.revert()
}
