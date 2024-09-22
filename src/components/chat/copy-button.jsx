import React, { useState } from 'react'

const CopyButton = ({message}) => {

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
      className='relative text-2xl p-2 hover:bg-neutral-600 rounded-full cursor-pointer flex items-center  w-fit h-fit self-start'
    >
      {
        !!copiedToClipboard && (
          <div className='absolute px-3 py-2 bg-neutral-800 -top-10 -left-4 rounded-3xl text-sm'>
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