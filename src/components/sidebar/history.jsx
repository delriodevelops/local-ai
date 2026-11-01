import useChatStore from '@/store/chat'
import React from 'react'

const History = () => {
  const { history, setActualConversation, setMessages, setHistory, actualConversation } = useChatStore(s => s)

  function handleSelectConversation(el) {
    setActualConversation(el.conversationId)
    setMessages(el.messages)
  }

  function deleteConversation(e, { conversationId }) {
    e.stopPropagation()
    const newHistory = history.toSpliced(history.findIndex(el => el.conversationId === conversationId), 1)
    setHistory(newHistory)
    if (conversationId === actualConversation) {
      setMessages([])
      setActualConversation(null)
    }
    localStorage?.setItem('past-conversations', JSON.stringify(newHistory))
  }

  return (
    <article className="w-full h-full overflow-hidden flex flex-col">
      <h2 className="label px-2 pb-2">History</h2>
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
        {
          !!history?.length
            ? history.sort((a, b) => b.lastMessage - a.lastMessage).map(el => (
              <p
                key={el?.conversationId}
                onClick={() => { handleSelectConversation(el) }}
                className={`relative group/delete pl-3 pr-10 py-2 text-sm rounded-md duration-300 ease-snap cursor-pointer truncate border-l ${el?.conversationId === actualConversation ? 'border-signal bg-neutral-800 text-neutral-50' : 'border-transparent text-neutral-300 hover:bg-neutral-800 hover:text-neutral-50'}`}>
                <span>
                  {el?.messages?.at(-2)?.content || el?.messages?.at(-1)?.content}
                </span>
                <button
                  onClick={(e) => { deleteConversation(e, el) }}
                  title="Delete chat"
                  className='absolute invisible top-1/2 -translate-y-1/2 right-1 group-hover/delete:visible hover:text-red-400 flex justify-center items-center p-1.5 rounded-md duration-200 ease-snap text-neutral-400'>
                  <ion-icon name="trash-outline"></ion-icon>
                </button>
              </p>
            ))
            : (
              <p className="px-2 py-1 text-sm text-neutral-500">Your chats will appear here.</p>
            )
        }
      </div>
    </article>
  )
}

export default History