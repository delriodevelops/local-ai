'use client'
import React, { useState, useRef, useEffect } from 'react'
import CustomSlider from '../slider'
import Tooltip from '../milascenia/tooltip'
import useChatStore from '@/store/chat'

const TextAreaOptions = () => {
  const { setTop_p, top_p, setRepetitionPenalty, repetition_penalty, temperature, setTemperature, max_tokens, setMaxTokens } = useChatStore(s => s)

  // Helper function to normalize values for the slider
  const normalizeValue = (value, min, max) => {
    return (value - min) / (max - min)
  }

  // Helper function to denormalize values from the slider
  const denormalizeValue = (normalized, min, max) => {
    return normalized * (max - min) + min
  }

  const sliderMenus = [
    {
      name: "max_tokens",
      label: "Max Tokens",
      icon: "newspaper-outline",
      onChange: (normalizedValue) => {
        // Convert normalized value back to actual tokens
        const minTokens = 64
        const maxTokens = 2048
        const actualTokens = Math.round(denormalizeValue(normalizedValue, minTokens, maxTokens))
        setMaxTokens(actualTokens)
      },
      levels: [
        {
          text: "Brief",
          info: "Short, concise responses",
          value: normalizeValue(64, 64, 2048)
        },
        {
          text: "Standard",
          info: "Regular length responses",
          value: normalizeValue(256, 64, 2048)
        },
        {
          text: "Detailed",
          info: "Comprehensive responses",
          value: normalizeValue(512, 64, 2048)
        },
        {
          text: "Extended",
          info: "Long-form content",
          value: normalizeValue(1024, 64, 2048)
        },
        {
          text: "Maximum",
          info: "Very detailed long-form content",
          value: normalizeValue(2048, 64, 2048)
        }
      ].reverse(),
      defaultLevel: normalizeValue(max_tokens || 256, 64, 2048)
    },
    {
      name: "temperature",
      label: "Temperature",
      icon: "thermometer-outline",
      onChange: setTemperature,
      levels: [{
        text: "Precise",
        info: "Highly consistent and predictable outputs",
        value: 0.1
      },
      {
        text: "Focused",
        info: "Reliable outputs with minimal variation",
        value: 0.3
      },
      {
        text: "Balanced",
        info: "Good balance between consistency and creativity",
        value: 0.5
      },
      {
        text: "Creative",
        info: "More diverse and creative outputs",
        value: 0.7
      },
      {
        text: "Experimental",
        info: "Maximum creativity and uniqueness",
        value: 0.9
      }
      ].reverse(),
      defaultLevel: temperature || 0.5
    },
    {
      name: "top_p",
      label: "Top P",
      icon: "git-branch-outline",
      onChange: setTop_p,
      levels: [
        {
          text: "Focused",
          info: "Only most likely tokens considered",
          value: 0.3
        },
        {
          text: "Balanced",
          info: "Good balance of focus and diversity",
          value: 0.7
        },
        {
          text: "Diverse",
          info: "Wide range of possible tokens",
          value: 0.9
        }
      ].reverse(),
      defaultLevel: top_p || 0.7
    },
    {
      name: "repetition_penalty",
      label: "Repetition Penalty",
      icon: "repeat",
      onChange: setRepetitionPenalty,
      levels: [
        {
          text: "Natural",
          info: "Normal word repetition allowed",
          value: 1.0
        },
        {
          text: "Moderate",
          info: "Some repetition prevention",
          value: 1.1
        },
        {
          text: "Strict",
          info: "Strong repetition prevention",
          value: 1.2
        }
      ].reverse(),
      defaultLevel: repetition_penalty || 1.1
    }
  ]

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeSlider, setActiveSlider] = useState(null)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeSlider && !event?.target?.className?.includes('slider-element')) {
        setIsMenuOpen(false)
        setActiveSlider(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [activeSlider])

  const handleButtonClick = (element) => {
    setActiveSlider(element)
  }

  return (
    <div className="relative overflow-visible h-full w-fit">
      <div
        ref={menuRef}
        onMouseEnter={() => setIsMenuOpen(true)}
        onMouseLeave={() => { if (!activeSlider) setIsMenuOpen(false) }}
        className={`absolute z-10 -bottom-2 left-0 flex gap-2 flex-col items-center justify-center py-1 duration-300 ease-in-out w-14 ${activeSlider && 'hidden'} ${!isMenuOpen ? "h-14" : "h-fit  bg-neutral-800"} rounded-full `}
      >
        {
          isMenuOpen && !activeSlider && sliderMenus.map((slider, index) => (
            <Tooltip key={index} content={slider.name}>
              <button
                onClick={() => handleButtonClick(slider)}
                className="text-3xl hover:scale-125 rounded-full text-neutral-500 hover:text-neutral-100 p-2 flex items-center justify-center cursor-pointer duration-300 ease-in-out">
                <ion-icon name={`${slider.icon}`}></ion-icon>
              </button>
            </Tooltip>
          ))
        }
        {
          !activeSlider && (
            <button
              onClick={() => setActiveSlider(null)}
              className="text-3xl hover:scale-125 rounded-full text-neutral-200 hover:text-neutral-100 p-2 flex items-center justify-center cursor-pointer duration-300 ease-in-out">
              <ion-icon name="options"></ion-icon>
            </button>
          )
        }
      </div>

      {activeSlider && (
        <CustomSlider
          name={activeSlider.name}
          label={activeSlider.label}
          icon={activeSlider.icon}
          levels={activeSlider.levels}
          onChange={activeSlider.onChange}
          defaultLevel={activeSlider.defaultLevel}
        />
      )}
    </div>
  )
}

export default TextAreaOptions