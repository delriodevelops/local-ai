'use client'
import React, { useState } from 'react'
import Image from 'next/image'

const Message = ({ message }) => {

  const [copiedToClipboard, setCopiedToClipboard] = useState(false)

  function copyToClipboard() {
    navigator.clipboard.writeText(message?.content)
    setCopiedToClipboard(true)
    setTimeout(() => {
      setCopiedToClipboard(false)
    }, 500)
  }

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
        <p className={`break-all ${message.role === 'user' && 'bg-neutral-900 rounded-xl p-3'}`}>
          {message?.content}
        </p>
      </div>

      {
        message.role !== 'user' && (
          <button
            onClick={copyToClipboard}
            className=' relative text-2xl p-2 hover:bg-neutral-600 rounded-full cursor-pointer flex items-center m-3 ml-12 w-fit h-fit self-start'
          >
            {
              !!copiedToClipboard && (
                <div className='absolute px-3 py-2 bg-neutral-800 -top-10 -left-4 rounded-3xl text-sm'>
                  Copied!
                </div>
              )
            }
            <ion-icon name="copy-outline"></ion-icon>
          </button>
        )
      }
    </div>
  )
}

export default Message