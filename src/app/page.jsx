'use client'
import CHAT from "@/components/chat";
import SIDEBAR from "@/components/sidebar";
import useChatStore from "@/store/chat";
import Image from "next/image";
import { useLayoutEffect } from "react";

export default function Home() {
  const { setHistory } = useChatStore(s => s)

  useLayoutEffect(() => {
    const localConversations = localStorage.getItem('past-conversations')
    if (localConversations) {
      const localHistory = JSON.parse(localConversations)
      setHistory(localHistory)
    } else localStorage.setItem('past-conversations', JSON.stringify([]))

  }, [])

  return (
    <main className="flex min-h-dvh maxh-h-dvh justify-between overflow-hidden">
      <SIDEBAR />
      <CHAT />
    </main>
  );
}
