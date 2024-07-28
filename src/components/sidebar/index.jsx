'use client'
import React, { useLayoutEffect } from 'react'

const SIDEBAR = () => {
  useLayoutEffect(() => {
    const localHistory = localStorage.getItem('conversations')
    if (localHistory) setHistory(JSON.parse(localHistory))
  }, [])
  return (
    <section className="bg-neutral-800 px-2 pt-2 pb-3 w-full max-w-64 flex flex-col h-full gap-2 justify-between">
      <article className="flex flex-col gap-2">
        <div className="self-end hover:bg-neutral-700  p-3 flex items-center justify-center rounded-xl cursor-pointer duration-300 ease-in-out">
          <ion-icon name="chevron-back-outline"></ion-icon>
        </div>
        <div className="flex items-center gap-2 p-4 hover:bg-neutral-600 bg-neutral-700 rounded-xl cursor-pointer duration-300 ease-in-out">
          <span className="flex items-center bg-neutral-500 p-2 rounded-full justify-center text-xl">
            <ion-icon name="create-outline"></ion-icon>
          </span>
          <p>
            Create new chat
          </p>
        </div>
        <small className="text-neutral-400 font-semibold pl-2">Past chats</small>
      </article>
      <article className="flex flex-col gap-2 pr-2 w-full overflow-y-auto h-dvh" style={{ maxHeight: "calc(100dvh - 171px)" }}>
        <p className="p-4 hover:bg-neutral-700 rounded-xl duration-300 ease-in-out cursor-pointer">yapping</p>
        <p className="p-4 hover:bg-neutral-700 rounded-xl duration-300 ease-in-out cursor-pointer">yapping</p>
        <p className="p-4 hover:bg-neutral-700 rounded-xl duration-300 ease-in-out cursor-pointer">yapping</p>
        <p className="p-4 hover:bg-neutral-700 rounded-xl duration-300 ease-in-out cursor-pointer">yapping</p>
        <p className="p-4 hover:bg-neutral-700 rounded-xl duration-300 ease-in-out cursor-pointer">yapping</p>
        <p className="p-4 hover:bg-neutral-700 rounded-xl duration-300 ease-in-out cursor-pointer">yapping</p>
        <p className="p-4 hover:bg-neutral-700 rounded-xl duration-300 ease-in-out cursor-pointer">yapping</p>
        <p className="p-4 hover:bg-neutral-700 rounded-xl duration-300 ease-in-out cursor-pointer">yapping</p>
        <p className="p-4 hover:bg-neutral-700 rounded-xl duration-300 ease-in-out cursor-pointer">yapping</p>
        <p className="p-4 hover:bg-neutral-700 rounded-xl duration-300 ease-in-out cursor-pointer">yapping</p>
        <p className="p-4 hover:bg-neutral-700 rounded-xl duration-300 ease-in-out cursor-pointer">yapping</p>
        <p className="p-4 hover:bg-neutral-700 rounded-xl duration-300 ease-in-out cursor-pointer">yapping</p>
        <p className="p-4 hover:bg-neutral-700 rounded-xl duration-300 ease-in-out cursor-pointer">yapping</p>
        <p className="p-4 hover:bg-neutral-700 rounded-xl duration-300 ease-in-out cursor-pointer">yapping</p>
        <p className="p-4 hover:bg-neutral-700 rounded-xl duration-300 ease-in-out cursor-pointer">yapping</p>
        <p className="p-4 hover:bg-neutral-700 rounded-xl duration-300 ease-in-out cursor-pointer">yapping</p>
        <p className="p-4 hover:bg-neutral-700 rounded-xl duration-300 ease-in-out cursor-pointer">yapping</p>
        <p className="p-4 hover:bg-neutral-700 rounded-xl duration-300 ease-in-out cursor-pointer">yapping</p>
        <p className="p-4 hover:bg-neutral-700 rounded-xl duration-300 ease-in-out cursor-pointer">yapping</p>
      </article>
    </section>
  )
}

export default SIDEBAR