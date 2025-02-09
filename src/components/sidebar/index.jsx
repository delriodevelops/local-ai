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
    <section className="bg-neutral-800 p-2 w-full w-dvw absolute lg:relative z-50 lg:max-w-64 lg:min-w-64 min-h-dvh max-h-dvh overflow-hidden flex flex-col" id='sidebar'>
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
    <div className='flex items-center justify-start absolute top-0 left-0 z-50 lg:relative h-fit w-fit'>
      <button
        onClick={() => { setIsHistoryCollapsed(false) }}
        className='hover:bg-neutral-900 bg-neutral-800 m-2 w-fit h-fit p-4 flex items-center justify-center rounded-xl cursor-pointer duration-300 ease-in-out '>
        <ion-icon name="chatbubble"></ion-icon>
      </button>
      <NewChatButton />
    </div>

  )
}

export default SIDEBAR