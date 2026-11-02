import { gsap } from 'gsap'

// 03: la sección oscura se abre como un telón; en el planificador, la cabeza lectora roja avanza con el scroll y
// cada trabajo aparece a su paso, en la gráfica y en el procesador a la vez. Las cifras cuentan al entrar
export function machine() {
  const section = document.querySelector<HTMLElement>('#machine')
  const sched = section?.querySelector<HTMLElement>('.sched')
  if (!section || !sched) return () => {}
  // Las cifras se escriben en --n mientras cuentan; al apagar el movimiento vuelven a su valor final
  const finals = new Map<HTMLElement, string>()
  const ctx = gsap.context(() => {
    gsap.fromTo(section,
      { clipPath: 'inset(10% 8% 10% 8%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: section, start: 'top bottom', end: 'top 15%', scrub: 0.8 } })

    const head = sched.querySelector<HTMLElement>('.sched-head')!
    const track = sched.querySelector<HTMLElement>('.sched-track')!
    const jobs = gsap.utils.toArray<HTMLElement>('.job')
    gsap.set(jobs, { clipPath: 'inset(0% 100% 0% 0%)' })
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: sched, start: 'top 85%', end: 'bottom 25%', scrub: 0.8, invalidateOnRefresh: true },
    })
    tl.fromTo(head, { x: 0 }, { x: () => track.offsetWidth, duration: 1 }, 0)
    // Cada trabajo se descubre mientras la cabeza lo recorre: empieza en --a y acaba en --b (fracciones del eje)
    for (const job of jobs) {
      const style = getComputedStyle(job)
      const a = Number(style.getPropertyValue('--a'))
      const b = Number(style.getPropertyValue('--b'))
      tl.to(job, { clipPath: 'inset(0% 0% 0% 0%)', duration: b - a }, a)
    }

    // Las cifras: de 99 servidores a ninguno, y el resto contando hacia arriba
    const counters = gsap.utils.toArray<HTMLElement>('.count, .countdown')
    for (const counter of counters) {
      finals.set(counter, counter.style.getPropertyValue('--n'))
      const target = Number(counter.style.getPropertyValue('--n'))
      const from = counter.classList.contains('countdown') ? 99 : 0
      const value = { n: from }
      counter.style.setProperty('--n', String(from))
      gsap.to(value, {
        n: target, ease: 'power2.out',
        onUpdate: () => counter.style.setProperty('--n', String(Math.round(value.n))),
        scrollTrigger: { trigger: counter, start: 'top 90%', end: 'top 45%', scrub: 0.8 },
      })
    }
  }, section)
  return () => {
    ctx.revert()
    finals.forEach((value, counter) => counter.style.setProperty('--n', value))
  }
}
