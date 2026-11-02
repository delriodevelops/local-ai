import { gsap } from 'gsap'

// Los títulos de capítulo de toda la página: el número se estrecha mientras sube, el título se descubre de abajo
// arriba, la entradilla sube y el número fantasma del fondo va a contracorriente. Ligado al scroll, ida y vuelta
export function reveals() {
  const ctx = gsap.context(() => {
    const scrub = (trigger: Element, start: string, end: string) => ({ trigger, start, end, scrub: 0.8 })
    gsap.utils.toArray<HTMLElement>('.num').forEach(num => {
      gsap.fromTo(num,
        { yPercent: 40, fontVariationSettings: '"wdth" 125' },
        { yPercent: 0, fontVariationSettings: '"wdth" 62', ease: 'none', scrollTrigger: scrub(num.parentElement!, 'top bottom', 'top 45%') })
    })
    gsap.utils.toArray<HTMLElement>('.mask').forEach(title => {
      gsap.fromTo(title,
        { clipPath: 'inset(0% 0% 100% 0%)', y: 40 },
        { clipPath: 'inset(0% 0% 0% 0%)', y: 0, ease: 'none', scrollTrigger: scrub(title, 'top 95%', 'top 60%') })
    })
    gsap.utils.toArray<HTMLElement>('.reveal').forEach(block => {
      gsap.fromTo(block,
        { autoAlpha: 0, y: 48 },
        { autoAlpha: 1, y: 0, ease: 'none', scrollTrigger: scrub(block, 'top bottom', 'top 75%') })
    })
    gsap.utils.toArray<HTMLElement>('.ghost').forEach(ghost => {
      gsap.fromTo(ghost,
        { yPercent: 18 },
        { yPercent: -18, ease: 'none', scrollTrigger: scrub(ghost.parentElement!, 'top bottom', 'bottom top') })
    })
  })
  return () => ctx.revert()
}
