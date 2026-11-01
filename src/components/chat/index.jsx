'use client'
import React from 'react'
import ModelSelector from './model-selector'
import ChatInput from './chat-input'
import Messages from './messages'
import ChainVisualizer from './chain-visualizer'

const CHAT = () => {
  return (
    <section className="flex flex-col bg-neutral-950 w-full min-w-0 px-3 lg:px-6 items-center h-dvh">
      <nav className="relative w-full flex lg:gap-3 gap-3 items-start py-3 flex-nowrap justify-end lg:justify-start border-b border-neutral-800/80">
          <ModelSelector />
          <ChainVisualizer />
      </nav>
      <Messages />
      <ChatInput />
      <small className='mb-2 mt-1 font-mono text-[10px] tracking-wide text-neutral-500'>
        Runs locally · answers may be inaccurate
      </small>
    </section>
  )
}

export default CHAT
