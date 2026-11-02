import { continueRender, delayRender, registerRoot, staticFile } from 'remotion'
import { RemotionRoot } from './Root'

// Archivo con sus dos ejes (peso y ancho), la misma de la web. Ningún fotograma se pinta antes de tenerla
const waiting = delayRender('Loading Archivo')
const archivo = new FontFace('Archivo', `url('${staticFile('fonts/archivo-wdth.woff2')}') format('woff2')`, { weight: '100 900', stretch: '62% 125%' })
archivo
  .load()
  .then(font => {
    document.fonts.add(font)
    continueRender(waiting)
  })
  .catch(error => {
    console.error(error)
    continueRender(waiting)
  })

registerRoot(RemotionRoot)
