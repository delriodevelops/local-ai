import { ArrowUp, ImagePlus, Mic } from 'lucide-react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { face, H, mono, NIGHT, PAPER, RED, W } from '../brand'
import { Glow } from '../fx/Glow'
import { clamp, ease, mix, prog, track, tween } from '../lib/motion'
import { V } from '../timing'

// 1. «Every prompt you type»: de la oscuridad se enfoca una caja de chat enorme, muy cerca, y alguien escribe algo que
// no contaría a cualquiera. Detrás, desenfocadas, flotan las cajas de otra gente, y cada una manda su mensaje: el texto
// se encoge en un punto rojo que sale disparado hacia la derecha. Al enviar la nuestra, la cámara sigue a su punto
// de un latigazo, y el corte cae en el viaje (Server.tsx)

const TYPED = 'explain my blood test results'
// Empieza a escribir antes de la voz y acaba en «type»; el clic cae en el golpe de la música (41)
const TYPE_FROM = 4
const TYPE_TO = V.type + 1
export const SEND = V.type + 6
export const LAUNCH = V.goes + 2

// Las cajas del fondo: lo que manda otra gente, cada una a su hora mientras la voz dice «Every prompt»
const OTHERS = [
  { text: 'draft my resignation letter', x: -560, y: -360, z: -900, send: 14 },
  { text: 'summarize my bank statements', x: 700, y: 330, z: -1500, send: 20 },
  { text: 'is this contract fair to me?', x: -980, y: 560, z: -2300, send: 25 },
  { text: 'translate my medical report', x: 1180, y: -600, z: -3000, send: 30 },
  { text: 'rewrite my apology to Sam', x: -260, y: -900, z: -3900, send: 35 },
  { text: 'what does this rash mean', x: 380, y: 860, z: -4500, send: 38 },
]

const FIELD = { w: 1880, h: 196, text: 100 }

// Una caja de chat oscura como la de la app: regla de 2 px, los botones de foto y voz, y el de enviar, cuadrado
function Field({ text, chars, caret, press, collapse, launch }: { text: string; chars: number; caret: boolean; press: number; collapse: number; launch: number }) {
  const shown = text.slice(0, Math.round(chars))
  const sent = launch > 0
  const red = press > 0 && press < 1
  return (
    <div
      style={{
        position: 'absolute',
        left: -FIELD.w / 2,
        top: -FIELD.h / 2,
        width: FIELD.w,
        height: FIELD.h,
        boxSizing: 'border-box',
        border: `2px solid rgba(242,242,239,${0.85 - 0.5 * collapse})`,
        background: 'rgba(17,17,17,0.92)',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        padding: '0 22px 0 30px',
      }}
    >
      <div style={{ ...mono(15, 'rgba(242,242,239,0.38)'), position: 'absolute', left: 0, top: -34, letterSpacing: '0.16em' }}>ASK ANYTHING</div>
      {[ImagePlus, Mic].map((Icon, i) => (
        <Icon key={i} size={40} color="rgba(242,242,239,0.35)" strokeWidth={1.6} />
      ))}
      <div style={{ flex: 1, minWidth: 0, height: FIELD.text * 1.3, position: 'relative', overflow: 'visible' }}>
        <div
          style={{
            ...face(500, 100),
            position: 'absolute',
            left: 8,
            top: 0,
            fontSize: FIELD.text,
            lineHeight: 1.3,
            letterSpacing: '-0.025em',
            color: PAPER,
            whiteSpace: 'nowrap',
            // Al enviar, el texto se encoge hacia el botón y se apaga: se convierte en el punto
            transform: `scaleX(${1 - collapse})`,
            transformOrigin: '1500px 50%',
            opacity: 1 - collapse,
            filter: collapse > 0 ? `blur(${collapse * 10}px)` : undefined,
          }}
        >
          {shown}
          {caret && <span style={{ display: 'inline-block', width: 6, height: FIELD.text * 0.95, marginLeft: 4, background: RED, verticalAlign: '-0.12em', boxShadow: `0 0 18px ${RED}` }} />}
        </div>
      </div>
      <div
        style={{
          width: 128,
          height: 128,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: red ? RED : chars > 0 && !sent ? PAPER : 'rgba(242,242,239,0.1)',
          color: red ? PAPER : '#111',
          transform: `scale(${1 - 0.08 * Math.sin(Math.PI * clamp(press))})`,
          boxShadow: red ? `0 0 60px 10px rgba(255,58,31,${0.5 * (1 - press)})` : undefined,
        }}
      >
        <ArrowUp size={64} strokeWidth={2.2} />
      </div>
    </div>
  )
}

