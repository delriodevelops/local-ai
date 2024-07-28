'use client'
import useChatStore from '@/store/chat'
import React, { useEffect } from 'react'
const ChatInput = () => {

  const { engine, setMessages, messages } = useChatStore(s => s)

  async function sendMessage(e) {
    e.preventDefault()

    const [{ value: content }] = e.target

    const userMessage = {
      role: 'user',
      content
    }

    let reply = {
      role: 'assistant',
      content: ""
    }
    console.log(userMessage)

    const userMessages = [...messages, userMessage]

    setMessages(userMessages)


    const chunks = await engine.chat.completions.create({
      messages: userMessages,
      stream: true
    })

    const replyMessages = [...userMessages, reply]

    for await (const chunk of chunks) {
      const [choice] = chunk.choices
      const content = choice?.delta?.content ?? ""
      reply.content += content
      replyMessages.pop()
      replyMessages.push(reply)
      console.log(replyMessages)
      setMessages(replyMessages)
    }

    console.log(reply)
  }

  useEffect(() => {
    console.log('engine', engine)
  }, [engine])

  useEffect(() => {
    console.log('messages', messages)
  }, [messages])
  return (
    <form onSubmit={sendMessage} className="w-4/5 mb-2 bg-neutral-600 rounded-3xl flex justify-end gap-2 items-center p-2">
      <div className="text-2xl p-2 hover:bg-neutral-500 rounded-xl flex items-center justify-center duration-300 ease-in-out cursor-pointer">
        <ion-icon name="attach-outline"></ion-icon>
      </div>
      <textarea name="" id="" className="resize-none w-full bg-neutral-600 outline-none h-10 py-2 pr-2"></textarea>
      <button type='submit' className="text-3xl flex items-center justify-center cursor-pointer">
        <ion-icon name="arrow-up-circle"></ion-icon>
      </button>
    </form>
  )
}

export default ChatInput