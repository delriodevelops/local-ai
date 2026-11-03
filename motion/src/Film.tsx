import type { ComponentType } from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { NIGHT } from './brand'
import { Blur } from './fx/Blur'
import { Finish } from './fx/Finish'
import { useFonts } from './fonts'
import { track } from './lib/motion'
import { Canvas, CanvasOver } from './shots/Canvas'
import { Chip } from './shots/Chip'
import { End, FROM as END } from './shots/End'
import { FROM as MACHINE, IRIS, Machine } from './shots/Machine'
import { CLOSE, NotAnymore } from './shots/NotAnymore'
import { CUTS, LAST_SPLIT, Nos } from './shots/Nos'
import { LAUNCH, Prompts } from './shots/Prompts'
import { Senses, SensesOver } from './shots/Senses'
import { IMPACT, Server, START as SERVER } from './shots/Server'
import { Sign } from './shots/Sign'
import { Title } from './shots/Title'
import { Soundtrack } from './Soundtrack'
import { DROP, TOTAL, V } from './timing'

// La v6: una película, no una presentación. Cada toma vive entre dos fotogramas (de from a to, sin incluir to) y se
// pinta con su propio desenfoque de movimiento (samples: cuántas veces por fotograma). El orden de la lista es el
// orden en que se tapan: la que entra por debajo espera a que la de encima se abra (el rojo que se cierra en el disco
// del título o en el punto de la firma, los cortes que se parten, las columnas que caen)
// samples puede depender del fotograma: los latigazos y los golpes de cámara piden muchas más muestras para que la
// estela salga continua y no en copias sueltas
type Samples = number | ((f: number) => number)
// Over: lo que va pegado a la pantalla (notas, contadores, la profundidad de campo), fuera del desenfoque de movimiento
type Shot = { name: string; from: number; to: number; samples: Samples; Body: ComponentType; Over?: ComponentType }

// Más muestras dentro de los tramos rápidos [desde, hasta]
const fast = (base: number, peak: number, spans: [number, number][]) => (f: number) => (spans.some(([a, b]) => f >= a && f <= b) ? peak : base)
const SHOTS: Shot[] = [
  { name: 'Prompts', from: 0, to: SERVER, samples: fast(8, 28, [[LAUNCH, SERVER]]), Body: Prompts },
  { name: 'Server', from: SERVER, to: V.not, samples: fast(8, 18, [[SERVER, IMPACT + 2]]), Body: Server },
  { name: 'Title', from: CLOSE - 2, to: V.wire, samples: fast(6, 14, [[V.this - 2, V.meshmind + 14]]), Body: Title },
  { name: 'Not anymore', from: V.not, to: CLOSE + 10, samples: fast(6, 18, [[V.not, V.not + 4], [DROP, DROP + 9], [CLOSE, CLOSE + 9]]), Body: NotAnymore },
  { name: 'Canvas', from: V.wire, to: V.they[0], samples: fast(8, 22, [[V.right + 2, V.right + 16]]), Body: Canvas, Over: CanvasOver },
  { name: 'Senses', from: V.they[0], to: V.all, samples: fast(5, 12, [[V.speakEnd - 2, V.all]]), Body: Senses, Over: SensesOver },
  { name: 'Chip', from: V.all, to: V.no[0] - 3, samples: 6, Body: Chip },
  { name: 'Sign', from: IRIS - 2, to: END + 12, samples: 4, Body: Sign },
  { name: 'Machine', from: MACHINE, to: IRIS + 10, samples: fast(6, 16, [[IRIS, IRIS + 9]]), Body: Machine },
  { name: 'Nos', from: V.no[0] - 3, to: LAST_SPLIT + 13, samples: fast(6, 20, CUTS.map(c => [c.split, c.split + 13] as [number, number])), Body: Nos },
  { name: 'End', from: END, to: TOTAL, samples: fast(4, 12, [[END, END + 12], [V.in - 6, V.in + 14]]), Body: End },
]

// El acabado: en el papel y el rojo la viñeta casi desaparece, para que no se ensucien
const PAPERY: [number, number][] = [[CLOSE, V.wire], [MACHINE, IRIS + 8], [END + 6, TOTAL]]
const vignette = (f: number) => (PAPERY.some(([a, b]) => f >= a && f < b) ? 0.3 : 1)

function Shots() {
  const f = useCurrentFrame()
  return (
    <>
      {SHOTS.filter(s => f >= s.from && f < s.to).map(({ name, samples, Body, Over }) => (
        <AbsoluteFill key={name}>
          <Blur samples={typeof samples === 'number' ? samples : samples(Math.floor(f))}>
            <Body />
          </Blur>
          {Over && <Over />}
        </AbsoluteFill>
      ))}
    </>
  )
}

export function Film() {
  const ready = useFonts()
  const f = useCurrentFrame()
  return (
    <AbsoluteFill style={{ background: NIGHT }}>
      {ready && <Shots />}
      <Finish vignette={vignette(f)} grain={track(f, [[0, 1]])} />
      <Soundtrack />
    </AbsoluteFill>
  )
}
