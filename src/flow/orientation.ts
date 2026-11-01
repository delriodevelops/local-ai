import { createContext } from 'react'
import type { XYPosition } from '@xyflow/react'

// En una pantalla estrecha puesta en vertical el flujo baja en lugar de ir hacia la derecha:
// las entradas de cada nodo pasan arriba y las salidas abajo
export const VERTICAL_QUERY = '(orientation: portrait) and (max-width: 1023px)'
export const Vertical = createContext(false)

// Las posiciones guardadas son siempre las del lienzo horizontal; en vertical se trasponen.
// Los nodos son más anchos que altos: las ramas paralelas, que pasan a ir una al lado de otra, necesitan algo
// más de aire. Entre pasos ya sobra, y estirarlo haría que lo ordenado en vertical se amontonase al girar
const ACROSS = 1.15
const DOWN = 1

export const toVertical = ({ x, y }: XYPosition): XYPosition => ({ x: y * ACROSS, y: x * DOWN })
export const fromVertical = ({ x, y }: XYPosition): XYPosition => ({ x: y / DOWN, y: x / ACROSS })
