'use client'
import useChatStore from '@/store/chat'
import React, { useEffect, useLayoutEffect, useState } from 'react'
import AudioRecorder from './audio-recorder'

const ChatInput = () => {
  const {
    engine, setMessages, messages, actualConversation, setActualConversation,
    setHistory, history, isStreaming, setIsStreaming, setActiveChainIndex,
    chain, activeChainIndex
  } = useChatStore(s => s)

  const [isRecording, setIsRecording] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [isSending, setIsSending] = useState(false)

  function onTranscriptSpeech(e) {
    setChatInput(e)
  }

  function onIsRecording(e) {
    setIsRecording(e)
  }

  async function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey && !!chatInput.trim().length && !isSending) {
      e.preventDefault()
      await sendMessage(chatInput)
    } else if (e.key === "Enter" && e.shiftKey) {
      setChatInput(prevValue => prevValue + "\n")
      e.preventDefault()
    }
  }

  async function sendMessage(content = chatInput, isChain = false, assistantIndex = 0, accumulatedMessages = messages) {
    if (isSending || !content.trim().length || isStreaming || !engine) return
    setIsSending(true)

    const userMessage = {
      role: 'user',
      content: content.trim(),
    }
    setChatInput('')

    // Update messages immediately with user message
    const updatedMessages = [...accumulatedMessages]
    if (!isChain) {
      updatedMessages.push(userMessage)
      setMessages(updatedMessages)
    }

    setIsStreaming(true)
    setActiveChainIndex(assistantIndex)

    const systemMessage = {
      role: 'system',
      content: chain[assistantIndex]?.instructions || 'You are a helpful assistant'
    }

    const reply = {
      role: 'assistant',
      content: '',
      icon: chain?.at(assistantIndex)?.icon?.icon,
      color: chain?.at(assistantIndex)?.color?.color
    }

    try {
      const currentMessages = isChain
        ? [...accumulatedMessages]
        : updatedMessages

      const stream = await engine.chat.completions.create({
        messages: isChain ? [systemMessage, userMessage] : currentMessages,
        stream: true,
        temperature: 0.1,
        max_tokens: 256, // Increased for fuller responses
      })

      let fullResponse = ''
      for await (const chunk of stream) {
        fullResponse += chunk.choices[0]?.delta.content || ""
        reply.content = fullResponse
        setMessages([...currentMessages, { ...reply }]) // Clone reply object
      }

      // Save complete conversation after response
      const completeMessages = [...currentMessages, { ...reply }]

      // Handle chain continuation
      if (chain.length > assistantIndex + 1) {
        await sendMessage(fullResponse, true, assistantIndex + 1, completeMessages)
      } else {
        setActiveChainIndex(0)
        setIsStreaming(false)
        // Save final conversation to history
        saveConversationToHistory(completeMessages)
      }

    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsSending(false)
    }
  }

  function saveConversationToHistory(completeMessages) {
    const conversationId = actualConversation || Date.now()

    const conversation = {
      createdAt: conversationId,
      lastMessage: Date.now(),
      messages: [...completeMessages] // Save complete message thread
    }

    // Create new history array with updated conversation
    const updatedHistory = history ? [...history] : []
    const existingIndex = updatedHistory.findIndex(conv => conv.createdAt === conversationId)

    if (existingIndex >= 0) {
      updatedHistory[existingIndex] = conversation
    } else {
      updatedHistory.unshift(conversation) // Add new conversations at the start
    }

    setHistory(updatedHistory)
    localStorage?.setItem('past-conversations', JSON.stringify(updatedHistory))
    setActualConversation(conversationId)
  }

  function scrollOnMessage() {
    const $messagesContainer = document.body.querySelector("#messages-container")
    $messagesContainer?.scrollTo(0, $messagesContainer?.scrollHeight)
  }

  useEffect(() => {
    scrollOnMessage()
  }, [messages])

  useEffect(() => {
    const $textArea = document.body.querySelector("#ipt-textarea")
    $textArea.style.height = '26px'
    $textArea.style.height = `${$textArea.scrollHeight}px`
  }, [chatInput])

  useLayoutEffect(() => {
    const localConversations = localStorage?.getItem('past-conversations')
    if (localConversations) setHistory(JSON.parse(localConversations))
    else localStorage?.setItem('past-conversations', JSON.stringify([]))
  }, [])

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (!isSending) await sendMessage()
      }}
      className="w-full 2xl:w-3/5 overflow-hidden mb-2 bg-neutral-600 rounded-3xl flex justify-end gap-2 items-center p-2"
    >
      <textarea
        name="ipt-textarea"
        id="ipt-textarea"
        className="resize-none overflow-y-auto max-h-56 w-full bg-neutral-600 outline-none h-10 p-2"
        onKeyDown={handleKeyDown}
        onChange={(e) => setChatInput(e.target.value)}
        value={chatInput}
      ></textarea>
      <AudioRecorder onTranscriptSpeech={onTranscriptSpeech} disabled={isStreaming || !engine} onIsRecording={onIsRecording} />
      <button
        type='submit'
        onClick={async () => {
          if (!isSending) await sendMessage()
        }}
        disabled={!engine || isStreaming || isRecording || !chatInput.trim().length}
        className="text-4xl flex items-center justify-center cursor-pointer disabled:text-neutral-500 disabled:cursor-not-allowed"
      >
        <ion-icon name="arrow-up-circle"></ion-icon>
      </button>
    </form>
  )
}

export default ChatInput
