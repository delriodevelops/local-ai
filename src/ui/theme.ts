import { useSyncExternalStore } from 'react'
import { useApp, type Theme } from '@/flow/store'

export type Scheme = 'light' | 'dark'

// Color de la barra del navegador en cada tema: el del fondo
const BACKGROUND: Record<Scheme, string> = { light: '#f2f2ef', dark: '#0f0f0e' }

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()

const resolve = (theme: Theme): Scheme => (theme === 'system' ? (prefersDark.matches ? 'dark' : 'light') : theme)

let scheme = resolve(useApp.getState().theme)

function apply() {
  const next = resolve(useApp.getState().theme)
  const root = document.documentElement
  // Sin transiciones durante el cambio: si no, cada elemento con duration-* cambiaría de color a destiempo
  root.classList.add('theme-change')
  root.classList.toggle('dark', next === 'dark')
  root.style.colorScheme = next
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BACKGROUND[next])
  // Fuerza el recálculo de estilos con las transiciones apagadas antes de volver a encenderlas
  void getComputedStyle(root).color
  requestAnimationFrame(() => root.classList.remove('theme-change'))
  if (next === scheme) return
  scheme = next
  listeners.forEach(listener => listener())
}

// El script de app/index.html ya lo aplicó antes de pintar; aquí se mantiene al día
apply()
useApp.subscribe((state, prev) => { if (state.theme !== prev.theme) apply() })
prefersDark.addEventListener('change', apply)

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

// Tema ya resuelto ('system' convertido en claro u oscuro), para lo que no puede usar variables CSS
export const useScheme = () => useSyncExternalStore(subscribe, () => scheme)
