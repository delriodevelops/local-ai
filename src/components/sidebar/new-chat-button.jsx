import useChatStore from '@/store/chat'
import React from 'react'

const NewChatButton = () => {

  const { setActualConversation, setMessages, setIsHistoryCollapsed } = useChatStore(s => s)

  function handleCreateNewChat() {
    setMessages([
      {
        role: "system",
        content: "You are a helpfull assitant but with a dark/acid sense of humor. No yapping."
      }
    ])
    setActualConversation(null)
    if (document.body.clientWidth < 768) setIsHistoryCollapsed(true)
  }

  return (
    <button className='hover:bg-neutral-700 p-2 lg:p-3 flex items-center justify-center rounded-lg lg:rounded-xl cursor-pointer duration-300 ease-in-out mb-2' onClick={handleCreateNewChat}>
      <ion-icon name="create-outline" />
    </button>
  )
}

export default NewChatButton