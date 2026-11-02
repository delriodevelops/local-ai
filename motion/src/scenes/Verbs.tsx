import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { display, EASE, FONT, MARGIN, MUTED, PAPER, RED, tween, W } from '../brand'
import { T } from '../timing'

// 5. «They think. They see. They listen. They speak.» Un corte por verbo, sin iconos: cada palabra se mueve a su manera.
// THINK: tres copias llegan de tres lados y se funden en una. SEE: una lente roja pasa por encima y dentro la palabra
// se ve en papel. LISTEN: las letras botan como un ecualizador. SPEAK: la palabra se ensancha y deja una onda
export const VERBS_LENGTH = T.local - T.think
const BEATS = [T.think, T.see, T.listen, T.speak].map(t => t - T.think)
const MODELS = ['Qwen · Llama', 'Janus-Pro', 'Whisper', 'Kokoro']
const SIZE = 330
const Y = 300
const LENS = 200

function Word({ text, style }: { text: string; style?: React.CSSProperties }) {
  return <div style={{ ...display, fontSize: SIZE, lineHeight: 0.82, whiteSpace: 'nowrap', position: 'absolute', left: MARGIN, top: Y, ...style }}>{text}</div>
}

function Think({ f }: { f: number }) {
  const p = tween(f, 0, 10, 0, 1, EASE.out)
  return (
    <>
      <Word text="Think" style={{ color: RED, transform: `translate(${(1 - p) * -500}px, ${(1 - p) * -120}px)`, opacity: 1 - p }} />
      <Word text="Think" style={{ color: RED, transform: `translate(${(1 - p) * 600}px, ${(1 - p) * 140}px)`, opacity: 1 - p }} />
      <Word text="Think" style={{ transform: `translateY(${(1 - p) * 220}px)`, opacity: p }} />
    </>
  )
}

function See({ f, length }: { f: number; length: number }) {
  // El recorte de la copia en papel va en coordenadas de la propia palabra, que empieza en (MARGIN, Y)
  const x = tween(f, 0, length, -LENS, 900, EASE.soft)
  return (
    <>
      <Word text="See" />
      <div style={{ position: 'absolute', left: MARGIN + x - LENS, top: Y + 140 - LENS, width: LENS * 2, height: LENS * 2, borderRadius: '50%', background: RED }} />
      <Word text="See" style={{ color: PAPER, clipPath: `circle(${LENS}px at ${x}px 140px)` }} />
    </>
  )
}

function Listen({ f }: { f: number }) {
  return (
    <div style={{ ...display, fontSize: SIZE, lineHeight: 0.82, position: 'absolute', left: MARGIN, top: Y, whiteSpace: 'nowrap' }}>
      {'Listen'.split('').map((ch, i) => {
        const wave = Math.abs(Math.sin(f * 0.55 + i * 0.9))
        return <span key={i} style={{ display: 'inline-block', transformOrigin: 'bottom', transform: `scaleY(${0.45 + wave * 0.7})`, color: i === 2 ? RED : undefined }}>{ch}</span>
      })}
    </div>
  )
}

function Speak({ f }: { f: number }) {
  const wdth = 62 + 63 * tween(f, 0, 14, 0, 1, EASE.out)
  const ring = tween(f, 2, 26, 0, 1, EASE.out)
  return (
    <>
      <div style={{ position: 'absolute', left: MARGIN - ring * 900 + 40, top: Y + 135 - ring * 900, width: ring * 1800, height: ring * 1800, borderRadius: '50%', border: `${10 * (1 - ring) + 2}px solid ${RED}`, opacity: 1 - ring * 0.8 }} />
      <Word text="Speak" style={{ fontVariationSettings: `"wdth" ${wdth}` }} />
    </>
  )
}

export function Verbs() {
  const f = useCurrentFrame()
  const index = BEATS.findLastIndex(b => f >= b)
  const local = f - BEATS[index]
  const length = (BEATS[index + 1] ?? VERBS_LENGTH) - BEATS[index]
  // La banda roja que tapa el corte desde el lienzo se va por la derecha
  const band = tween(f, 0, 8, 0, W, EASE.out)
  // Y la de tinta que lleva a la sección oscura entra desde abajo al final
  const ink = tween(f, VERBS_LENGTH - 8, VERBS_LENGTH - 1, 1080, 0, EASE.in)

  return (
    <AbsoluteFill style={{ background: PAPER, overflow: 'hidden' }}>
      {index === 0 && <Think f={local} />}
      {index === 1 && <See f={local} length={length} />}
      {index === 2 && <Listen f={local} />}
      {index === 3 && <Speak f={local} />}
      <div style={{ position: 'absolute', left: MARGIN, top: Y + SIZE * 0.9 + 60, fontFamily: FONT, fontSize: 48, fontWeight: 600, color: MUTED, opacity: tween(local, 2, 8) }}>{MODELS[index]}</div>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: band, width: W, background: RED }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: ink, height: 1080, background: '#111111' }} />
    </AbsoluteFill>
  )
}
