import useChatStore from '@/store/chat'
import React from 'react'

const History = () => {
  const { history, setActualConversation, setMessages, setHistory, actualConversation } = useChatStore(s => s)

  function handleSelectConversation(el) {
    setActualConversation(el.createdAt)
    setMessages(el.messages)
  }

  function deleteConversation(e, { createdAt }) {
    e.stopPropagation()
    const newHistory = history.toSpliced(history.findIndex(el => el.createdAt === createdAt), 1)
    setHistory(newHistory)
    if (createdAt === actualConversation) {
      setMessages([])
      setActualConversation(null)
    }
    localStorage.setItem('past-conversations', JSON.stringify(newHistory))
  }

  return (
    <article
      className="pr-2 w-full overflow-y-auto h-full"
      style={{ maxHeight: "calc(100dvh - 171px)" }}>
      {
        !!history?.length
          ? history.sort((a, b) => b.lastMessage - a.lastMessage).map(el => (
            <p
              key={el?.createdAt}
              onClick={() => { handleSelectConversation(el) }}
              className="relative group/delete p-4 hover:bg-neutral-700 rounded-xl duration-300 ease-in-out cursor-pointer truncate">
              <span>
                {el.messages.at(-2).content}
              </span>
              <button
                onClick={(e) => { deleteConversation(e, el) }}
                className='absolute invisible top-2 w-10 h-10 aspect-square right-2 group-hover/delete:visible text-xl hover:text-red-500 hover:bg-neutral-600 flex justify-center items-center p-1 rounded-full duration-300 ease-in-out bg-neutral-700'>
                <ion-icon name="trash-outline"></ion-icon>
              </button>
            </p>
          ))
          : (
            <p
              className="p-4 text-neutral-400 rounded-xl"
            >No chats...</p>
          )
      }
    </article>
  )
}

export default History