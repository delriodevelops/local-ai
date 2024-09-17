'use client'
import useChatStore from '@/store/chat'
import React, { useEffect, useState } from 'react'
import AudioRecorder from './audio-recorder'

const ChatInput = () => {

  const { engine, setMessages, messages } = useChatStore(s => s)

  const [isStreaming, setIsStreaming] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [chatInput, setChatInput] = useState('')

  function onTranscriptSpeech(e) {
    return sendMessage(e)
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
    if (typeof e === 'object') e.preventDefault()
    if (!e.trim().length || !!isStreaming) return;
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
      stream: true
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

  }

  useEffect(() => {
    console.log('engine', engine)
  }, [engine])

  useEffect(() => {
  }, [messages])

  useEffect(() => {
    console.log(chatInput)
    const $textArea = document.body.querySelector("#ipt-textarea")
    $textArea.style.height = '26px'
    $textArea.style.height = $textArea.scrollHeight + 'px'
  }, [chatInput])


  return (
    <form onSubmit={() => { sendMessage() }} className="w-4/5 overflow-hidden mb-2 bg-neutral-600 rounded-3xl flex justify-end gap-2 items-center p-2">
      <div className="text-2xl p-2 hover:bg-neutral-500 rounded-xl flex items-center justify-center duration-300 ease-in-out cursor-pointer">
        <ion-icon name="attach-outline"></ion-icon>
      </div>
      <textarea
        name=""
        id="ipt-textarea"
        className="resize-none overflow-y-auto max-h-56 w-full bg-neutral-600 outline-none h-10 py-2 pr-2"
        onKeyDown={handleKeyDown}
        onChange={(e) => { setChatInput(e.target.value) }}
        value={chatInput}></textarea>
      <button
        type='submit'
        disabled={!engine || isStreaming || isRecording || !chatInput.trim().length}
        className="text-3xl flex items-center justify-center cursor-pointer disabled:text-neutral-500 disabled:cursor-not-allowed"
      >
        <ion-icon name="arrow-up-circle"></ion-icon>
      </button>
      <AudioRecorder onTranscriptSpeech={onTranscriptSpeech} disabled={isStreaming || !engine} onIsRecording={onIsRecording} />
    </form>
  )
}

export default ChatInput