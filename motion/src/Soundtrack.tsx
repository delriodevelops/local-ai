import { getInputProps, Html5Audio, interpolate, Sequence, staticFile } from 'remotion'
import { RUN, SNAP } from './shots/Canvas'
import { FROM as END } from './shots/End'
import { FROM as MACHINE, IRIS } from './shots/Machine'
import { CLOSE } from './shots/NotAnymore'
import { CUTS } from './shots/Nos'
import { LAUNCH, SEND } from './shots/Prompts'
import { IMPACT, START } from './shots/Server'
import { at, DROP, FPS, MUSIC_TRIM, OUTRO, SHIFT, TAIL, TOTAL, V, VO_START } from './timing'

// La mezcla. La voz manda: va nivelada (vo-mix.wav, ver tools/stems.py) y la música queda 8-10 LU por debajo de cada
// frase; respira poco en las pausas y solo se abre del todo en el golpe y en los cambios de sección. Los efectos marcan
// los cortes de la imagen por debajo de la voz y de la música. Todo va a 0,6 para dejar margen: el máster
// (tools/master.py) sube el conjunto a −14 LUFS con un limitador
const MIX = 0.6
const CUT = Math.round(TAIL * FPS)
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

// La música bajo la voz, en una pausa larga dentro de una sección (4,5 dB más) y abierta
const UNDER = 0.1
const BREATH = UNDER * 10 ** (4.5 / 20)
const OPEN = 0.38

// El gancho: la música empieza con una subida muy floja que va creciendo. Estos niveles la dejan como una cama que se
// oye, 8-10 LU por debajo de la voz (al menos 6 en cada palabra), para que el vacío de después se note
const HOOK: [frame: number, level: number][] = [
  [0, 1.4],
  [20, 1.4],
  [24, 1.13],
  [33, 1.13],
  [37, 0.55],
  [88, 0.5],
]
// El vacío antes del golpe: desde que el prompt entra en el servidor (88) la música desaparece y «Not» suena sola
const VOID = 0.04

// Las frases de la voz: [primer fotograma, último que suena, qué hace la música en la pausa siguiente, nivel debajo].
// El final es el acústico, medido en la voz: la alineación de ElevenLabs alarga la última palabra de cada frase hasta 12
// fotogramas, y soltar la música desde ahí la hacía subir tarde y caer de golpe. En las pausas cortas (hold) no se mueve
type Gap = 'hold' | 'breath' | 'open' | 'drop'
const PHRASES: [start: number, end: number, gap: Gap, under?: number][] = [
  [100, 118, 'drop', 0.13], // Not anymore. (bajo «Not» manda el vacío; la música entra con «anymore.»)
  [134, 162, 'breath', 0.12], // This is MeshMind.
  [179, 259, 'breath'], // Wire AI models into flows, right in your browser.
  [274, 288, 'hold'], // They think.
  [297, 313, 'hold'], // They see.
  [324, 342, 'hold'], // They listen.
  [351, 369, 'open'], // They speak.
  [387, 428, 'hold'], // All on your own graphics card.
  [441, 461, 'hold'], // No server.
  [463, 480, 'hold'], // No account.
  [488, 515, 'open'], // No API key.
  [534, 568, 'hold'], // Your machine is the server.
  [580, 598, 'hold'], // MeshMind. (la música está en su compás en silencio)
  [622, 632, 'hold'], // Free,
  [640, 662, 'hold'], // in your browser. (debajo ya suena el outro)
]
// [subida desde el final de la frase, bajada antes de la siguiente], en fotogramas: lentas para que no bombee. En el
// golpe la música se abre enseguida, en cuanto acaba «anymore.», y vuelve a bajar justo antes de «This»
const RAMP: Record<Exclude<Gap, 'hold'>, [release: number, attack: number]> = { breath: [10, 8], open: [12, 8], drop: [3, 4] }

function bed(frame: number) {
  if (frame < 88) return interpolate(frame, HOOK.map(k => k[0]), HOOK.map(k => k[1]), clamp)
  if (frame < DROP) return interpolate(frame, [88, 96], [HOOK[HOOK.length - 1][1], VOID], clamp)
  const under = (i: number) => PHRASES[i]?.[3] ?? UNDER
  for (let i = 0; i < PHRASES.length; i++) {
    const [, end, gap] = PHRASES[i]
    const next = PHRASES[i + 1]?.[0]
    if (frame <= end || next === undefined) return under(i)
    if (frame >= next) continue
    if (gap === 'hold') return interpolate(frame, [next - 8, next - 1], [under(i), under(i + 1)], clamp)
    const [release, attack] = RAMP[gap]
    const rise = interpolate(frame, [end, end + release], [under(i), gap === 'breath' ? BREATH : OPEN], clamp)
    return interpolate(frame, [next - attack, next - 1], [rise, under(i + 1)], clamp)
  }
  return UNDER
}
const BED = Array.from({ length: TOTAL }, (_, f) => bed(f))

// El outro entra bajo «in your browser.», se abre en 10 fotogramas cuando la voz acaba y se apaga en el último segundo.
// Abierto a 0,4 queda al nivel de la voz, 3 LU por debajo de antes: el archivo nuevo lleva los graves 4 dB más bajos
// (tools/stems.py), que es lo que le da medios en un móvil
const LAST = PHRASES[PHRASES.length - 1][1]
const outro = (frame: number) =>
  interpolate(frame, [LAST, LAST + 10], [0.17, 0.4], clamp) * interpolate(frame, [TOTAL - 30, TOTAL - 1], [1, 0], clamp)

