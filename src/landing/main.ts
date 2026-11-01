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

// La app incrustada (05) solo se descarga en pantallas anchas: en el móvil el marco está oculto y sin src.
// Una vez cargada se queda, aunque la ventana se estreche
// Mismo corte que el CSS (max-width: 760px), negado, para que no quede un hueco con anchos fraccionarios
const narrow = window.matchMedia('(max-width: 760px)')
const demo = document.querySelector<HTMLIFrameElement>('.demo-frame')
function loadDemo() {
  if (!demo || narrow.matches || demo.src) return
  demo.src = demo.dataset.src!
  narrow.removeEventListener('change', loadDemo)
}
narrow.addEventListener('change', loadDemo)
loadDemo()
