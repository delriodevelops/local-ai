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
    <section className="bg-neutral-900 border-r border-neutral-800 px-3 pt-3 pb-2 w-full w-dvw absolute lg:relative z-50 lg:max-w-72 lg:min-w-72 min-h-dvh max-h-dvh overflow-hidden flex flex-col" id='sidebar'>
      <header className='flex items-center justify-between pb-3 mb-2 border-b border-neutral-800'>
        <div className='flex items-center gap-2 pl-1'>
          <img src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/icon.svg`} alt="" width={22} height={22} className="rounded-md" />
          <span className='font-display text-2xl leading-none tracking-tight'>MeshMind</span>
        </div>
        <div className='flex items-center gap-1 text-lg'>
          <SearchConversationButton />
          <NewChatButton />
          <CollapseButton />
        </div>
      </header>
      <div className='flex-1 grid grid-rows-2 gap-3 overflow-hidden'>
        <History />
        <AssitantsSidebar suppressHydrationWarning />
      </div>
    </section>
  )

  return (
    <div className='flex items-center justify-start gap-1 absolute top-0 left-0 z-50 lg:relative h-fit w-fit p-3 lg:border-r lg:border-neutral-800 lg:h-dvh lg:flex-col lg:bg-neutral-900'>
      <button
        onClick={() => { setIsHistoryCollapsed(false) }}
        title="Open sidebar"
        className='hover:bg-neutral-700 border border-neutral-700 lg:border-transparent bg-neutral-900 w-fit h-fit p-3 flex items-center justify-center rounded-lg cursor-pointer duration-300 ease-snap'>
        <ion-icon name="menu-outline"></ion-icon>
      </button>
      <NewChatButton />
    </div>

  )
}

export default SIDEBAR
