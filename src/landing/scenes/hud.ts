import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { readMachine } from '../device'

const pad = (n: number) => String(Math.max(0, Math.round(n))).padStart(4, '0')

// El contador del hero sigue en toda la página: aparece cuando acaba el hero, con el mismo ritmo de fotogramas
// (240 en lo que dura el hero), y lleva el nombre de la escena. En la esquina opuesta, la máquina de quien mira:
// su gráfica, sus núcleos, la hora y dónde está el puntero. En secciones oscuras se ponen claros, igual que las
// marcas de las esquinas; sobre la demo en vivo y al llegar al pie se apartan, para no tapar la app ni la firma
export function hud() {
  const el = document.querySelector<HTMLElement>('.film-hud')
  const pin = document.querySelector<HTMLElement>('.hero-pin')
  if (!el || !pin) return () => {}
  const machine = document.querySelector<HTMLElement>('.machine-hud')
  const marks = document.querySelector<HTMLElement>('.marks')
  const panels = [el, machine].filter((panel): panel is HTMLElement => !!panel)
  const toned = [...panels, marks].filter((panel): panel is HTMLElement => !!panel)
  const label = el.querySelector<HTMLElement>('.film-hud-scene')!
  const counter = el.querySelector<HTMLElement>('b')!
  const clock = machine?.querySelector<HTMLElement>('.mh-time')
  const where = machine?.querySelector<HTMLElement>('.mh-xy')
  let frame = -1
  let second = -1
  let pointer = ''
  let x = 0
  let y = 0
  let shown: HTMLElement | null = null
  let marksList: { section: HTMLElement; st: ScrollTrigger }[] = []
  // En el móvil no se enseña; el final del hero se mide al recalcular, no en cada fotograma
  const narrow = matchMedia('(max-width: 760px)')
  let heroEnd = pin.offsetHeight - innerHeight
  const measure = () => {
    heroEnd = pin.offsetHeight - innerHeight
  }
  const move = (event: PointerEvent) => {
    x = event.clientX
    y = event.clientY
  }

  readMachine().then(({ gpu, cores }) => {
    const name = machine?.querySelector<HTMLElement>('.mh-gpu')
    if (name) name.textContent = [gpu ?? 'No WebGPU', cores ? `${cores} cores` : ''].filter(Boolean).join(' · ')
  })

  // La escena es la última cuyo comienzo ya pasó: vale aunque el scroll salte varias de golpe.
  // La hora y el puntero solo se escriben cuando cambian
  const tick = () => {
    if (narrow.matches) return
    const now = Math.floor(Date.now() / 1000)
    if (clock && now !== second) {
      second = now
      clock.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false })
    }
    const at = `X ${pad(x)} · Y ${pad(y)}`
    if (where && at !== pointer) {
      pointer = at
      where.textContent = at
    }
    const top = scrollY
    const next = Math.round(240 + (Math.max(0, top - heroEnd) / innerHeight) * 80)
    if (next !== frame) {
      frame = next
      counter.textContent = String(next).padStart(4, '0')
    }
    let current: HTMLElement | null = null
    for (const mark of marksList) if (mark.st.start <= top) current = mark.section
    if (current === shown) return
    shown = current
    label.textContent = current?.dataset.scene ?? ''
    for (const panel of toned) panel.classList.toggle('on-dark', current?.dataset.tone === 'dark')
  }

  const ctx = gsap.context(() => {
    marksList = gsap.utils.toArray<HTMLElement>('[data-scene]').map(section => ({
      section,
      st: ScrollTrigger.create({ trigger: section, start: 'top 60%' }),
    }))
    const hidden = new Set<string>()
    const hide = (key: string, on: boolean) => {
      if (on) hidden.add(key)
      else hidden.delete(key)
      for (const panel of panels) panel.classList.toggle('is-hidden', hidden.size > 0)
    }
    ScrollTrigger.create({
      trigger: pin, start: 'bottom bottom', end: 'max',
      onToggle: self => { for (const panel of panels) panel.classList.toggle('is-on', self.isActive) },
    })
    const demo = document.querySelector('.demo-stage')
    if (demo) ScrollTrigger.create({ trigger: demo, start: 'top bottom', end: 'bottom top', onToggle: self => hide('demo', self.isActive) })
    const footer = document.querySelector('footer')
    if (footer) ScrollTrigger.create({ trigger: footer, start: 'top bottom', end: 'max', onToggle: self => hide('footer', self.isActive) })
  })
  gsap.ticker.add(tick)
  ScrollTrigger.addEventListener('refresh', measure)
  window.addEventListener('pointermove', move, { passive: true })

  return () => {
    gsap.ticker.remove(tick)
    ScrollTrigger.removeEventListener('refresh', measure)
    window.removeEventListener('pointermove', move)
    ctx.revert()
    for (const panel of toned) panel.classList.remove('is-on', 'on-dark', 'is-hidden')
  }
}
