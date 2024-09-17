'use client'
import React, { useState } from 'react'
import ModelSelector from './model-selector'
import ChatInput from './chat-input'
import Messages from './messages'

const CHAT = () => {
  return (
    <section className="flex flex-col bg-neutral-700 w-full px-4 items-center h-screen">
      <nav className="w-full pt-2">
        <ModelSelector />
      </nav>
      <Messages />
      <ChatInput />
    </section >
  )
}

export default CHAT