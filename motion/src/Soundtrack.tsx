import { Html5Audio, interpolate, Sequence, staticFile } from 'remotion'
import { at, FPS, MUSIC_TRIM, OUTRO, SHIFT, SPEECH, T, TAIL, VO_START } from './timing'

// La mezcla. La voz manda; la música baja debajo de cada frase y respira en las pausas, y los efectos marcan los
// cortes y los golpes de la imagen. Todo va a 0,6 para dejar margen: el máster (tools/master.py) sube el conjunto a
// −14 LUFS con un limitador
const MIX = 0.6
const CUT = Math.round(TAIL * FPS)
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

// Cuánto habla la voz en cada fotograma, de 0 a 1: baja la música un poco antes de cada palabra y la suelta justo después
const SPEAKING = Array.from({ length: T.total }, (_, f) =>
  Math.max(0, ...SPEECH.map(([s, e]) => Math.min(interpolate(f, [s - 5, s - 1], [0, 1], clamp), interpolate(f, [e + 2, e + 8], [1, 0], clamp)))),
)
const duck = (frame: number, under: number, open: number) => open + (under - open) * (SPEAKING[Math.min(frame, T.total - 1)] ?? 0)

type Fx = 'click' | 'glitch' | 'impact' | 'riser' | 'swipe' | 'thud' | 'whoosh'
type Cue = readonly [frame: number, fx: Fx, gain: number]
const CUES: Cue[] = [
  // 1. El prompt cae en el servidor de otro y el rojo lo inunda
  [36, 'thud', 0.5],
  [44, 'click', 0.4],
  [47, 'whoosh', 0.28],
  [64, 'glitch', 0.3],
  [79, 'swipe', 0.32],
  [88, 'whoosh', 0.3],
  // 2. «Not anymore.», con la entrada fuerte de la música
  [T.not, 'thud', 0.55],
  [at(3.16), 'impact', 0.42],
  // 3. El título: el rojo se encoge, caen las letras y todo sale
  [T.title - 1, 'whoosh', 0.22],
  [T.title + 14, 'thud', 0.45],
  [T.flow - 10, 'swipe', 0.3],
  // 4. Los nodos aparecen uno a uno; la cámara se aleja y la banda roja tapa el corte
  ...[0, 6, 9, 12, 18].map(d => [T.flow + d, 'click', 0.32] as const),
  [T.browser - 8, 'whoosh', 0.22],
  [T.think - 8, 'swipe', 0.32],
  // 5. Un golpe por verbo; la onda de «speak»; sube la tinta
  ...[T.think, T.see, T.listen, T.speak].map(t => [t, 'thud', 0.5] as const),
  [T.speak + 2, 'whoosh', 0.16],
  [T.local - 8, 'swipe', 0.32],
  // 6. Los tres «No» y la subida hacia el disco, que se abre
  ...[T.noServer, T.noAccount, T.noKey].flatMap(t => [[t, 'thud', 0.55], [t, 'click', 0.3]] as const),
  [T.iris - 36, 'riser', 0.09],
  [T.iris, 'impact', 0.35],
  // 8. La firma, en el tiempo fuerte que la música deja en silencio; el punto rojo; el subrayado de la dirección
  [T.end, 'impact', 0.55],
  [T.end + 10, 'thud', 0.45],
  [T.end + 17, 'click', 0.35],
  [T.free + 16, 'swipe', 0.25],
]

export function Soundtrack() {
  const vo = staticFile('audio/vo.mp3')
  return (
    <>
      {/* La voz en dos tomas: la segunda entra SHIFT fotogramas antes y se come ese trozo de silencio */}
      <Sequence name="Voice" from={VO_START} durationInFrames={CUT - SHIFT} layout="none">
        <Html5Audio src={vo} durationInFrames={CUT - SHIFT} volume={MIX} />
      </Sequence>
      <Sequence name="Voice, sign-off" from={at(TAIL)} layout="none">
        <Html5Audio src={vo} trimBefore={CUT} volume={MIX} />
      </Sequence>

      <Sequence name="Music" layout="none">
        <Html5Audio src={staticFile('audio/music.mp3')} trimBefore={MUSIC_TRIM} volume={f => MIX * duck(f, 0.11, 0.3)} />
      </Sequence>
      <Sequence name="Music, outro" from={OUTRO} layout="none">
        <Html5Audio src={staticFile('audio/outro.wav')} volume={f => MIX * duck(OUTRO + f, 0.16, 0.34) * interpolate(OUTRO + f, [T.total - 30, T.total - 1], [1, 0], clamp)} />
      </Sequence>

      {CUES.map(([frame, fx, gain], i) => (
        <Sequence key={i} name={fx} from={frame} durationInFrames={40} layout="none">
          <Html5Audio src={staticFile(`audio/fx/${fx}.wav`)} volume={MIX * gain} />
        </Sequence>
      ))}
    </>
  )
}
