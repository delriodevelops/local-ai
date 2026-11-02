// La landing es HTML y CSS; este módulo trae la fuente (servida desde la propia web), los estilos,
// el scroll suave, la película del hero, el botón de movimiento y la inclinación según la velocidad del scroll
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import 'lenis/dist/lenis.css'
import '@fontsource-variable/archivo/wdth.css'
import './landing.css'
import { startFilm } from './film'

const root = document.documentElement
const KEY = 'mm-motion'
const systemReduced = window.matchMedia('(prefers-reduced-motion: reduce)')
let lenis: Lenis | null = null
let stopFilm: (() => void) | null = null

// La elección del visitante, guardada si se puede; sin almacenamiento vale para esta visita
let choice: string | null = null
try { choice = localStorage.getItem(KEY) } catch { /* sin almacenamiento */ }
function choose(value: 'full' | 'reduced') {
  choice = value
  try { localStorage.setItem(KEY, value) } catch { /* sin almacenamiento: solo esta visita */ }
  apply()
}

// Scroll suave: la rueda del ratón avanza a saltos y las animaciones ligadas al scroll se verían a tirones.
// Lenis interpola la posición y además da la velocidad, que inclina lo que se mueve (--v).
// Va con el reloj de GSAP, para que la película del hero y el scroll avancen en el mismo fotograma
gsap.registerPlugin(ScrollTrigger)
gsap.ticker.lagSmoothing(0)
const tick = (time: number) => lenis?.raf(time * 1000)

function smooth(on: boolean) {
  if (on && !lenis) {
    lenis = new Lenis({ lerp: 0.085, anchors: true })
    lenis.on('scroll', ({ velocity }: { velocity: number }) => {
      root.style.setProperty('--v', Math.max(-1, Math.min(1, velocity / 45)).toFixed(3))
      ScrollTrigger.update()
    })
    gsap.ticker.add(tick)
  } else if (!on && lenis) {
    gsap.ticker.remove(tick)
    lenis.destroy()
    lenis = null
    root.style.setProperty('--v', '0')
  }
}

// La película necesita el contenedor alto y el escenario fijo (clase film) antes de medir
function film(on: boolean) {
  root.classList.toggle('film', on)
  if (on && !stopFilm) stopFilm = startFilm()
  else if (!on && stopFilm) {
    stopFilm()
    stopFilm = null
  }
  ScrollTrigger.refresh()
}

// Movimiento reducido si el sistema lo pide, salvo que el visitante haya elegido otra cosa
function apply() {
  const reduce = choice === 'reduced' || (choice !== 'full' && systemReduced.matches)
  root.classList.toggle('reduce-motion', reduce)
  smooth(!reduce)
  film(!reduce)
  const button = document.querySelector<HTMLButtonElement>('.motion')
  if (button) {
    button.setAttribute('aria-pressed', String(!reduce))
    button.querySelector('.state')!.textContent = reduce ? 'Off' : 'On'
    button.title = systemReduced.matches && !reduce
      ? 'Your system asks for reduced motion; showing full motion because you chose it'
      : 'Turn the scroll animations on or off'
  }
  // Sin movimiento, el disco del hero es el botón de play; si lo apagó el sistema, una línea explica por qué
  const play = document.querySelector<HTMLElement>('.disc-cta')
  if (play) play.hidden = !reduce
  const note = document.querySelector<HTMLElement>('.motion-note')
  if (note) note.hidden = !(reduce && choice === null)
}

document.querySelector('.motion')?.addEventListener('click', () => {
  choose(root.classList.contains('reduce-motion') ? 'full' : 'reduced')
})
// La película empieza siempre en el primer fotograma
document.querySelector('.disc-play')?.addEventListener('click', () => {
  choose('full')
  lenis?.scrollTo(0, { immediate: true })
})
systemReduced.addEventListener('change', apply)
apply()

// La app incrustada (05) solo se descarga en pantallas anchas con ratón: en móviles (también apaisados) y tabletas
// táctiles el marco está oculto y sin src. Una vez cargada se queda, aunque la ventana cambie.
// Misma consulta que el CSS, para que el marco nunca se vea sin src ni se cargue oculto
const small = window.matchMedia('(max-width: 760px), (pointer: coarse)')
const stage = document.querySelector<HTMLElement>('.demo')
const demo = document.querySelector<HTMLIFrameElement>('.demo-frame')
function loadDemo() {
  if (!demo || small.matches || demo.src) return
  demo.src = demo.dataset.src!
  small.removeEventListener('change', loadDemo)
}
small.addEventListener('change', loadDemo)
loadDemo()

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
