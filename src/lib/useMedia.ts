import { useCallback, useSyncExternalStore } from 'react'

// Si la pantalla cumple una media query; se actualiza al girar el móvil o cambiar el tamaño de la ventana
export function useMedia(query: string) {
  const subscribe = useCallback((onChange: () => void) => {
    const media = window.matchMedia(query)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [query])
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}
