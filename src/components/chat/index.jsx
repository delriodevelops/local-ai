'use client'
import React, { useState } from 'react'
import ModelSelector from './model-selector'
import ChatInput from './chat-input'
import Messages from './messages'

const CHAT = () => {
  return (
    <section className="flex flex-col bg-neutral-700 w-full px-4 items-center h-dvh">
      <nav className="w-full pt-2">
        <ModelSelector />
      </nav>
      <Messages />
      <ChatInput />
      <small className='mb-1 -mt-1 text-[11px] text-neutral-400 '>The provided information may be inaccurate. Consider verifying important information.</small>
    </section >
  )
}

export default CHAT