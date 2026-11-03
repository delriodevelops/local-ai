import type { CSSProperties } from 'react'
import { FONT, MONO } from '../brand'

// El tema oscuro de la app (src/index.css, .dark): el «papel» es #111 y la «tinta» #f2f2ef; las zonas se separan con
// reglas de #3a3a3a y el rojo es la señal. Esquinas rectas
export const UI = {
  bg: '#111111',
  text: '#f2f2ef',
  t100: '#ecece8',
  t300: '#bdbdb8',
  t400: '#a3a39d',
  t500: '#85857f',
  t600: '#5f5f5a',
  t700: '#4a4a46',
  t800: '#222221',
  line: '#3a3a3a',
  grid: 'rgba(242,242,239,0.055)',
  signal: '#ff3a1f',
  signalInk: '#ff6b52',
}

// Los colores de los tipos de cable (flow/graph.ts, PORT_COLOR); el del texto es la tinta del tema
export const PORT = { text: '#f2f2ef', list: '#2f5bff', image: '#ff3a1f', audio: '#d98e00', video: '#7c4dff' } as const
export type PortType = keyof typeof PORT

// El texto en el color de un tipo, mezclado con la tinta del tema como en la app (graph.ts, portText)
export const portText = (color: string) => `color-mix(in oklab, ${color} 65%, ${UI.text})`

// .label de la app: mayúsculas de 11 px espaciadas
export const tag: CSSProperties = { fontFamily: FONT, fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: UI.t500, whiteSpace: 'nowrap' }
export const uiMono: CSSProperties = { fontFamily: MONO, fontSize: 12.5, color: UI.t100, whiteSpace: 'nowrap' }
