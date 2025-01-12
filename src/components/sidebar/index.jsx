'use client'
import useChatStore from '@/store/chat'
import React from 'react'
import History from './history'
import CollapseButton from './collapse-button'
import dynamic from 'next/dynamic'
import NewChatButton from './new-chat-button'
import SearchConversationButton from './search-conversation-button'

const AssitantsSidebar = dynamic(() => import('./assistants-sidebar'), { ssr: false })

const SIDEBAR = () => {
  const { setIsHistoryCollapsed, isHistoryCollapsed } = useChatStore(s => s)

  if (!isHistoryCollapsed) return (
    <section className="bg-neutral-800 p-2 w-full w-dvw absolute md:relative z-50 md:max-w-64 md:min-w-64 min-h-dvh max-h-dvh overflow-hidden flex flex-col">
      <div className='flex items-center justify-between text-xl'>
        <CollapseButton />
        <div className='flex items-center gap-2 self-end'>
          <SearchConversationButton />
          <NewChatButton />

        </div>
      </div>
      <div className='flex-1 grid grid-rows-2 overflow-hidden'>
        <History />
        <AssitantsSidebar suppressHydrationWarning />
      </div>
    </section>
  )

  return (
    <div className='flex items-center justify-start absolute top-2 left-2 z-50 md:relative h-fit w-fit'>
      <button
        onClick={() => { setIsHistoryCollapsed(false) }}
        className='hover:bg-neutral-900 bg-neutral-800 m-2 w-fit h-fit p-3 flex items-center justify-center rounded-xl cursor-pointer duration-300 ease-in-out '>
        <ion-icon name="chatbubble"></ion-icon>
      </button>
      <NewChatButton />
    </div>

  )
}

export default SIDEBAR