import { CameraMotionBlur } from '@remotion/motion-blur'
import type { ReactNode } from 'react'
import { getInputProps } from 'remotion'

// --props='{"draft":true}' pinta cada fotograma una sola vez: para revisar encuadres deprisa
export const DRAFT = Boolean((getInputProps() as { draft?: boolean }).draft)

// El desenfoque de movimiento de una cámara de cine: cada fotograma se pinta samples veces repartidas en medio
// fotograma (obturador de 180°) y se suman. Lo que se mueve deprisa deja estela; lo quieto sigue nítido. Los hijos
// tienen que leer el fotograma con useCurrentFrame(), que aquí llega con decimales
export function Blur({ samples = 8, shutter = 180, children }: { samples?: number; shutter?: number; children: ReactNode }) {
  if (DRAFT || samples <= 1) return <>{children}</>
  return (
    <CameraMotionBlur samples={samples} shutterAngle={shutter}>
      {children}
    </CameraMotionBlur>
  )
}
