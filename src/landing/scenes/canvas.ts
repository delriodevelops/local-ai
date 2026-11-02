import { gsap } from 'gsap'
import { getFlow } from '../flow'

const SVG = 'http://www.w3.org/2000/svg'

// 01: el scroll ejecuta el flujo. La cámara empieza encima del mensaje y se aleja mientras se escribe; la señal
// sale hacia los tres asistentes, que piensan a la vez (la barra roja), pasa al que resume y llega a la respuesta
export function canvasRun() {
  const flow = getFlow()
  const box = document.querySelector<HTMLElement>('.flow')
  if (!flow || !box) return () => {}
  const { cam, wires, node } = flow
  const wire = (from: string, to: string) => wires.find(w => w.dataset.from === from && w.dataset.to === to)!
  // Lo recorrido de cada cable, de 0 a 1: dibuja el trazo y lleva un punto rojo en la punta
  const travel = wires.map(() => ({ t: 0 }))
  const dots = wires.map(() => {
    const dot = document.createElementNS(SVG, 'circle')
    dot.setAttribute('r', '7')
    dot.setAttribute('class', 'flow-dot')
    dot.style.visibility = 'hidden'
    flow.svg.append(dot)
    return dot
  })

  const render = () => {
    wires.forEach((w, i) => {
      const t = travel[i].t
      w.style.strokeDashoffset = String(1 - t)
      const dot = dots[i]
      if (t <= 0.001 || t >= 0.999) {
        dot.style.visibility = 'hidden'
        return
      }
      const point = w.getPointAtLength(w.getTotalLength() * t)
      dot.setAttribute('cx', point.x.toFixed(1))
      dot.setAttribute('cy', point.y.toFixed(1))
      dot.style.visibility = ''
    })
  }

  const ctx = gsap.context(() => {
    gsap.set(wires, { strokeDasharray: 1 })
    gsap.set(cam.querySelectorAll('.flow-text'), { clipPath: 'inset(0% 100% 0% 0%)' })
    // Al empezar, el mensaje está en el centro del encuadre y muy cerca; la cámara se aleja hasta ver el flujo entero
    const message = node('message')
    const ZOOM = 2.4
    const center = () => ({ x: message.offsetLeft + message.offsetWidth / 2, y: message.offsetTop + message.offsetHeight / 2 })
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: box, start: 'top top', end: '+=220%', pin: true, anticipatePin: 1, scrub: 0.8, invalidateOnRefresh: true },
      // Los cables y los puntos se pintan cuando la escena avanza, no en cada fotograma de toda la visita
      onUpdate: render,
    })
    const run = (list: SVGPathElement[], at: number) =>
      list.forEach((w, i) => tl.to(travel[wires.indexOf(w)], { t: 1, duration: 1.4, ease: 'power1.inOut' }, at + i * 0.15))
    const think = (id: string, at: number) => tl.to(node(id).querySelector('.flow-bar'), { scaleX: 1, duration: 1.2 }, at)

    tl.fromTo(cam,
      { scale: ZOOM, x: () => cam.offsetWidth / 2 - center().x * ZOOM, y: () => cam.offsetHeight / 2 - center().y * ZOOM },
      { scale: 1, x: 0, y: 0, duration: 3, ease: 'power2.inOut' }, 0)
    tl.to(message.querySelector('.flow-text'), { clipPath: 'inset(0% 0% 0% 0%)', duration: 1 }, 0.3)
    run([wire('message', 'researcher'), wire('message', 'designer'), wire('message', 'critic')], 1.6)
    think('researcher', 3.1)
    think('designer', 3.3)
    think('critic', 3.5)
    run([wire('researcher', 'summarizer'), wire('designer', 'summarizer'), wire('critic', 'summarizer')], 4.8)
    think('summarizer', 6.4)
    run([wire('summarizer', 'answer')], 7.6)
    tl.to(node('answer').querySelector('.flow-text'), { clipPath: 'inset(0% 0% 0% 0%)', duration: 1 }, 8.9)
    tl.to({}, { duration: 0.8 })
  })
  render()

  return () => {
    ctx.revert()
    dots.forEach(dot => dot.remove())
    wires.forEach(w => w.style.removeProperty('stroke-dashoffset'))
  }
}
