// Entrar en la app por el disco: al pulsar un enlace a la app se abre desde el botón un anillo rojo que deja detrás
// el color con el que abrirá la app (papel u oscuro, según su tema), y entonces se navega. La app empieza con su
// propio disco rojo cayendo, así que el paso no tiene corte.
// Con Ctrl/Cmd/Mayús o clic central (otra pestaña o ventana), el enlace va como siempre
const EASE = 'cubic-bezier(.87,0,.13,1)'

// El fondo con el que abrirá la app: el mismo cálculo que hace app/index.html antes de pintar
function appBackground() {
  let theme: string | undefined
  try { theme = JSON.parse(localStorage.getItem('meshmind') ?? 'null')?.state?.theme } catch { /* sin almacenamiento */ }
  const dark = theme === 'dark' || (theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)
  return dark ? '#111111' : '#f2f2ef'
}

function veil(color: string) {
  const layer = document.createElement('div')
  layer.className = 'enter-veil'
  layer.style.background = color
  document.body.append(layer)
  return layer
}

export function enterThroughDisc() {
  const links = document.querySelectorAll<HTMLAnchorElement>('a[href^="./app/"]')
  let leaving = false
  let prefetched = false

  // Mientras el anillo se abre, la página de la app ya se está pidiendo
  const prefetch = () => {
    if (prefetched) return
    prefetched = true
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = './app/'
    document.head.append(link)
  }

  for (const link of links) {
    link.addEventListener('pointerenter', prefetch)
    link.addEventListener('focus', prefetch)
    link.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      if (leaving) return
      leaving = true
      const box = link.getBoundingClientRect()
      const x = box.left + box.width / 2
      const y = box.top + box.height / 2
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 2
      const circle = (r: number) => `circle(${r.toFixed(1)}px at ${x.toFixed(1)}px ${y.toFixed(1)}px)`
      const timing = { duration: 750, easing: EASE, fill: 'forwards' as const }
      veil('#ff3a1f').animate([{ clipPath: circle(0) }, { clipPath: circle(radius) }], timing)
      veil(appBackground())
        .animate([{ clipPath: circle(0) }, { clipPath: circle(radius) }], { ...timing, delay: 140 })
        .finished.then(() => location.assign(link.href))
    })
  }

  // Al volver con Atrás, la página sale de la caché tal como se quedó: sin el velo y con los enlaces vivos
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return
    document.querySelectorAll('.enter-veil').forEach(layer => layer.remove())
    leaving = false
  })
}
