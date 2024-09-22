import { create } from 'zustand'
import * as webllm from "@mlc-ai/web-llm";

const useChatStore = create((set, get) => ({
  // model: null,
  // setModel: (newModel) => set({ model: newModel }),

  engine: null,
  setEngine: async (selectedModel) => {
    async function handleSelectModel() {
      const worker = new Worker(new URL('/public/workers/chat.js', import.meta.url));
      const newEngine = await webllm.CreateWebWorkerMLCEngine(
        worker,
        selectedModel,
        {
          initProgressCallback: (e) => {
            get().setProgress(e)
          }
        }, // engineConfig
        {
          context_window_size: -1,
          sliding_window_size: 4096,
          attention_sink_size: 4,
        }
      )
      return newEngine
    }

    const newEngine = await handleSelectModel()

    return set({ engine: newEngine })
  },

  progress: null,
  setProgress: (newProgress) => set({ progress: newProgress }),

  messages: [],
  setMessages: (newMessages) => set({ messages: newMessages }),

  streaming: false,
  setStreaming: (streaming) => set({ streaming }),

  history: [],
  setHistory: (history) => set({ history }),

  actualConversation: null,
  setActualConversation: (actualConversation) => set({ actualConversation }),

  isStreaming: false,
  setIsStreaming: (isStreaming) => set({ isStreaming }),

  isHistoryCollapsed: false,
  setIsHistoryCollapsed: (isHistoryCollapsed) => set({ isHistoryCollapsed })

  // increasePopulation: () => set((state) => ({ bears: state.bears + 1 })),
  // removeAllBears: () => set({ bears: 0 }),
  // updateBears: (newBears) => set({ bears: newBears }),
}))

export default useChatStore