import { noise2D } from '@remotion/noise'

// Todo se calcula a partir del fotograma, que puede ser fraccionario: el desenfoque de movimiento (fx/Blur.tsx) pinta
// cada fotograma varias veces entre el anterior y el siguiente

// Una curva de Bézier cúbica como las de CSS (cubic-bezier), resuelta por Newton
export function bezier(x1: number, y1: number, x2: number, y2: number) {
  const ax = 3 * x1 - 3 * x2 + 1
  const bx = 3 * x2 - 6 * x1
  const cx = 3 * x1
  const ay = 3 * y1 - 3 * y2 + 1
  const by = 3 * y2 - 6 * y1
  const cy = 3 * y1
  const x = (t: number) => ((ax * t + bx) * t + cx) * t
  const y = (t: number) => ((ay * t + by) * t + cy) * t
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx
  return (p: number) => {
    if (p <= 0) return 0
    if (p >= 1) return 1
    let t = p
    for (let i = 0; i < 8; i++) {
      const d = dx(t)
      if (Math.abs(d) < 1e-6) break
      t -= (x(t) - p) / d
    }
    return y(Math.min(1, Math.max(0, t)))
  }
}

export type Curve = (t: number) => number

export const ease = {
  // Las de la landing: la salida larga de las entradas y la dramática de la retícula y el disco
  out: bezier(0.16, 1, 0.3, 1),
  drama: bezier(0.87, 0, 0.13, 1),
  in: bezier(0.7, 0, 0.84, 0),
  soft: bezier(0.65, 0, 0.35, 1),
  // El latigazo de cámara: casi todo el recorrido cae en el centro, donde el desenfoque lo borra
  whip: bezier(0.9, 0, 0.1, 1),
  // Una frenada larga, para que la cámara llegue y se quede flotando
  glide: bezier(0.22, 1, 0.36, 1),
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  linear: (t: number) => t,
  // Se pasa un poco y vuelve (back.out de GSAP)
  back: (t: number) => {
    const c = 1.7
    return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2
  },
} satisfies Record<string, Curve>

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const mix = (a: number, b: number, t: number) => a + (b - a) * t

// El progreso de 0 a 1 entre dos fotogramas, quieto antes y después
export const prog = (f: number, a: number, b: number, curve: Curve = ease.out) => curve(clamp((f - a) / (b - a)))

// Un valor de a a b entre dos fotogramas
export const tween = (f: number, from: number, to: number, a: number, b: number, curve: Curve = ease.out) => mix(a, b, prog(f, from, to, curve))

// Una pista de claves: [fotograma, valor, curva hasta la clave siguiente]. Antes de la primera y después de la última
// se queda quieta
export type Key = readonly [frame: number, value: number, curve?: Curve]
export function track(f: number, keys: readonly Key[]) {
  if (f <= keys[0][0]) return keys[0][1]
  for (let i = 0; i < keys.length - 1; i++) {
    const [a, va, curve = ease.soft] = keys[i]
    const [b, vb] = keys[i + 1]
    if (f <= b) return mix(va, vb, curve(clamp((f - a) / (b - a))))
  }
  return keys[keys.length - 1][1]
}

// Un muelle amortiguado, analítico: 0 en el arranque, se pasa de 1 y se asienta. t en fotogramas desde el arranque
export function spring(t: number, { freq = 0.09, damping = 0.18 } = {}) {
  if (t <= 0) return 0
  const w = 2 * Math.PI * freq
  const wd = w * Math.sqrt(1 - damping * damping)
  return 1 - Math.exp(-damping * w * t) * (Math.cos(wd * t) + ((damping * w) / wd) * Math.sin(wd * t))
}

// Un golpe que sube de golpe y se apaga en len fotogramas (para sacudidas y destellos)
export const impulse = (f: number, at: number, len: number) => (f < at ? 0 : Math.exp(-(f - at) / len))

// Azar determinista: la misma semilla da siempre el mismo número, en todos los fotogramas y en cada render
export const rand = (seed: number) => {
  const s = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return s - Math.floor(s)
}

// La deriva de una cámara al hombro: ruido suave en x e y, en píxeles
export const drift = (f: number, seed: number, amp: number, speed = 0.02) =>
  [noise2D(`dx${seed}`, f * speed, 0) * amp, noise2D(`dy${seed}`, f * speed, 0) * amp] as const

// La sacudida de un golpe: ruido rápido que decae en len fotogramas
export const shake = (f: number, at: number, amp: number, len = 6) => {
  const k = impulse(f, at, len) * amp
  return [noise2D('sx', f * 0.9, at) * k, noise2D('sy', f * 0.9, at) * k] as const
}
