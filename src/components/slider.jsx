'use client'
import { useState, useRef, useEffect, useMemo } from 'react'

const PADDING = 0.09 // Increased padding (8%)

export default function CustomSlider({
  levels,
  defaultLevel = levels[Math.round((levels.length - 1) / 2)]?.value,
  onChange,
  icon = "book-outline"
}) {
  // We dont't know the number of values in the array. so we have to take in to account the first and last value and the number of values in between to create the ADJUSTED_RANGE. Especially when the values are not evenly distributed. And if they are even or odd.
  const ADJUSTED_RANGE = 1 - 2 * PADDING

  const [isDragging, setIsDragging] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [currentLevel, setCurrentLevel] = useState(defaultLevel)
  const [sliderPosition, setSliderPosition] = useState(defaultLevel)
  const sliderRef = useRef(null)
  const dragStartY = useRef(0)
  const startLevel = useRef(defaultLevel)
  const frameRef = useRef()

  const calculatePosition = (clientY) => {
    if (!sliderRef.current) return PADDING

    const sliderRect = sliderRef.current.getBoundingClientRect()
    const sliderHeight = sliderRect.height
    const relativeY = clientY - sliderRect.top

    // Constrain within padding bounds
    const rawPosition = relativeY / sliderHeight
    const constrainedPosition = Math.max(PADDING, Math.min(1 - PADDING, rawPosition))
    return constrainedPosition
  }

  useEffect(() => {
    const normalizedLevel = (currentLevel - levels[0].value) / (levels.at(-1).value - levels[0].value)
    const newPosition = PADDING + normalizedLevel * ADJUSTED_RANGE
    setSliderPosition(newPosition)
  }, [sliderPosition])

  const handleDrag = (clientY) => {
    if (!isDragging || !sliderRef.current) return

    cancelAnimationFrame(frameRef.current)

    frameRef.current = requestAnimationFrame(() => {
      const newPosition = calculatePosition(clientY)
      setSliderPosition(newPosition)

      const normalizedPosition = (newPosition - PADDING) / ADJUSTED_RANGE
      const levelIndex = Math.round(normalizedPosition * (levels.length - 1))
      const newLevel = levels[Math.max(0, Math.min(levels.length - 1, levelIndex))].value

      if (newLevel !== currentLevel && newLevel !== null) {
        setCurrentLevel(newLevel)
        console.log(newLevel)
        onChange(newLevel)
      }
    })
  }

  const handleDragStart = (e) => {
    setIsDragging(true)
    dragStartY.current = 'touches' in e ? e.touches[0].clientY : e.clientY
    startLevel.current = currentLevel
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    cancelAnimationFrame(frameRef.current)
  }

  const handleMouseMove = (e) => handleDrag(e.clientY)
  const handleMouseUp = () => handleDragEnd()
  const handleTouchMove = (e) => handleDrag(e.touches[0].clientY)
  const handleTouchEnd = () => handleDragEnd()

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      window.addEventListener('touchmove', handleTouchMove)
      window.addEventListener('touchend', handleTouchEnd)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      cancelAnimationFrame(frameRef.current)
    }
  }, [isDragging])

  const currentLevelText = levels.find(level => level.value === currentLevel)?.text || ''
  const currentLevelInfo = levels.find(level => level.value === currentLevel)?.info

  // Reducimos el número de marcadores y memoizamos el cálculo
  const markers = useMemo(() => {
    return Array.from({ length: 12 }).map((_, index) => {
      const markerPosition = PADDING + (index / 11) * ADJUSTED_RANGE
      const distanceFromHandle = Math.abs(markerPosition - sliderPosition)
      // Adjusted opacity calculation for better visual effect
      const opacity = Math.max(0.15, 1 - (distanceFromHandle * 3))

      return {
        key: index,
        className: `w-1 h-1 rounded-full bg-white slider-element
          }`,
        style: { opacity }
      }
    })
  }, [sliderPosition, levels.length])

  return (
    <div className="slider-element absolute z-20 bottom-1 left-4 flex items-center select-none" >
      <div
        ref={sliderRef}
        className={`slider-element bg-neutral-800 rounded-full py-3 flex flex-col items-center justify-between relative cursor-grab active:cursor-grabbing w-12 h-72 ${isDragging && 'w-14'} duration-100 ease-in-out`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => !isDragging && setShowTooltip(false)}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        role="slider"
        aria-valuemin={levels[0].value}
        aria-valuemax={levels.at(-1).value}
        aria-valuenow={currentLevel}
        tabIndex={0}
      >
        {markers.map(marker => (
          <div key={marker.key} className={marker.className} style={marker.style} />
        ))}

        <div
          className="slider-element absolute left-1/2 -translate-x-1/2 rounded-full bg-white/10 "
          style={{
            width: isDragging ? '5rem' : '2.5rem',
            height: isDragging ? '5rem' : '2.5rem',
            top: `${sliderPosition * 100}%`,
            filter: `blur(${isDragging ? '8px' : '0px'})`,
            transform: 'translate(-50%, -50%)',
          }}
        />

        <div
          className={`slider-element absolute left-1/2 text-black text-xl bg-white rounded-full shadow-lg flex items-center justify-center ${isDragging && 'scale-110'}`}
          style={{
            width: isDragging ? '3rem' : '2.5rem',
            height: isDragging ? '3rem' : '2.5rem',
            top: `${sliderPosition * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <ion-icon class="slider-element" name={icon} />
        </div>

        <div
          className={`slider-element absolute left-16 mr-3 bg-neutral-900 text-white p-2 rounded-lg flex flex-col items-center gap-2  min-w-48 max-w-64 ${showTooltip ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          style={{
            top: `${sliderPosition * 100}%`,
            transform: 'translateY(-50%)',
          }}
        >
          <div className='slider-element flex items-center gap-2'>
            <ion-icon name={icon} class="slider-element" style={{ fontSize: '1rem' }} />
            <span className="slider-element whitespace-nowrap font-semibold">{currentLevelText}</span>
          </div>
          <span className='slider-element block text-neutral-400 text-pretty text-center text-sm'>{currentLevelInfo}</span>
        </div>
      </div>
    </div>
  )
}