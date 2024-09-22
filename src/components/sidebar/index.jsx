'use client'
import useChatStore from '@/store/chat'
import React, { useLayoutEffect } from 'react'
import History from './history'

const SIDEBAR = () => {
  const { setActualConversation, setMessages, setIsHistoryCollapsed, isHistoryCollapsed } = useChatStore(s => s)


  function handleCreateNewChat() {
    setMessages([])
    setActualConversation(null)
  }

  if (!isHistoryCollapsed) return (
    <section
      className="bg-neutral-800 px-2 pt-2 pb-3 w-full max-w-64 flex flex-col h-dvh gap-2 justify-between"
    >
      <article
        className="flex flex-col gap-2"
      >
        <button
          onClick={() => { setIsHistoryCollapsed(true) }}
          className="self-end hover:bg-neutral-700  p-3 flex items-center justify-center rounded-xl cursor-pointer duration-300 ease-in-out"
        >
          <ion-icon name="chevron-back-outline"></ion-icon>
        </button>
        <button
          onClick={handleCreateNewChat}
          className="flex items-center gap-2 p-4 hover:bg-neutral-600 bg-neutral-700 rounded-xl cursor-pointer duration-300 ease-in-out"
        >
          <span
            className="flex items-center bg-neutral-500 p-2 rounded-full justify-center text-xl"
          >
            <ion-icon name="create-outline"></ion-icon>
          </span>
          <p>
            Create new chat
          </p>
        </button>
        <small
          className="text-neutral-400 font-semibold pl-2"
        >
          Past chats
        </small>
      </article>
      <History />
    </section>
  )
  else return (
    <button
      onClick={() => { setIsHistoryCollapsed(false) }}
      className='bg-neutral-800 m-2 w-fit h-fit hover:bg-neutral-900  p-3 flex items-center justify-center rounded-xl cursor-pointer duration-300 ease-in-out'>
      <ion-icon name="chevron-forward-outline"></ion-icon>

    </button>
  )
}

export default SIDEBAR