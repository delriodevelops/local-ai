import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// El contador del hero sigue en toda la página: aparece cuando acaba el hero, con el mismo ritmo de fotogramas
// (240 en lo que dura el hero), y lleva el nombre de la escena. En secciones oscuras se pone claro; sobre la demo
// en vivo y al llegar al pie se aparta, para no tapar la app ni la firma
export function hud() {
  const el = document.querySelector<HTMLElement>('.film-hud')
  const pin = document.querySelector<HTMLElement>('.hero-pin')
  if (!el || !pin) return () => {}
  const label = el.querySelector<HTMLElement>('.film-hud-scene')!
  const counter = el.querySelector<HTMLElement>('b')!
  let frame = -1
  let shown: HTMLElement | null = null
  let marks: { section: HTMLElement; st: ScrollTrigger }[] = []
  // En el móvil no se enseña; el final del hero se mide al recalcular, no en cada fotograma
  const narrow = matchMedia('(max-width: 760px)')
  let heroEnd = pin.offsetHeight - innerHeight
  const measure = () => {
    heroEnd = pin.offsetHeight - innerHeight
  }

  // La escena es la última cuyo comienzo ya pasó: vale aunque el scroll salte varias de golpe
  const tick = () => {
    if (narrow.matches) return
    const y = scrollY
    const now = Math.round(240 + (Math.max(0, y - heroEnd) / innerHeight) * 80)
    if (now !== frame) {
      frame = now
      counter.textContent = String(now).padStart(4, '0')
    }
    let current: HTMLElement | null = null
    for (const mark of marks) if (mark.st.start <= y) current = mark.section
    if (current === shown) return
    shown = current
    label.textContent = current?.dataset.scene ?? ''
    el.classList.toggle('on-dark', current?.dataset.tone === 'dark')
  }

  const ctx = gsap.context(() => {
    marks = gsap.utils.toArray<HTMLElement>('[data-scene]').map(section => ({
      section,
      st: ScrollTrigger.create({ trigger: section, start: 'top 60%' }),
    }))
    const hidden = new Set<string>()
    const hide = (key: string, on: boolean) => {
      if (on) hidden.add(key)
      else hidden.delete(key)
      el.classList.toggle('is-hidden', hidden.size > 0)
    }
    ScrollTrigger.create({ trigger: pin, start: 'bottom bottom', end: 'max', onToggle: self => el.classList.toggle('is-on', self.isActive) })
    const demo = document.querySelector('.demo-stage')
    if (demo) ScrollTrigger.create({ trigger: demo, start: 'top bottom', end: 'bottom top', onToggle: self => hide('demo', self.isActive) })
    const footer = document.querySelector('footer')
    if (footer) ScrollTrigger.create({ trigger: footer, start: 'top bottom', end: 'max', onToggle: self => hide('footer', self.isActive) })
  })
  gsap.ticker.add(tick)
  ScrollTrigger.addEventListener('refresh', measure)

  return () => {
    gsap.ticker.remove(tick)
    ScrollTrigger.removeEventListener('refresh', measure)
    ctx.revert()
    el.classList.remove('is-on', 'on-dark', 'is-hidden')
  }
}
