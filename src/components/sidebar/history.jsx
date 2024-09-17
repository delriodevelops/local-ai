import useChatStore from '@/store/chat'
import React from 'react'

const History = () => {
  const { history, setActualConversation, setMessages } = useChatStore(s => s)

  function handleSelectConversation(el) {
    setActualConversation(el.createdAt)
    setMessages(el.messages)
  }

  return (
    <article className="flex flex-col gap-2 pr-2 w-full overflow-y-auto h-dvh" style={{ maxHeight: "calc(100dvh - 171px)" }}>
      {
        !!history?.length
          ? history.sort((a, b) => b.lastMessage - a.lastMessage).map(el => (
            <p key={el?.createdAt} onClick={() => { handleSelectConversation(el) }} className="p-4 hover:bg-neutral-700 rounded-xl duration-300 ease-in-out cursor-pointer truncate">
              {el.messages.at(-2).content}
            </p>
          ))
          : (
            <p className="p-4 text-neutral-400 rounded-xl">No chats...</p>
          )
      }
    </article>
  )
}

export default History