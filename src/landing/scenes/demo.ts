import { gsap } from 'gsap'

// 05: la app en vivo entra como una ventana que se abre: pequeña y recortada, crece hasta su tamaño mientras sube;
// la barra de «Live» se escribe después. En pantallas donde la demo no se carga no hay nada que animar
export function demo() {
  const stage = document.querySelector<HTMLElement>('.demo-stage')
  const frame = stage?.querySelector<HTMLElement>('.demo')
  const bar = frame?.querySelector<HTMLElement>('.demo-bar')
  if (!stage || !frame || !bar) return () => {}
  const ctx = gsap.context(() => {
    gsap.fromTo(frame,
      { scale: 0.72, y: 80, clipPath: 'inset(14% 12% 14% 12%)', transformOrigin: '50% 0%' },
      { scale: 1, y: 0, clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: stage, start: 'top bottom', end: 'top 12%', scrub: 0.8 } })
    gsap.fromTo(bar,
      { clipPath: 'inset(0% 100% 0% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: stage, start: 'top 60%', end: 'top 20%', scrub: 0.8 } })
  }, stage)
  return () => ctx.revert()
}
