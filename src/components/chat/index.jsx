'use client'
import React, { useState } from 'react'
import ModelSelector from './model-selector'
import ChatInput from './chat-input'
import useChatStore from '@/store/chat'
import Image from 'next/image'

var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition
var SpeechGrammarList = SpeechGrammarList || window.webkitSpeechGrammarList
var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent

console.log(SpeechRecognition, SpeechGrammarList, SpeechRecognitionEvent)
const recognition = new SpeechRecognition();
const speechRecognitionList = new SpeechGrammarList();
console.log(recognition, speechRecognitionList)

const CHAT = () => {
  const { messages } = useChatStore(s => s)
  return (
    <section className="flex flex-col bg-neutral-700 w-full px-4 justify-between items-center">
      <nav className="w-full p-4">
        <ModelSelector />
      </nav>
      <article className="h-full w-full overflow-y-auto py-2 flex flex-col gap-6" style={{ maxHeight: "calc(100dvh - 171px)" }}>
        {
          messages.map(el => (
            <div className={`w-4/5 mx-auto flex gap-3 items-center ${el?.role === 'user' && 'flex-row-reverse'}`} key={el?.content}>
              <span className={`overflow-hidden self-start h-12 aspect-square rounded-full ${el?.role !== 'user' ? 'bg-lime-500' : 'flex items-center justify-center text-3xl bg-neutral-500'}`}>
                {
                  el.role === 'user'
                    ? <ion-icon name="person"></ion-icon>
                    : <Image src="/default.png" width={50} height={50} alt="mecha" />

                }
              </span>
              <p className={`${el.role === 'user' && 'bg-neutral-900 rounded-xl p-4'}`}>
                {el?.content}
              </p>
            </div>
          ))
        }
      </article>
      <ChatInput />
    </section>
  )
}

export default CHAT