import React from 'react'
import useChatStore from '@/store/chat'
import Message from './message'

const Messages = () => {
  const { messages, isStreaming } = useChatStore(s => s)
  const visible = messages.filter(m => ['user', 'assistant'].includes(m.role))

  return (
    <article className="h-full w-full overflow-y-auto py-8 flex flex-col gap-8" id="messages-container" style={{ height: "calc(100dvh - 115px)" }}>
      {!visible.length && <Welcome />}
      {
        messages.map((el, i, arr) => (
          // id para que el esquema de la cadena pueda saltar a la respuesta de cada paso
          <div key={i} id={`message-${i}`} className='scroll-mt-4 px-1 empty:hidden'>
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
  { title: 'Pick a model', text: 'It downloads once and runs on your own GPU. Nothing leaves your browser.' },
  { title: 'Chain assistants', text: 'Tap assistants in the sidebar. Each one receives the previous one’s answer.' },
  { title: 'Follow the reasoning', text: 'Open Chain to see every step, what it said, and reorder them.' },
]

// Nodos y aristas de la malla: la señal viaja de un asistente a otro
const NODES = [[40, 150], [120, 60], [150, 190], [230, 110], [300, 200], [320, 50]]
const EDGES = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [1, 5], [2, 4]]

function Mesh() {
  return (
    <svg viewBox="0 0 360 250" className="w-full h-auto" aria-hidden="true">
      {EDGES.map(([a, b], i) => (
        <g key={i}>
          <line x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]} stroke="#26281f" strokeWidth="1" />
          <line
            x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]}
            stroke="#c8f560" strokeWidth="1.5" strokeLinecap="round"
            className="mesh-trace" style={{ animationDelay: `${i * 0.4}s` }}
          />
        </g>
      ))}
      {NODES.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="14" fill="#c8f560" opacity="0.08" className="mesh-node" style={{ animationDelay: `${i * 0.5}s` }} />
          <circle cx={x} cy={y} r="5" fill="#0b0c09" stroke="#c8f560" strokeWidth="1.5" />
        </g>
      ))}
    </svg>
  )
}

function Welcome() {
  return (
    <div className="my-auto w-full max-w-4xl mx-auto px-2 lg:px-6">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-center">
        <div className="flex flex-col gap-5 animate-rise">
          <span className="label">MeshMind · local inference</span>
          <h1 className="font-display text-6xl sm:text-7xl lg:text-8xl leading-[0.9] tracking-tight text-neutral-50">
            Think in <em className="text-signal">chains.</em>
          </h1>
          <p className="text-neutral-400 max-w-md text-[15px] leading-relaxed">
            Line up AI assistants that hand their answers to each other, running entirely in your browser. No server, no API key.
          </p>
        </div>
        <div className="hidden sm:block animate-rise" style={{ animationDelay: '120ms' }}>
          <Mesh />
        </div>
      </div>
      <ol className="mt-10 grid sm:grid-cols-3 border-t border-neutral-800">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className="py-5 sm:pr-6 sm:pl-0 flex flex-col gap-2 border-b sm:border-b-0 border-neutral-800 animate-rise sm:[&:not(:first-child)]:pl-6 sm:[&:not(:first-child)]:border-l"
            style={{ animationDelay: `${200 + i * 80}ms` }}
          >
            <span className="font-mono text-xs text-lime-300">{String(i + 1).padStart(2, '0')}</span>
            <span className="text-neutral-50">{step.title}</span>
            <span className="text-sm text-neutral-400 leading-relaxed">{step.text}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default Messages
