import React, { useState } from 'react'

const CopyButton = ({ message }) => {

  const [copiedToClipboard, setCopiedToClipboard] = useState(false)

  function copyToClipboard() {
    navigator.clipboard.writeText(message?.content)
    setCopiedToClipboard(true)
    setTimeout(() => {
      setCopiedToClipboard(false)
    }, 500)
  }

  return (
    <button
      onClick={copyToClipboard}
      className='relative text-base p-1.5 hover:bg-neutral-800 hover:text-neutral-100 rounded-md cursor-pointer flex items-center w-fit h-fit self-start duration-200'
      title="Copy"
    >
      {
        !!copiedToClipboard && (
          <div className='absolute px-2 py-1 bg-signal text-neutral-950 font-mono -top-8 -left-3 rounded-md text-[11px]'>
            Copied!
          </div>
        )
      }
      {
        !copiedToClipboard
          ? <ion-icon name="copy-outline"></ion-icon>
          : <ion-icon name="checkmark"></ion-icon>
      }
    </button>
  )
}

export default CopyButton