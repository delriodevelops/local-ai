import { gsap } from 'gsap'

const INK = '#111111'
const RED = '#ff3a1f'

// Manifiesto: la frase se queda fija y se enciende palabra a palabra; los cuatro verbos, en rojo. Luego sube el texto
export function manifesto() {
  const stage = document.querySelector<HTMLElement>('.manifesto-stage')
  if (!stage) return () => {}
  const ctx = gsap.context(() => {
    const words = gsap.utils.toArray<HTMLElement>('.mw', stage)
    gsap.set(words, { opacity: 0.12 })
    gsap.set('.mw.key', { color: INK })
    gsap.set('.manifesto-body', { opacity: 0, y: 32 })
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: stage, start: 'top top', end: '+=120%', pin: true, anticipatePin: 1, scrub: 0.8 },
    })
    words.forEach((word, i) => {
      tl.to(word, { opacity: 1, duration: 0.5 }, i * 0.35)
      if (word.classList.contains('key')) tl.to(word, { color: RED, duration: 0.5 }, i * 0.35 + 0.15)
    })
    tl.to('.manifesto-body', { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out' }, words.length * 0.35 + 0.2)
    tl.to({}, { duration: 0.6 })
  }, stage)
  return () => ctx.revert()
}
