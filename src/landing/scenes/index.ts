import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { canvasRun } from './canvas'
import { finale, signature } from './finale'
import { hud } from './hud'
import { manifesto } from './manifesto'
import { reveals } from './reveals'

// Las escenas de después del hero, en el orden de la página: las que se quedan fijas reservan su recorrido y las
// de debajo tienen que medirse después. Cada una devuelve cómo deshacerse, para cuando se apaga el movimiento
export function startScenes() {
  const stops = [manifesto(), canvasRun(), finale(), signature(), reveals(), hud()]
  ScrollTrigger.sort()
  return () => stops.reverse().forEach(stop => stop())
}
