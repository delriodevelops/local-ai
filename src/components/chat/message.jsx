'use client'
import React, { useState } from 'react'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown';
import CopyButton from './copy-button';
import TTSButton from './tts-button';


const Message = ({ message, isStreaming }) => {


  return (
    <div className='w-4/5 mx-auto flex flex-col'>
      <div className={` flex gap-3 items-center ${message?.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`} >
        {
          message.role === 'user'
            ? (
              <span className={`overflow-hidden self-start min-w-12 min-h-12 aspect-square rounded-full flex items-center justify-center text-3xl bg-neutral-500`}>
                <ion-icon name="person"></ion-icon>
              </span>
            )
            : <Image src="/default.png" width={50} height={50} alt="mecha" className='bg-lime-500 rounded-full aspect-square p-1 self-start' />
        }
        <div className={` whitespace-pre-line break-word ${message.role === 'user' && 'bg-neutral-900 rounded-xl p-3'}`}>
          <ReactMarkdown>
            {message?.content}
          </ReactMarkdown>
        </div>
      </div>

      {
        message.role !== 'user' && (
          <div className='flex gap-2 items-center ml-12 m-3'>
            <TTSButton message={message} isStreaming={isStreaming} />
            <CopyButton message={message} />
          </div>
        )
      }
    </div>
  )
}

export default Message