'use client'
import React from 'react'
import { Reorder } from 'framer-motion'
import useChatStore from '@/store/chat'

// Respuestas de la última ejecución, por paso: lo que hay tras el último mensaje del usuario
function getLastRunOutputs(messages) {
  const lastUserIndex = messages.findLastIndex(m => m.role === 'user')
  const outputs = {}
  if (lastUserIndex === -1) return outputs
  messages.slice(lastUserIndex + 1).forEach((m, offset) => {
    if (m.role === 'assistant' && m.step !== undefined) {
      outputs[m.step] = { content: m.content, assistantId: m.assistantId, messageIndex: lastUserIndex + 1 + offset }
    }
  })
  return outputs
}

function getStatus(index, { isStreaming, activeChainIndex, output, assistantId }) {
  // Una salida de otro asistente en ese paso (la cadena se ha reordenado desde entonces) no cuenta
  const hasOutput = !!output && output.assistantId === assistantId
  if (isStreaming) {
    if (index === activeChainIndex) return 'running'
    if (index < activeChainIndex) return 'done'
    return 'waiting'
  }
  return hasOutput ? 'done' : 'idle'
}

const STATUS = {
  running: { label: 'Working…', dot: 'bg-lime-400 animate-pulse', card: 'border-lime-500 bg-lime-900/30' },
  done: { label: 'Done', dot: 'bg-lime-500', card: 'border-neutral-600 bg-neutral-800' },
  waiting: { label: 'Waiting', dot: 'bg-neutral-500', card: 'border-neutral-700 bg-neutral-800/60 opacity-70' },
  idle: { label: 'Not run yet', dot: 'bg-neutral-600', card: 'border-neutral-700 bg-neutral-800' },
}

function scrollToMessage(index) {
  document.getElementById(`message-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// Resumen en texto plano: sin **, #, listas ni saltos de línea del Markdown
function toPlainText(markdown = '') {
  return markdown
    .replace(/`{1,3}[^`]*`{1,3}/g, ' ')
    .replace(/^\s*(#{1,6}|[-*+]|\d+\.|>)\s+/gm, '')
    .replace(/[*_~]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function Arrow({ vertical }) {
  return (
    <div className={`flex items-center justify-center text-neutral-500 shrink-0 ${vertical ? 'h-6' : 'w-8 self-center'}`} aria-hidden="true">
      <ion-icon name={vertical ? 'arrow-down' : 'arrow-forward'} />
    </div>
  )
}

function StepCard({ assistant, index, status, output, vertical, onRemove, isStreaming, onJump }) {
  const style = STATUS[status]
  const canJump = !!output && status === 'done'

  return (
    <div className={`group rounded-xl border p-3 flex flex-col gap-2 duration-300 ${style.card} ${vertical ? 'w-full' : 'w-56'}`}>
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-400 w-4">{index + 1}</span>
        <span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-lg ${assistant?.color?.color || 'bg-neutral-600'}`}>
          <ion-icon name={assistant?.icon?.icon || 'person'} />
        </span>
        <span className="font-medium text-neutral-100 truncate flex-1" title={assistant.name}>{assistant.name}</span>
        {!isStreaming && (
          <button
            type="button"
            onClick={onRemove}
            onPointerDown={e => e.stopPropagation()}
            className="text-neutral-400 hover:text-red-400 p-1 rounded-full lg:opacity-0 lg:group-hover:opacity-100 duration-200"
            title="Remove from chain"
          >
            <ion-icon name="close" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-neutral-400">
        <span className={`w-2 h-2 rounded-full ${style.dot}`} />
        {style.label}
      </div>

      {canJump ? (
        <button
          type="button"
          onClick={() => onJump(output.messageIndex)}
          onPointerDown={e => e.stopPropagation()}
          className="text-left text-xs text-neutral-300 line-clamp-3 hover:text-white"
          title="Go to this answer"
        >
          {toPlainText(output.content)}
        </button>
      ) : (
        <p className="text-xs text-neutral-500 line-clamp-3 italic">
          {assistant.instructions || 'No instructions'}
        </p>
      )}
    </div>
  )
}

// onNavigate: lo llama al saltar a una respuesta, para que quien lo contiene se cierre y no la tape
const ChainFlow = ({ vertical = false, onNavigate = () => { } }) => {
  const { chain, setChain, isStreaming, activeChainIndex, messages } = useChatStore(s => s)
  const outputs = getLastRunOutputs(messages)
  const jump = (messageIndex) => {
    onNavigate()
    // Tras cerrar el panel o la ventana, para que el salto se calcule con el diseño ya sin ellos
    setTimeout(() => scrollToMessage(messageIndex), 50)
  }
  const lastStep = chain.length - 1
  const finalOutput = !isStreaming && outputs[lastStep]?.assistantId === chain[lastStep]?.id ? outputs[lastStep] : null

  if (!chain.length) {
    return (
      <p className="text-sm text-neutral-400 p-4 text-center">
        Add assistants from the sidebar to build a chain. Each one receives the previous one&apos;s answer.
      </p>
    )
  }

  const remove = (index) => setChain(chain.filter((_, i) => i !== index))

  return (
    <div className={`flex ${vertical ? 'flex-col items-stretch' : 'flex-row items-stretch'} p-3`}>
      <div className={`rounded-xl border border-neutral-700 bg-neutral-900 p-3 flex items-center gap-2 text-sm text-neutral-300 shrink-0 ${vertical ? '' : 'self-center'}`}>
        <ion-icon name="person" /> You
      </div>
      <Arrow vertical={vertical} />

      <Reorder.Group
        axis={vertical ? 'y' : 'x'}
        values={chain}
        onReorder={isStreaming ? () => { } : setChain}
        className={`flex ${vertical ? 'flex-col' : 'flex-row'}`}
      >
        {chain.map((assistant, index) => (
          <Reorder.Item
            key={assistant.id}
            value={assistant}
            dragListener={!isStreaming}
            className={`flex ${vertical ? 'flex-col' : 'flex-row'} ${isStreaming ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
          >
            <StepCard
              assistant={assistant}
              index={index}
              status={getStatus(index, { isStreaming, activeChainIndex, output: outputs[index], assistantId: assistant.id })}
              output={outputs[index]}
              vertical={vertical}
              isStreaming={isStreaming}
              onRemove={() => remove(index)}
              onJump={jump}
            />
            {index < chain.length - 1 && <Arrow vertical={vertical} />}
          </Reorder.Item>
        ))}
      </Reorder.Group>

      <Arrow vertical={vertical} />
      <button
        type="button"
        disabled={!finalOutput}
        onClick={() => jump(finalOutput.messageIndex)}
        title={finalOutput ? 'Go to the final answer' : 'Run the chain to get a result'}
        className={`rounded-xl border p-3 flex items-center gap-2 text-sm shrink-0 duration-300 ${vertical ? '' : 'self-center'} ${finalOutput ? 'border-lime-600 bg-lime-900/30 text-lime-200 hover:bg-lime-800/40' : 'border-neutral-700 bg-neutral-900 text-neutral-500 cursor-default'}`}
      >
        <ion-icon name="flag" /> Result
      </button>
    </div>
  )
}

export default ChainFlow
