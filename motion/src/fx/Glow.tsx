import type { CSSProperties } from 'react'
import { RED } from '../brand'

// La señal: un punto rojo que es una fuente de luz. Núcleo casi blanco, halo rojo en aclarar y, si streak, el destello
// horizontal de un objetivo anamórfico. x, y es el centro; size, el diámetro del núcleo
export function Glow({ x, y, size = 16, power = 1, streak = 1, color = RED, style }: { x: number; y: number; size?: number; power?: number; streak?: number; color?: string; style?: CSSProperties }) {
  const halo = size * 9
  const flare = size * 46
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 0, height: 0, pointerEvents: 'none', ...style }}>
      <div
        style={{
          position: 'absolute',
          left: -halo / 2,
          top: -halo / 2,
          width: halo,
          height: halo,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${rgba(color, 0.55 * power)} 0%, ${rgba(color, 0.22 * power)} 22%, ${rgba(color, 0.06 * power)} 48%, ${rgba(color, 0)} 70%)`,
          mixBlendMode: 'screen',
        }}
      />
      {streak > 0 && (
        <div
          style={{
            position: 'absolute',
            left: -flare / 2,
            top: -size * 0.45,
            width: flare,
            height: size * 0.9,
            borderRadius: '50%',
            background: `radial-gradient(ellipse at center, ${rgba('#ffd6c9', 0.5 * power * streak)} 0%, ${rgba(color, 0.22 * power * streak)} 30%, ${rgba(color, 0)} 70%)`,
            mixBlendMode: 'screen',
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          left: -size / 2,
          top: -size / 2,
          width: size,
          height: size,
          borderRadius: '50%',
          background: `radial-gradient(circle, #fff6f2 0%, #ffc2b2 30%, ${color} 72%)`,
          boxShadow: `0 0 ${size * 0.8}px ${size * 0.25}px ${rgba(color, 0.7 * Math.min(1, power))}`,
        }}
      />
    </div>
  )
}

// Un color en hex con transparencia
export function rgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, alpha)).toFixed(3)})`
}
