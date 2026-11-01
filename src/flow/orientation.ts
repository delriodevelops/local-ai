import { createContext } from 'react'
import type { XYPosition } from '@xyflow/react'

// En una pantalla estrecha puesta en vertical el flujo baja en lugar de ir hacia la derecha:
// las entradas de cada nodo pasan arriba y las salidas abajo
export const VERTICAL_QUERY = '(orientation: portrait) and (max-width: 1023px)'
export const Vertical = createContext(false)

// Las posiciones guardadas son siempre las del lienzo horizontal; en vertical se trasponen.
// Los nodos son más anchos que altos, así que las ramas paralelas (que pasan a ir una al lado de otra)
// y los pasos (que pasan a ir uno debajo de otro) necesitan algo más de aire
const ACROSS = 1.15
const DOWN = 1.25

export const toVertical = ({ x, y }: XYPosition): XYPosition => ({ x: y * ACROSS, y: x * DOWN })
export const fromVertical = ({ x, y }: XYPosition): XYPosition => ({ x: y / DOWN, y: x / ACROSS })