type Fx = 'blip' | 'boom' | 'clack' | 'click' | 'impact' | 'keys' | 'lock' | 'slice' | 'snap' | 'stamp' | 'swipe' | 'thud' | 'tick' | 'whoosh'
// [fotograma, efecto, ganancia, duración en fotogramas]. Por defecto dura 80, más que el efecto más largo, para no
// cortarle la cola
type Cue = readonly [frame: number, fx: Fx, gain: number, length?: number]

// Los efectos acompañan, no mandan: todos quedan al menos 10 LU por debajo de la voz y, salvo en el compás en que la
// música calla (579-638), por debajo de la música. Cada uno sale para que su pico caiga en el golpe de la imagen
// (whoosh.wav y swipe.wav golpean al empezar; slice.wav llega a su pico a los 0,23 s, siete fotogramas)
const CUES: Cue[] = [
  // 1. Se escribe la pregunta, se envía y el punto sale disparado
  [5, 'keys', 0.08, 32],
  [SEND - 1, 'click', 0.1],
  [LAUNCH - 1, 'whoosh', 0.07],
  // 2. El vuelo por el pasillo de racks, el impacto en la ranura y el registro que se escribe
  [START + 2, 'whoosh', 0.09],
  [IMPACT - 1, 'lock', 0.08],
  [IMPACT, 'thud', 0.06],
  [IMPACT + 5, 'keys', 0.04, 10],
  // 3. «Not» cae en el vacío con un golpe seco por debajo; en «anymore.» entra la música y el disco se abre
  [V.not, 'thud', 0.05],
  [DROP, 'boom', 0.08],
  // 4. El rojo se cierra en el disco y las letras llegan volando
  [CLOSE + 2, 'clack', 0.05],
  [V.this - 2, 'whoosh', 0.07],
  // 5. El cable encaja con «Wire», los demás se tienden solos, la señal sale y la cámara se aleja de golpe
  [SNAP - 1, 'snap', 0.08],
  ...[V.ai + 3, V.models + 1, V.models + 5, V.into, V.into + 3, V.into + 7].map(f => [f + 3, 'tick', 0.12] as const),
  [RUN, 'blip', 0.04],
  [V.right + 2, 'whoosh', 0.09],
  // 6. Los sentidos: un latigazo en cada «They» y el chasquido del nodo que se enciende en cada verbo
  ...V.they.map(f => [f - 1, 'swipe', 0.07] as const),
  ...[V.think, V.see, V.listen, V.speak].map(f => [f, 'blip', 0.035] as const),
  [V.speakEnd - 2, 'whoosh', 0.08],
  // 7. Corte a la tarjeta gráfica: el chip se enciende
  [V.all - 1, 'impact', 0.07],
  // 8. Los tres «No»: un sello en cada NO, la hoja en cada sustantivo y las dos mitades que salen despedidas
  ...CUTS.map(c => [c.no, 'stamp', 0.09] as const),
  ...CUTS.map((c, i) => [c.slash - 6, 'slice', [0.08, 0.06, 0.05][i]] as const),
  ...CUTS.map(c => [c.split, 'whoosh', 0.05] as const),
  // 9. Detrás del último corte, el rojo de la máquina; al final se cierra en el punto de la firma
  [MACHINE + 4, 'impact', 0.05],
  [IRIS + 2, 'clack', 0.05],
  // 10. La firma, en silencio: solo el golpecito del punto. tick.wav dura 40 ms, por eso pide más ganancia; aun así
  // queda más de 10 LU por debajo de «MeshMind.»
  [V.signEnd, 'tick', 0.22],
  // 11. El final: las columnas caen, el disco entra rodando y aparece el botón de la app
  [END + 1, 'clack', 0.05],
  [V.in - 4, 'swipe', 0.05],
  [V.lastBrowser + 6, 'blip', 0.05],
]

// Para medir la mezcla por pistas: remotion render ... --props='{"stem":"vo"}' deja sonar solo la voz (o "music", o "fx")
type Stem = 'vo' | 'music' | 'fx'
const STEM = (getInputProps() as { stem?: Stem }).stem

export function Soundtrack() {
  const vo = staticFile('audio/vo-mix.wav')
  const on = (stem: Stem) => !STEM || STEM === stem
  return (
    <>
      {/* La voz en dos tomas: la segunda entra SHIFT fotogramas antes y se come ese trozo de silencio */}
      {on('vo') && (
        <>
          <Sequence name="Voice" from={VO_START} durationInFrames={CUT - SHIFT} layout="none">
            <Html5Audio src={vo} durationInFrames={CUT - SHIFT} volume={MIX} />
          </Sequence>
          <Sequence name="Voice, sign-off" from={at(TAIL)} layout="none">
            <Html5Audio src={vo} trimBefore={CUT} volume={MIX} />
          </Sequence>
        </>
      )}

      {on('music') && (
        <>
          <Sequence name="Music" layout="none">
            <Html5Audio src={staticFile('audio/music-mix.wav')} trimBefore={MUSIC_TRIM} volume={f => MIX * BED[Math.min(f, TOTAL - 1)]} />
          </Sequence>
          <Sequence name="Music, outro" from={OUTRO} layout="none">
            <Html5Audio src={staticFile('audio/outro.wav')} volume={f => MIX * outro(OUTRO + f)} />
          </Sequence>
        </>
      )}

      {on('fx') &&
        CUES.map(([frame, name, gain, length = 80], i) => (
          <Sequence key={i} name={name} from={frame} durationInFrames={length} layout="none">
            <Html5Audio src={staticFile(`audio/fx/${name}.wav`)} volume={MIX * gain} />
          </Sequence>
        ))}
    </>
  )
}
