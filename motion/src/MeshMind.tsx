import { AbsoluteFill, Sequence } from 'remotion'
import { PAPER } from './brand'
import { Browser, BROWSER_LENGTH } from './scenes/Browser'
import { END_LENGTH, EndCard } from './scenes/EndCard'
import { Hook } from './scenes/Hook'
import { Iris, IRIS_LENGTH } from './scenes/Iris'
import { Local, LOCAL_LENGTH } from './scenes/Local'
import { NOT_LENGTH, NotAnymore } from './scenes/NotAnymore'
import { Title, TITLE_LENGTH } from './scenes/Title'
import { Verbs, VERBS_LENGTH } from './scenes/Verbs'
import { Soundtrack } from './Soundtrack'
import { T } from './timing'

// El guion, en orden. Cada escena empieza donde acaba la anterior y recoge lo que esta deja en pantalla; los cortes
// caen donde la voz empieza cada frase
const SCENES = [
  { name: "Someone else's server", Scene: Hook, length: T.not },
  { name: 'Not anymore', Scene: NotAnymore, length: NOT_LENGTH },
  { name: 'This is MeshMind', Scene: Title, length: TITLE_LENGTH },
  { name: 'Flows in your browser', Scene: Browser, length: BROWSER_LENGTH },
  { name: 'Think, see, listen, speak', Scene: Verbs, length: VERBS_LENGTH },
  { name: 'Your own GPU', Scene: Local, length: LOCAL_LENGTH },
  { name: 'Your machine is the server', Scene: Iris, length: IRIS_LENGTH },
  { name: 'MeshMind', Scene: EndCard, length: END_LENGTH },
]
export const LENGTH = SCENES.reduce((sum, s) => sum + s.length, 0)

export function MeshMind() {
  let from = 0
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      {SCENES.map(({ name, Scene, length }) => {
        const start = from
        from += length
        return (
          <Sequence key={name} name={name} from={start} durationInFrames={length}>
            <Scene />
          </Sequence>
        )
      })}
      <Soundtrack />
    </AbsoluteFill>
  )
}
