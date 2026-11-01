// La landing es HTML y CSS; este módulo trae la fuente (servida desde la propia web), los estilos,
// el scroll suave, el botón de movimiento y la inclinación según la velocidad del scroll
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import '@fontsource-variable/archivo/wdth.css'
import './landing.css'

const root = document.documentElement
const KEY = 'mm-motion'
const systemReduced = window.matchMedia('(prefers-reduced-motion: reduce)')
let lenis: Lenis | null = null

function stored() {
  try { return localStorage.getItem(KEY) } catch { return null }
}

// Scroll suave: la rueda del ratón avanza a saltos y las animaciones ligadas al scroll se verían a tirones.
// Lenis interpola la posición y además da la velocidad, que inclina lo que se mueve (--v)
function smooth(on: boolean) {
  if (on && !lenis) {
    lenis = new Lenis({ autoRaf: true, lerp: 0.085, anchors: true })
    lenis.on('scroll', ({ velocity }: { velocity: number }) => {
      root.style.setProperty('--v', Math.max(-1, Math.min(1, velocity / 45)).toFixed(3))
    })
  } else if (!on && lenis) {
    lenis.destroy()
    lenis = null
    root.style.setProperty('--v', '0')
  }
}

// Movimiento reducido si el sistema lo pide, salvo que el visitante haya elegido otra cosa
function apply() {
  const choice = stored()
  const reduce = choice === 'reduced' || (choice !== 'full' && systemReduced.matches)
  root.classList.toggle('reduce-motion', reduce)
  smooth(!reduce)
  const button = document.querySelector<HTMLButtonElement>('.motion')
  if (button) {
    button.setAttribute('aria-pressed', String(!reduce))
    button.querySelector('.state')!.textContent = reduce ? 'Off' : 'On'
    button.title = systemReduced.matches && !reduce
      ? 'Your system asks for reduced motion; showing full motion because you chose it'
      : 'Turn the scroll animations on or off'
  }
}

document.querySelector('.motion')?.addEventListener('click', () => {
  const reduce = !root.classList.contains('reduce-motion')
  try { localStorage.setItem(KEY, reduce ? 'reduced' : 'full') } catch { /* sin almacenamiento: solo esta visita */ }
  apply()
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
