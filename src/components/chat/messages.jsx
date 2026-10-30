import React, { useEffect } from 'react'
import useChatStore from '@/store/chat'
import Message from './message'

const Messages = () => {
  const { messages, isStreaming } = useChatStore(s => s)

  return (
    <article className="h-full w-full 2xl:w-3/5 overflow-y-auto py-2 flex flex-col gap-6 overflow-y-auto" id="messages-container" style={{ height: "calc(100dvh - 115px)" }}>
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

export default Messages