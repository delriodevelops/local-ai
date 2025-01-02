'use client'
import useChatStore from '@/store/chat'
import React, { useEffect, useLayoutEffect, useState } from 'react'
import AudioRecorder from './audio-recorder'
import TextAreaOptions from './textarea-options'

const ChatInput = () => {
  const {
    engine, setMessages, messages, actualConversation, setActualConversation,
    setHistory, history, isStreaming, setIsStreaming, setActiveChainIndex,
    chain, temperature, max_tokens, top_p, repetition_penalty, modelSource,
    apiKeys, engine: model
  } = useChatStore(s => s)

  const [isRecording, setIsRecording] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [isSending, setIsSending] = useState(false)

  // API Helper Functions
  async function sendOpenAIMessage(content, systemMessage) {
    console.log(engine, messages)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKeys.openai}`
      },
      body: JSON.stringify({
        model,
        messages: [
          systemMessage,
          ...messages,
          { role: 'user', content }
        ],
        temperature,
        max_tokens,
        top_p,
        stream: true
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.body
  }

  async function sendGeminiMessage(content, systemMessage) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:streamGenerateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKeys.gemini}`
      },
      body: JSON.stringify({
        contents: [
          { role: 'system', content: systemMessage.content },
          ...messages,
          { role: 'user', content }
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: max_tokens,
          topP: top_p
        }
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.body
  }

  async function sendAnthropicMessage(content, systemMessage) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKeys.anthropic,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemMessage.content },
          ...messages,
          { role: 'user', content }
        ],
        max_tokens,
        temperature,
        top_p,
        stream: true
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.body
  }

  // Stream handling function
  async function handleStreamingResponse(stream, reply, currentMessages) {
    const reader = stream.getReader()
    let fullResponse = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n').filter(line => line.trim())

        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          const data = line.replace(/^data: /, '')
          if (data === '[DONE]') break

          try {
            let parsed
            let content = ''

            // Handle different API response formats
            if (modelSource === 'openai') {
              parsed = JSON.parse(data)
              content = parsed.choices[0]?.delta?.content || ''
            } else if (modelSource === 'gemini') {
              parsed = JSON.parse(data)
              content = parsed.candidates[0]?.content?.parts[0]?.text || ''
            } else if (modelSource === 'anthropic') {
              parsed = JSON.parse(data)
              content = parsed.delta?.text || ''
            }

            if (content) {
              fullResponse += content
              const updatedReply = { ...reply, content: fullResponse }
              setMessages([...currentMessages, updatedReply])
            }
          } catch (e) {
            console.error('Error parsing chunk:', e, 'Raw data:', data)
          }
        }
      }
    } catch (error) {
      console.error('Stream reading error:', error)
      throw error
    } finally {
      reader.releaseLock()
    }

    return fullResponse
  }

  function saveConversationToHistory(messages) {
    const currentTime = Date.now()
    const newConversation = {
      messages,
      createdAt: actualConversation || currentTime,
      lastMessage: currentTime
    }

    const pastConversations = JSON.parse(localStorage.getItem('past-conversations') || '[]')
    let updatedConversations

    if (actualConversation) {
      // Update existing conversation
      updatedConversations = pastConversations.map(conv =>
        conv.createdAt === actualConversation
          ? { ...newConversation }
          : conv
      )
    } else {
      // Add new conversation
      updatedConversations = [...pastConversations, newConversation]
      setActualConversation(currentTime)
    }

    localStorage.setItem('past-conversations', JSON.stringify(updatedConversations))
    setHistory(updatedConversations)
  }

  // Chain processing
  async function processChainStep(content, chainIndex, currentMessages) {
    if (isSending || !content.trim().length || isStreaming) return
    if (!engine && ['local', 'huggingface'].includes(modelSource)) return
    if ((!['local', 'huggingface'].includes(modelSource) && !apiKeys[modelSource]) && ['openai', 'gemini', 'anthropic'].includes(modelSource)) return

    setIsSending(true)
    setIsStreaming(true)
    setActiveChainIndex(chainIndex)

    const userMessage = {
      role: 'user',
      content: content.trim(),
    }

    if (chainIndex === 0) {
      setChatInput('')
    }

    const updatedMessages = [...currentMessages]
    if (chainIndex === 0) {
      updatedMessages.push(userMessage)
      setMessages(updatedMessages)
    }

    const systemMessage = {
      role: 'system',
      content: chain[chainIndex]?.instructions || 'You are a helpful assistant'
    }

    const reply = {
      role: 'assistant',
      content: '',
      icon: chain?.at(chainIndex)?.icon?.icon,
      color: chain?.at(chainIndex)?.color?.color
    }

    try {
      let stream
      let fullResponse = ''

      if (['local', 'huggingface'].includes(modelSource)) {
        stream = await engine.chat.completions.create({
          messages: [systemMessage, userMessage],
          stream: true,
          temperature,
          max_tokens,
          top_p,
          repetition_penalty
        })

        for await (const chunk of stream) {
          fullResponse += chunk.choices[0]?.delta.content || ""
          const updatedReply = { ...reply, content: fullResponse }
          setMessages([...updatedMessages, updatedReply])
        }
      } else {
        switch (modelSource) {
          case 'openai':
            stream = await sendOpenAIMessage(content, systemMessage)
            break
          case 'gemini':
            stream = await sendGeminiMessage(content, systemMessage)
            break
          case 'anthropic':
            stream = await sendAnthropicMessage(content, systemMessage)
            break
          default:
            throw new Error(`Unsupported model source: ${modelSource}`)
        }

        fullResponse = await handleStreamingResponse(stream, reply, updatedMessages)
      }

      const completeMessages = [...updatedMessages, { ...reply, content: fullResponse }]

      if (chain.length > chainIndex + 1) {
        await processChainStep(fullResponse, chainIndex + 1, completeMessages)
      } else {
        setActiveChainIndex(0)
        saveConversationToHistory(completeMessages)
      }
    } catch (error) {
      console.error('Error in processChainStep:', error)
      const errorReply = {
        ...reply,
        content: "Lo siento, hubo un error al procesar tu solicitud. Por favor, intenta nuevamente."
      }
      setMessages([...updatedMessages, errorReply])
    } finally {
      setIsSending(false)
      setIsStreaming(false)
    }
  }

  // Main send message function
  async function sendMessage(content = chatInput) {
    await processChainStep(content, 0, messages)
  }

  // Event handlers
  function onTranscriptSpeech(e) {
    setChatInput(e)
  }

  function onIsRecording(e) {
    setIsRecording(e)
  }

  async function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey && chatInput.trim() && !isSending) {
      e.preventDefault()
      await sendMessage()
    } else if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault()
      setChatInput(prev => prev + "\n")
    }
  }

  // Scroll effect
  useEffect(() => {
    const scrollOnMessage = () => {
      const messages = document.querySelector('#messages')
      if (messages) messages.scrollTop = messages.scrollHeight
    }
    scrollOnMessage()
  }, [messages])

  // Textarea height effect
  useEffect(() => {
    const $textArea = document.body.querySelector("#ipt-textarea")
    $textArea.style.height = '26px'
    $textArea.style.height = `${$textArea.scrollHeight}px`
  }, [chatInput])

  // Local storage effect
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
      className="w-full 2xl:w-3/5 mb-2 bg-neutral-600 rounded-3xl flex justify-end gap-2 items-center p-2 relative overflow-visible"
    >
      <TextAreaOptions />
      <textarea
        name="ipt-textarea"
        id="ipt-textarea"
        className="resize-none overflow-y-auto max-h-56 w-full bg-neutral-600 outline-none h-10 p-2"
        onKeyDown={handleKeyDown}
        onChange={(e) => setChatInput(e.target.value)}
        value={chatInput}
      ></textarea>
      <AudioRecorder
        onTranscriptSpeech={onTranscriptSpeech}
        disabled={isStreaming || !engine}
        onIsRecording={onIsRecording}
      />
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