import useChatStore from '@/store/chat'
import React from 'react'

const NewChatButton = () => {

  const { setActualConversation, setMessages } = useChatStore(s => s)

  function handleCreateNewChat() {
    setMessages([
      {
        role: "system",
        content: "You are a helpfull assitant but with a dark/acid sense of humor. No yapping."
      }
    ])
    setActualConversation(null)
  }

  return (
    <button
      onClick={handleCreateNewChat}
      className="flex items-center gap-2 p-4 hover:bg-neutral-600 bg-neutral-700 rounded-xl cursor-pointer duration-300 ease-in-out w-full"
    >
      <span
        className="flex items-center bg-neutral-500 p-2 rounded-full justify-center"
      >
        <ion-icon name="pencil"></ion-icon>
      </span>
      <span>
        Create new chat
      </span>
    </button>
  )
}

export default NewChatButton