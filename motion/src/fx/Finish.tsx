import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion'
import { rand } from '../lib/motion'

const TILES = [0, 1, 2, 3].map(i => staticFile(`grain/${i}.png`))

// El acabado de cine, encima de todo y fuera del desenfoque de movimiento (si no, el grano se promedia y desaparece):
// - grano de película que cambia en cada fotograma (cuatro baldosas de public/grain, en un sitio al azar);
// - un velo de grano muy flojo en aclarar, para que los negros no queden planos como en una pantalla;
// - viñeta: los bordes caen un poco, como en un objetivo de verdad
export function Finish({ grain = 1, vignette = 1 }: { grain?: number; vignette?: number }) {
  const f = Math.floor(useCurrentFrame())
  const tile = TILES[f % 4]
  const at = `${Math.floor(rand(f + 1) * 512)}px ${Math.floor(rand(f + 77) * 512)}px`
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* Las baldosas cargan con Img para que el render las espere; el fondo en CSS no avisa cuando ha cargado */}
      <div style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 }}>
        {TILES.map(src => (
          <Img key={src} src={src} />
        ))}
      </div>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 80% 80% at 50% 48%, rgba(0,0,0,0) 52%, rgba(0,0,0,${0.5 * vignette}) 100%)`,
        }}
      />
      <AbsoluteFill style={{ backgroundImage: `url(${tile})`, backgroundPosition: at, mixBlendMode: 'overlay', opacity: 0.16 * grain }} />
      <AbsoluteFill style={{ backgroundImage: `url(${tile})`, backgroundPosition: at, mixBlendMode: 'screen', opacity: 0.045 * grain }} />
    </AbsoluteFill>
  )
}
