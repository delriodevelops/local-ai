import { gsap } from 'gsap'

// Un número entre 0 y 1 que siempre es el mismo para cada letra: el desorden de partida no cambia al recargar
const scatter = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

// El final es el hero al revés: el rojo cae en las doce columnas de la retícula, las letras de
// «Draw your first mesh.» llegan de fuera de cuadro y se colocan y el disco entra rodando. Después el disco
// sigue creciendo hasta tragarse la pantalla: queda el papel de la app, con el botón para entrar en ella
export function finale() {
  const section = document.querySelector<HTMLElement>('.finale')
  if (!section) return () => {}
  // Cuánto tiene que crecer el disco para cubrir la pantalla entera desde su centro (la sección está fija arriba)
  const cover = () => {
    const disc = section.querySelector<HTMLElement>('.cta-disc')!
    const x = disc.offsetLeft + disc.offsetWidth / 2
    const y = disc.offsetTop + disc.offsetHeight / 2
    const far = Math.max(...[[0, 0], [innerWidth, 0], [0, innerHeight], [innerWidth, innerHeight]].map(([cx, cy]) => Math.hypot(cx - x, cy - y)))
    return (far / (disc.offsetWidth / 2)) * 1.04
  }
  const ctx = gsap.context(() => {
    const strips = gsap.utils.toArray<HTMLElement>('.finale-shutter span')
    const chars = gsap.utils.toArray<HTMLElement>('.ch')
    const actions = section.querySelector<HTMLElement>(':scope > div:last-child > div:last-child')
    gsap.set(strips, { yPercent: -101 })
    gsap.set(chars, {
      x: i => (scatter(i, 1) - 0.5) * innerWidth * 1.1,
      y: i => (scatter(i, 2) - 0.5) * innerHeight * 1.1,
      rotation: i => (scatter(i, 3) - 0.5) * 120,
      scale: 1.8,
      autoAlpha: 0,
    })
    gsap.set('.cta-disc', { xPercent: 90, rotation: 140, scale: 0.4 })
    // Solo opacidad: con visibility el botón dejaría de recibir el foco y el lector de pantalla no lo encontraría
    if (actions) gsap.set(actions, { opacity: 0, y: 40 })

    // Mientras la sección sube, caen las columnas; ya fija, se monta la frase
    gsap.to(strips, {
      yPercent: 0, ease: 'power2.inOut', stagger: 0.04,
      scrollTrigger: { trigger: section, start: 'top bottom', end: 'top top', scrub: 0.8 },
    })
    // Con el disco ya encima de casi todo, el botón deja de barrerse en papel (no se vería) y vuelve al rojo
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: section, start: 'top top', end: '+=230%', pin: true, anticipatePin: 1, scrub: 0.8, invalidateOnRefresh: true },
      onUpdate: () => section.classList.toggle('is-paper', tl.time() > 4.6),
    })
    tl.to(chars, { x: 0, y: 0, rotation: 0, scale: 1, autoAlpha: 1, duration: 1.6, stagger: 0.05, ease: 'power3.out' }, 0)
    tl.to('.cta-disc', { xPercent: 0, rotation: 0, scale: 1, duration: 2, ease: 'power3.out' }, 0.4)
    if (actions) tl.to(actions, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 2)
    tl.to('.cta-disc', { scale: cover, duration: 2.2, ease: 'power2.in' }, 3.1)
    tl.to({}, { duration: 0.6 })
  }, section)
  return () => {
    ctx.revert()
    section.classList.remove('is-paper')
  }
}

// La firma del pie: MESHMIND sube letra a letra mientras llega el final de la página
export function signature() {
  const footer = document.querySelector<HTMLElement>('footer')
  if (!footer) return () => {}
  const ctx = gsap.context(() => {
    const chars = gsap.utils.toArray<HTMLElement>('.wm .ch')
    gsap.set(chars, { yPercent: 110 })
    gsap.to(chars, {
      yPercent: 0, ease: 'power2.out', stagger: 0.06,
      scrollTrigger: { trigger: footer, start: 'top bottom', end: 'bottom bottom', scrub: 0.8 },
    })
  }, footer)
  return () => ctx.revert()
}