// Dónde queda el botón de enviar respecto al centro de su caja
const BUTTON = { x: FIELD.w / 2 - 22 - 64, y: 0 }

export function Prompts() {
  const f = useCurrentFrame()

  // La cámara: empieza desenfocada y lejos, se acerca frenando y sigue al cursor a velocidad constante y lenta (para
  // que la pregunta se lea sin estela) y, al enviar, se va de un latigazo detrás del punto rojo
  const push = track(f, [[0, -380, ease.out], [SEND, 110, ease.soft], [LAUNCH + 10, 230, ease.in]])
  const truck = track(f, [[0, 40, ease.linear], [SEND, -330, ease.soft], [LAUNCH + 2, -360, ease.in], [LAUNCH + 10, -2900, ease.in]])
  const yaw = track(f, [[0, -30], [SEND + 4, -19, ease.soft]])
  const pitch = track(f, [[0, 11], [SEND + 4, 6, ease.soft]])
  // El foco: todo borroso al abrir, la caja se enfoca con «Every»
  const rack = tween(f, 0, V.every + 4, 22, 0, ease.soft)

  const chars = tween(f, TYPE_FROM, TYPE_TO, 0, TYPED.length, ease.linear)
  const press = prog(f, SEND - 1, SEND + 7, ease.linear)
  const collapse = prog(f, V.goes - 1, LAUNCH + 2, ease.in)
  const launch = prog(f, LAUNCH, LAUNCH + 12, ease.in)
  const caret = f < SEND ? (chars > 0 && chars < TYPED.length) || Math.floor(f / 8) % 2 === 0 : false

  return (
    <AbsoluteFill style={{ background: NIGHT, overflow: 'hidden' }}>
      {/* Una luz baja y fría que deja ver el aire alrededor de las cajas */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 70% at ${mix(38, 52, f / 60)}% 46%, rgba(242,242,239,0.07) 0%, rgba(242,242,239,0.045) 25%, rgba(242,242,239,0.02) 50%, rgba(242,242,239,0.006) 72%, rgba(0,0,0,0) 92%)` }} />
      <AbsoluteFill style={{ perspective: 1100, perspectiveOrigin: '50% 50%' }}>
        <div
          style={{
            position: 'absolute',
            left: W / 2,
            top: H / 2,
            transformStyle: 'preserve-3d',
            transform: `translateZ(${push}px) rotateX(${pitch}deg) rotateY(${yaw}deg) translateX(${truck}px)`,
          }}
        >
          {OTHERS.map((o, i) => {
            const c = prog(f, o.send, o.send + 7, ease.in)
            const go = prog(f, o.send + 4, o.send + 18, ease.in)
            const blur = 3 + (-o.z / 1000) * 3.2
            return (
              <div key={i} style={{ position: 'absolute', transformStyle: 'preserve-3d', transform: `translate3d(${o.x}px, ${o.y}px, ${o.z}px)` }}>
                <div style={{ filter: `blur(${blur}px)`, opacity: 0.75 }}>
                  <Field text={o.text} chars={o.text.length} caret={false} press={prog(f, o.send - 2, o.send + 6, ease.linear)} collapse={c} launch={go} />
                </div>
                {go > 0 && go < 1 && <Glow x={BUTTON.x + 2600 * go} y={BUTTON.y} size={26} power={1.4} streak={0.8} style={{ filter: `blur(${blur * 0.4}px)` }} />}
              </div>
            )
          })}
          <div style={{ position: 'absolute', transformStyle: 'preserve-3d', filter: rack > 0.2 ? `blur(${rack}px)` : undefined }}>
            <Field text={TYPED} chars={chars} caret={caret} press={press} collapse={collapse} launch={launch} />
            {collapse > 0.4 && launch < 1 && <Glow x={BUTTON.x + 2400 * launch} y={BUTTON.y} size={mix(10, 30, prog(f, V.goes, LAUNCH + 1))} power={1.6} streak={1.2} />}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
