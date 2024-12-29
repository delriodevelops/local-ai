'use client'
import useChatStore from '@/store/chat'
import React from 'react'
import History from './history'
import CollapseButton from './collapse-button'
import dynamic from 'next/dynamic'

const AssitantsSidebar = dynamic(() => import('./assistants-sidebar'), { ssr: false })

const SIDEBAR = () => {
  const { setIsHistoryCollapsed, isHistoryCollapsed } = useChatStore(s => s)

  if (!isHistoryCollapsed) return (
    <section className="bg-neutral-800 p-2 w-full max-w-64 min-h-dvh max-h-dvh overflow-hidden flex flex-col">
      <CollapseButton />
      <div className='flex-1 grid grid-rows-2 overflow-hidden'>
        <History />
        <AssitantsSidebar suppressHydrationWarning />
      </div>
    </section>
  )

  return (
    <button
      onClick={() => { setIsHistoryCollapsed(false) }}
      className='hover:bg-neutral-900 bg-neutral-950 m-2 w-fit h-fit p-3 flex items-center justify-center rounded-xl cursor-pointer duration-300 ease-in-out'>
      <ion-icon name="chevron-forward-outline"></ion-icon>
    </button>
  )
}

export default SIDEBAR