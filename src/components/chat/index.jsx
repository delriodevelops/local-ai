'use client'
import React from 'react'
import ModelSelector from './model-selector'
import ChatInput from './chat-input'
import Messages from './messages'
import ChainVisualizer from './chain-visualizer'

const CHAT = () => {
  return (
    <section className="flex flex-col bg-neutral-700 w-full px-2 md:px-4 items-center h-dvh">
      <nav className="w-full flex md:gap-16 gap-4 items-center justify-end py-4 flex-nowrap">
        <ModelSelector />
        <ChainVisualizer />
      </nav>
      <Messages />
      <ChatInput />
      <small className='mb-1 -mt-1 text-[9px] text-neutral-400'>
        The provided information may be inaccurate. Consider verifying important information.
      </small>
    </section>
  )
}

export default CHAT