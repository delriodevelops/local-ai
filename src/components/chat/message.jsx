'use client'
import React from 'react'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown';
import CopyButton from './copy-button';
import TTSButton from './tts-button';

const PROSE = 'prose prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-display prose-headings:font-normal prose-headings:tracking-tight prose-strong:text-neutral-50 prose-a:text-lime-300 prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-li:marker:text-neutral-500 text-[15px] text-neutral-200'

const Message = ({ message, isStreaming }) => {

  if (message.role === 'user') return (
    <div className='w-full max-w-3xl mx-auto flex justify-end animate-rise'>
      <div className='max-w-[85%] bg-neutral-800 border border-neutral-700 rounded-2xl rounded-tr-md px-4 py-3 whitespace-pre-line break-words text-[15px] text-neutral-50'>
        {message?.content}
      </div>
    </div>
  )

  if (message.role === 'assistant') {
    const label = message.step !== undefined
      ? `Step ${String(message.step + 1).padStart(2, '0')} · ${message.assistantName || 'Assistant'}`
      : message.assistantName || 'MeshMind'

    return (
      <div className='w-full max-w-3xl mx-auto flex flex-col animate-rise'>
        <div className='flex items-center gap-3'>
          <span className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-sm text-neutral-950 overflow-hidden ${message.color || 'bg-signal'}`}>
            {
              message?.icon
                ? <ion-icon name={message.icon}></ion-icon>
                : <Image src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/default.png`} width={28} height={28} alt="MeshMind" className='p-0.5' />
            }
          </span>
          <span className='label text-neutral-300'>{label}</span>
          {isStreaming && <span className='w-1.5 h-1.5 rounded-full bg-signal animate-pulse' aria-label="Writing" />}
        </div>
        {/* La línea vertical une los pasos de una cadena como un cable */}
        <div className='ml-3.5 pl-6 border-l border-neutral-800 pt-2 pb-1'>
          <div className={`break-words ${PROSE}`}>
            <ReactMarkdown>
              {message?.content}
            </ReactMarkdown>
          </div>
          <div className='flex gap-1 items-center mt-2 text-neutral-500'>
            <TTSButton message={message} isStreaming={isStreaming} />
            <CopyButton message={message} />
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default Message
