import type { CSSProperties } from 'react'

// La marca de la landing llevada al cine: la tinta se hace escenario, el papel es la letra y la luz, y el único rojo
// es la señal, lo que viaja por los cables
export const W = 1920
export const H = 1080
export const FPS = 30

// El escenario es más hondo que la tinta de la web (#111) para que el rojo brille encima
export const NIGHT = '#0a0a0a'
export const INK = '#111111'
export const PAPER = '#f2f2ef'
export const RED = '#ff3a1f'
// Las reglas y los grises del tema oscuro de la app (src/index.css, .dark)
export const RULE = '#3a3a3a'
export const MUTED = '#85857f'
export const SOFT = '#a3a39d'

export const FONT = "'Archivo', system-ui, sans-serif"
export const MONO = "'IBM Plex Mono', ui-monospace, monospace"

// Archivo tiene dos ejes: peso (100-900) y ancho (62-125 %). face(900, 62) es la condensada negra del «MIND» de la
// landing; face(900, 125), la expandida del «MESH». Los dos ejes se pueden animar fotograma a fotograma
export const face = (wght: number, wdth = 100): CSSProperties => ({
  fontFamily: FONT,
  fontWeight: wght,
  fontStretch: `${wdth}%`,
  fontVariationSettings: `'wght' ${wght}, 'wdth' ${wdth}`,
})

// La etiqueta de la web y de la app (.label): mayúsculas pequeñas y espaciadas
export const label = (size = 13, color = MUTED): CSSProperties => ({
  fontFamily: FONT,
  fontSize: size,
  fontWeight: 600,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color,
  whiteSpace: 'nowrap',
})

// La lectura técnica (contadores, registros, coordenadas): IBM Plex Mono
export const mono = (size = 13, color = MUTED): CSSProperties => ({
  fontFamily: MONO,
  fontSize: size,
  letterSpacing: '0.02em',
  color,
  whiteSpace: 'nowrap',
  fontVariantNumeric: 'tabular-nums',
})
