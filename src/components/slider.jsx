'use client'
import { useState, useRef, useEffect, useMemo } from 'react'

const PADDING = 0.09

export default function CustomSlider({
  levels,
  defaultLevel,
  onChange,
  getValue,
  continuous = false,
  icon = "book-outline"
}) {
  const ADJUSTED_RANGE = 1 - 2 * PADDING

  const [isDragging, setIsDragging] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [currentLevel, setCurrentLevel] = useState(defaultLevel)
  const [sliderPosition, setSliderPosition] = useState(() => {
    if (continuous) {
      return PADDING + (getValue(defaultLevel) * ADJUSTED_RANGE)
    }
    const normalizedLevel = (defaultLevel - levels[0].value) / (levels.at(-1).value - levels[0].value)
    return PADDING + normalizedLevel * ADJUSTED_RANGE
  })
  
  const sliderRef = useRef(null)
  const dragStartY = useRef(0)
  const startLevel = useRef(defaultLevel)
  const frameRef = useRef()

  const calculatePosition = (clientY) => {
    if (!sliderRef.current) return PADDING

    const sliderRect = sliderRef.current.getBoundingClientRect()
    const sliderHeight = sliderRect.height
    const relativeY = clientY - sliderRect.top

    const rawPosition = relativeY / sliderHeight
    const constrainedPosition = Math.max(PADDING, Math.min(1 - PADDING, rawPosition))
    return constrainedPosition
  }

  const handleDrag = (clientY) => {
    if (!isDragging || !sliderRef.current) return

    cancelAnimationFrame(frameRef.current)

    frameRef.current = requestAnimationFrame(() => {
      const newPosition = calculatePosition(clientY)
      setSliderPosition(newPosition)

      const normalizedPosition = (newPosition - PADDING) / ADJUSTED_RANGE
      
      if (continuous) {
        onChange(normalizedPosition)
        setCurrentLevel(normalizedPosition)
      } else {
        const levelIndex = Math.round(normalizedPosition * (levels.length - 1))
        const newLevel = levels[Math.max(0, Math.min(levels.length - 1, levelIndex))].value
        
        if (newLevel !== currentLevel) {
          setCurrentLevel(newLevel)
          onChange(newLevel)
        }
      }
    })
  }

  const handleDragStart = (e) => {
    // Prevent page scrolling on mobile
    e.preventDefault()
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
  const handleTouchMove = (e) => {
    // Prevent scroll during drag
    e.preventDefault()
    handleDrag(e.touches[0].clientY)
  }
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

  const currentLevelInfo = continuous
    ? levels.reduce((prev, curr) => {
        const prevDiff = Math.abs(getValue(prev.value) - getValue(currentLevel))
        const currDiff = Math.abs(getValue(curr.value) - getValue(currentLevel))
        return currDiff < prevDiff ? curr : prev
      })
    : levels.find(level => level.value === currentLevel)

  const markers = useMemo(() => {
    return Array.from({ length: 12 }).map((_, index) => {
      const markerPosition = PADDING + (index / 11) * ADJUSTED_RANGE
      const distanceFromHandle = Math.abs(markerPosition - sliderPosition)
      const opacity = Math.max(0.15, 1 - (distanceFromHandle * 3))

      return {
        key: index,
        className: `w-1 h-1 rounded-full bg-white slider-element`,
        style: { opacity }
      }
    })
  }, [sliderPosition])

  const displayValue = continuous 
    ? Math.round(currentLevel * 100) / 100
    : currentLevel

  return (
    <div className="slider-element absolute z-20 bottom-0 left-0 flex items-center select-none touch-none">
      <div
        ref={sliderRef}
        className={`slider-element bg-neutral-800 rounded-full py-3 flex flex-col items-center 
          justify-between relative cursor-grab active:cursor-grabbing w-12 h-72 
          ${isDragging && 'w-14'} duration-100 ease-in-out 
          touch-none 
          lg:w-12 
          sm:w-16 
          sm:h-64 
        `}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => !isDragging && setShowTooltip(false)}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        // Add these handlers
        onTouchMove={handleTouchMove}
        onTouchEnd={handleDragEnd}
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
          className="slider-element absolute left-1/2 -translate-x-1/2 rounded-full bg-white/10"
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
          className={`slider-element absolute left-16 mr-3 bg-neutral-900 text-white p-2 rounded-lg flex flex-col items-center gap-2 min-w-48 max-w-64 ${
            showTooltip ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{
            top: `${sliderPosition * 100}%`,
            transform: 'translateY(-50%)',
          }}
        >
          <div className="slider-element flex items-center gap-2">
            <ion-icon name={icon} class="slider-element" style={{ fontSize: '1rem' }} />
            <span className="slider-element whitespace-nowrap font-semibold">
              {currentLevelInfo?.text || displayValue}
            </span>
          </div>
          <span className="slider-element block text-neutral-400 text-pretty text-center text-sm">
            {currentLevelInfo?.info || `Value: ${displayValue}`}
          </span>
        </div>
      </div>
    </div>
  )
}