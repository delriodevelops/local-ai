import { canvasRun } from './canvas'
import { demo } from './demo'
import { finale, signature } from './finale'
import { hud } from './hud'
import { machine } from './machine'
import { manifesto } from './manifesto'
import { reveals } from './reveals'
import { senses } from './senses'
import { templates } from './templates'

// Las escenas de después del hero, en el orden de la página: las que se quedan fijas reservan su recorrido y las
// de debajo tienen que medirse después (reveals y hud cubren toda la página y van al final).
// Cada una devuelve cómo deshacerse, para cuando se apaga el movimiento
export function startScenes() {
  const stops = [manifesto(), canvasRun(), senses(), machine(), templates(), demo(), finale(), signature(), reveals(), hud()]
  return () => stops.reverse().forEach(stop => stop())
}
