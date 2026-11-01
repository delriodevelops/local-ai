import useChatStore from '@/store/chat'
import React from 'react'

const CollapseButton = () => {

  const { setIsHistoryCollapsed } = useChatStore(s => s)

  return (
    <button
      onClick={() => { setIsHistoryCollapsed(true) }}
      className="hover:bg-neutral-700 p-2 flex items-center justify-center rounded-lg cursor-pointer duration-300 ease-snap"
      title="Close sidebar"
    >
      <ion-icon name="close"></ion-icon>
    </button>
  )
}

export default CollapseButton