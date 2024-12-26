'use client'
import React, { useState } from 'react'
import ModelSelector from './model-selector'
import ChatInput from './chat-input'
import Messages from './messages'
import ChainVisualizer from './chain-visualizer'

const CHAT = () => {

  return (
    <section className="flex flex-col bg-neutral-700 w-full px-4 items-center h-dvh">
      <nav className="w-full flex gap-16 items-start">
        <ModelSelector />
        <ChainVisualizer />
      </nav>
      <Messages />
      <ChatInput />
      <small className='mb-1 -mt-1 text-[11px] text-neutral-400 '>The provided information may be inaccurate. Consider verifying important information.</small>
    </section >
  )
}

export default CHAT