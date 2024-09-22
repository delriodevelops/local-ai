'use client'
import useChatStore from '@/store/chat'
import React, { useEffect, useLayoutEffect, useState } from 'react'
import AudioRecorder from './audio-recorder'

const ChatInput = () => {

  const { engine, setMessages, messages, actualConversation, setActualConversation, setHistory, history, isStreaming, setIsStreaming } = useChatStore(s => s)

  const [isRecording, setIsRecording] = useState(false)
  const [chatInput, setChatInput] = useState('')

  function onTranscriptSpeech(e) {
    return setChatInput(e)
  }

  function onIsRecording(e) {
    setIsRecording(e)
  }

  async function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey && !!chatInput.trim().length) {
      e.preventDefault()
      sendMessage(chatInput)
    } else if (e.key === "Enter" && e.shiftKey) {
      setChatInput(prevValue => prevValue + "\n")
      e.preventDefault()
    }

  }

  async function sendMessage(e = chatInput) {
    if (!e.trim().length || !!isStreaming || !engine) return;
    let createdAt;
    if (!actualConversation) {
      createdAt = Date.now()
      setActualConversation(createdAt)
    } else createdAt = actualConversation

    const content = e;
    setChatInput('')

    setIsStreaming(true)

    const userMessage = {
      role: 'user',
      content
    }

    let reply = {
      role: 'assistant',
      content: ""
    }

    const userMessages = [...messages, userMessage]

    setMessages(userMessages)


    const chunks = await engine.chat.completions.create({
      messages: userMessages,
      stream: true,
      temperature: .2,
      max_tokens: 1024,
    })

    const replyMessages = [...userMessages, reply]

    for await (const chunk of chunks) {
      const [choice] = chunk.choices
      const content = choice?.delta?.content ?? ""
      reply.content += content
      replyMessages.pop()
      replyMessages.push(reply)
      setMessages(replyMessages)
    }

    setIsStreaming(false)

    const conversationObject = {
      createdAt,
      lastMessage: Date.now(),
      messages: replyMessages
    }

    if (!!history?.length && !history?.find(({ createdAt: convCreatedAt }) => convCreatedAt === createdAt)) {
      const newHistory = [...history, conversationObject]
      setHistory(newHistory)
      localStorage.setItem(
        'past-conversations',
        JSON.stringify(newHistory)
      )
    } else {
      const newHistory = history.toSpliced(history.findIndex(({ createdAt: convCreatedAt }) => convCreatedAt === createdAt), 1, conversationObject)
      setHistory(newHistory)
      localStorage.setItem(
        'past-conversations',
        JSON.stringify(newHistory)
      )
    }

    scrollOnMessage()


  }

  function scrollOnMessage() {
    const $messagesContainer = document.body.querySelector("#messages-container");
    $messagesContainer?.scrollTo(0, $messagesContainer?.scrollHeight);

  }

  useEffect(() => {
    scrollOnMessage()
  }, [messages])

  useEffect(() => {
    const $textArea = document.body.querySelector("#ipt-textarea")
    $textArea.style.height = '26px'
    $textArea.style.height = $textArea.scrollHeight + 'px'
  }, [chatInput])

  useLayoutEffect(() => {
    const localConversations = localStorage.getItem('past-conversations')

    if (localConversations) setHistory(JSON.parse(localConversations))
    else localStorage.setItem('past-conversations', JSON.stringify([]))

  }, [])


  return (
    <form onSubmit={() => { sendMessage() }} className="w-4/5 overflow-hidden mb-2 bg-neutral-600 rounded-3xl flex justify-end gap-2 items-center p-2">
      {
        /* <div className="text-2xl p-2 hover:bg-neutral-500 rounded-xl flex items-center justify-center duration-300 ease-in-out cursor-pointer">
          <ion-icon name="attach-outline"></ion-icon>
        </div> */
      }
      <textarea
        name="ipt-textarea"
        id="ipt-textarea"
        className="resize-none overflow-y-auto max-h-56 w-full bg-neutral-600 outline-none h-10 p-2"
        onKeyDown={handleKeyDown}
        onChange={(e) => { setChatInput(e.target.value) }}
        value={chatInput}></textarea>
      <AudioRecorder onTranscriptSpeech={onTranscriptSpeech} disabled={isStreaming || !engine} onIsRecording={onIsRecording} />
      <button
        type='submit'
        onClick={() => { sendMessage() }}
        disabled={!engine || isStreaming || isRecording || !chatInput.trim().length}
        className="text-3xl flex items-center justify-center cursor-pointer disabled:text-neutral-500 disabled:cursor-not-allowed"
      >
        <ion-icon name="arrow-up-circle"></ion-icon>
      </button>
    </form>
  )
}

export default ChatInput