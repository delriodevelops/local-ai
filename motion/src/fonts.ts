import { useEffect, useState } from 'react'
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion'

// Las letras de la web y de la app: Archivo con sus dos ejes (peso y ancho) e IBM Plex Mono, solo la normal, para lo
// poco que la app pone en mono (el nombre del modelo y el número de plantillas)
const FACES = [
  new FontFace('Archivo', `url('${staticFile('fonts/archivo-wdth.woff2')}') format('woff2')`, { weight: '100 900', stretch: '62% 125%' }),
  new FontFace('IBM Plex Mono', `url('${staticFile('fonts/ibm-plex-mono-latin-400-normal.woff2')}') format('woff2')`, { weight: '400' }),
]

// Si una letra no carga, el error dice cuál
const ready = Promise.all(
  FACES.map(face =>
    face.load().then(
      loaded => document.fonts.add(loaded),
      error => {
        throw new Error(`Font ${face.family} ${face.weight} did not load: ${error}`)
      },
    ),
  ),
)

// Nada se pinta ni se mide hasta tener las letras. Si alguna falla, el render se para (cancelRender) en vez de salir
// con la letra del sistema
export function useFonts() {
  const [loaded, setLoaded] = useState(false)
  const [handle] = useState(() => delayRender('Loading fonts'))
  useEffect(() => {
    ready.then(
      () => setLoaded(true),
      error => cancelRender(error),
    )
  }, [])
  useEffect(() => {
    if (loaded) continueRender(handle)
  }, [loaded, handle])
  return loaded
}
