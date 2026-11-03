import { memo } from 'react'
import { BaseEdge, getBezierPath, type Edge, type EdgeProps } from '@xyflow/react'
import { useMedia } from '@/lib/useMedia'

export type SignalData = { active?: boolean }

// Un cable de siempre; mientras pasa la señal, un punto rojo con borde de papel lo recorre del origen al destino,
// acelerando y frenando como en el lienzo de la landing. Con movimiento reducido el punto se queda a mitad de camino
export const SignalEdge = memo(({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, interactionWidth, data }: EdgeProps<Edge<SignalData>>) => {
  const still = useMedia('(prefers-reduced-motion: reduce)')
  const [path, midX, midY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  return (
    <>
      <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} interactionWidth={interactionWidth} />
      {data?.active && (
        <circle r={5} fill="#ff3a1f" stroke="var(--color-paper)" strokeWidth={2} cx={still ? midX : 0} cy={still ? midY : 0} pointerEvents="none">
          {!still && <animateMotion dur="1.1s" repeatCount="indefinite" path={path} calcMode="spline" keyTimes="0;1" keySplines="0.45 0 0.55 1" />}
        </circle>
      )}
    </>
  )
})

export const edgeTypes = { signal: SignalEdge }
