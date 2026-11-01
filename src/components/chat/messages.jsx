import React, { useEffect } from 'react'
import useChatStore from '@/store/chat'
import Message from './message'

const Messages = () => {
  const { messages, isStreaming } = useChatStore(s => s)

  return (
    <article className="h-full w-full 2xl:w-3/5 overflow-y-auto py-2 flex flex-col gap-6 overflow-y-auto" id="messages-container" style={{ height: "calc(100dvh - 115px)" }}>
      {!messages.length && <Welcome />}
      {
        messages.map((el, i, arr) => (
          // id para que el esquema de la cadena pueda saltar a la respuesta de cada paso
          <div key={i} id={`message-${i}`} className='scroll-mt-4'>
            <Message
              message={el}
              isStreaming={i === (arr.length - 1) ? isStreaming : false} />
          </div>
        )
        )
      }
    </article>
  )
}

const STEPS = [
  { icon: 'server-outline', title: 'Pick a model', text: 'It downloads once and runs on your own GPU. Nothing leaves your browser.' },
  { icon: 'people-outline', title: 'Chain assistants', text: 'Add assistants from the sidebar. Each one gets the previous one’s answer.' },
  { icon: 'git-network-outline', title: 'Follow the reasoning', text: 'Open Chain to see every step, what it answered, and reorder them.' },
]

function Welcome() {
  return (
    <div className="m-auto max-w-2xl px-4 flex flex-col items-center text-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <img src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/icon.svg`} alt="" width={56} height={56} className="rounded-xl" />
        <h1 className="text-3xl font-semibold">MeshMind</h1>
        <p className="text-neutral-400">Chain AI assistants that run entirely in your browser.</p>
      </div>
      <ol className="grid gap-3 sm:grid-cols-3 w-full text-left">
        {STEPS.map((step, i) => (
          <li key={step.title} className="rounded-xl bg-neutral-800 p-4 flex flex-col gap-2">
            <span className="flex items-center gap-2 text-lime-400">
              <ion-icon name={step.icon} />
              <span className="text-xs text-neutral-500">{i + 1}</span>
            </span>
            <span className="font-medium">{step.title}</span>
            <span className="text-sm text-neutral-400">{step.text}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default Messages