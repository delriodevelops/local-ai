import useChatStore from '@/store/chat'
import React from 'react'

const CollapseButton = () => {

  const { setIsHistoryCollapsed } = useChatStore(s => s)

  return (
    <button
      onClick={() => { setIsHistoryCollapsed(true) }}
      className="self-end hover:bg-neutral-900 bg-neutral-950 p-3 flex items-center justify-center rounded-xl cursor-pointer duration-300 ease-in-out"
    >
      <ion-icon name="chevron-back-outline"></ion-icon>
    </button>
  )
}

export default CollapseButton