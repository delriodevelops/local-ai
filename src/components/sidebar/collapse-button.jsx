import useChatStore from '@/store/chat'
import React from 'react'

const CollapseButton = () => {

  const { setIsHistoryCollapsed } = useChatStore(s => s)

  return (
    <button
      onClick={() => { setIsHistoryCollapsed(true) }}
      className="self-end hover:bg-neutral-700 p-3 flex items-center justify-center rounded-xl cursor-pointer duration-300 ease-in-out mb-2"
    >
      <ion-icon name="close"></ion-icon>
    </button>
  )
}

export default CollapseButton