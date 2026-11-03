// La landing es HTML y CSS; este módulo trae la fuente (servida desde la propia web), los estilos, el scroll suave,
// la película, la máquina de quien la lee, la entrada a la app y la inclinación según la velocidad del scroll
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import 'lenis/dist/lenis.css'
import '@fontsource-variable/archivo/wdth.css'
import './landing.css'
import { readMachine } from './device'
import { enterThroughDisc } from './enter'
import { startFilm } from './film'
import { getFlow } from './flow'
import { startScenes } from './scenes'

const root = document.documentElement
// Lo único que se inclina con la velocidad: --v se escribe en ellos, no en <html>, y solo cuando cambia
const skews = Array.from(document.querySelectorAll<HTMLElement>('.skew'))
let tilt = ''
const lean = (value: string) => {
  if (value === tilt) return
  tilt = value
  for (const el of skews) el.style.setProperty('--v', value)
}

// Scroll suave: la rueda del ratón avanza a saltos y las animaciones ligadas al scroll se verían a tirones.
// Lenis interpola la posición y además da la velocidad, que inclina lo que se mueve (--v).
// Va con el reloj de GSAP, para que la película del hero y el scroll avancen en el mismo fotograma
gsap.registerPlugin(ScrollTrigger)
gsap.ticker.lagSmoothing(0)
const lenis = new Lenis({ lerp: 0.085, anchors: true })
lenis.on('scroll', ({ velocity }: { velocity: number }) => {
  lean(Math.max(-1, Math.min(1, velocity / 45)).toFixed(2))
  ScrollTrigger.update()
})
gsap.ticker.add(time => lenis.raf(time * 1000))

// La página es siempre una película, también si el sistema pide menos movimiento: no hay versión quieta ni botón
// para elegirla. El hero y las escenas de después necesitan el contenedor alto y el escenario fijo (clase film)
// antes de medir. Sin JavaScript no hay película y la página queda en su estado final
function film() {
  root.classList.add('film')
  startFilm()
  startScenes()
  ScrollTrigger.refresh()
}
// Lo que ocupa la barra de scroll: lo que va a sangre (la tira de 02) mide la ventana sin ella
const scrollbar = () => root.style.setProperty('--sbw', `${window.innerWidth - root.clientWidth}px`)
window.addEventListener('resize', scrollbar)
scrollbar()
// La barra roja de arriba: cuánto se ha leído. Va en JavaScript porque Firefox no tiene animaciones ligadas al scroll.
// Se escribe en la propia barra (solo transform) y el alto de la página se mide al cambiar, no en cada fotograma
const bar = document.querySelector<HTMLElement>('.progress')
let room = 0
const progress = () => {
  if (bar) bar.style.transform = `scaleX(${room > 0 ? Math.min(1, window.scrollY / room).toFixed(4) : 0})`
}
const measure = () => {
  room = root.scrollHeight - window.innerHeight
  progress()
}
window.addEventListener('scroll', progress, { passive: true })
window.addEventListener('resize', measure)
ScrollTrigger.addEventListener('refresh', measure)
measure()
// La firma del pie respira solo mientras se ve: con el ancho de letra animado, cada fotograma vuelve a maquetarla
const signatureMark = document.querySelector<HTMLElement>('.wm')
if (signatureMark) {
  new IntersectionObserver(([entry]) => {
    signatureMark.style.animationPlayState = entry.isIntersecting ? '' : 'paused'
  }).observe(signatureMark)
}
// Los cables del flujo de 01 se dibujan siempre; la película solo los anima
getFlow()
film()
// La nota del hero dice en qué máquina va a correr: la gráfica y los núcleos de quien la lee, también sin película.
// En el móvil la nota no se ve y no hace falta despertar la gráfica
if (!matchMedia('(max-width: 760px)').matches) {
  readMachine().then(({ gpu, cores }) => {
    const note = document.querySelector<HTMLElement>('.machine-gpu')
    if (note && gpu) note.textContent = `On your ${gpu}${cores ? `, ${cores} cores` : ''}.`
  })
}
// Los enlaces a la app entran por el disco
enterThroughDisc()

// La app incrustada (05) solo se descarga en pantallas anchas con ratón: en móviles (también apaisados) y tabletas
// táctiles el marco está oculto y sin src. Una vez cargada se queda, aunque la ventana cambie.
// Misma consulta que el CSS, para que el marco nunca se vea sin src ni se cargue oculto
// Arrancar la app ocupa el hilo principal unos 150 ms y el scroll se pararía: se carga cuando el visitante está a una
// pantalla de la demo y deja de desplazarse un momento
const small = window.matchMedia('(max-width: 760px), (pointer: coarse)')
const stage = document.querySelector<HTMLElement>('.demo')
const demo = document.querySelector<HTMLIFrameElement>('.demo-frame')
let near = false
let still = 0
function loadDemo() {
  if (!demo || small.matches || demo.src || !near) return
  demo.src = demo.dataset.src!
  small.removeEventListener('change', loadDemo)
  window.removeEventListener('scroll', waitStill)
}
function waitStill() {
  window.clearTimeout(still)
  still = window.setTimeout(loadDemo, 300)
}
if (stage && demo) {
  new IntersectionObserver(entries => {
    near = entries.some(entry => entry.isIntersecting)
    if (near) waitStill()
  }, { rootMargin: '100% 0px' }).observe(stage)
  window.addEventListener('scroll', waitStill, { passive: true })
}
small.addEventListener('change', loadDemo)

// Hasta que el visitante hace clic, una capa encima del marco deja que la rueda siga bajando la página
// (si no, el lienzo la usaría para hacer zoom) y el marco es inerte, para que el tabulador no recorra la app entera.
// Al salir el ratón vuelve la capa; si el foco pasa a otra parte de la landing, vuelven capa e inercia
function activate() {
  if (!stage || !demo) return
  stage.classList.add('is-live')
  demo.inert = false
}
stage?.querySelector('.demo-shield')?.addEventListener('click', () => {
  activate()
  demo?.focus()
})
stage?.addEventListener('mouseleave', () => {
  if (!document.fullscreenElement) stage.classList.remove('is-live')
})
document.addEventListener('focusin', event => {
  if (!stage || !demo || event.target === demo) return
  stage.classList.remove('is-live')
  demo.inert = true
})

// Pantalla completa del propio marco: la conversación y el modelo cargado siguen donde estaban
const full = stage?.querySelector<HTMLButtonElement>('.demo-full')
if (stage && full && stage.requestFullscreen) {
  full.hidden = false
  full.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else stage.requestFullscreen().then(() => { activate(); demo?.focus() }, () => {})
  })
  document.addEventListener('fullscreenchange', () => {
    full.textContent = document.fullscreenElement === stage ? 'Exit full screen' : 'Full screen'
  })
}
