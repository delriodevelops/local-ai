'use client'
import useChatStore from '@/store/chat'
import React, { useLayoutEffect } from 'react'
import History from './history'
import CollapseButton from './collapse-button'
import NewChatButton from './new-chat-button'
import AssistantsSidebar from './assistants-sidebar'
import Divider from '../milascenia/divider'

const SIDEBAR = () => {
  const { setIsHistoryCollapsed, isHistoryCollapsed } = useChatStore(s => s)




  if (!isHistoryCollapsed) return (
    <section
      className="bg-neutral-800 px-2 pt-2 pb-3 w-full max-w-64 flex flex-col min-h-dvh max-h-dvh gap-2 justify-between overflow-hidden"
    >
      <div className='flex flex-col gap-2 items-center justify-between'>
        <CollapseButton />
        <NewChatButton />
      </div>
      <div className='grid grid-cols-1 gap-2 grid-rows-2 h-full'>
        <History />
        <AssistantsSidebar />
      </div>
    </section>
  )
  else return (
    <button
      onClick={() => { setIsHistoryCollapsed(false) }}
      className='hover:bg-neutral-900 bg-neutral-950 m-2 w-fit h-fit  p-3 flex items-center justify-center rounded-xl cursor-pointer duration-300 ease-in-out'>
      <ion-icon name="chevron-forward-outline"></ion-icon>
    </button>
  )
}

export default SIDEBAR