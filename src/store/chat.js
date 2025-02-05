import { create } from 'zustand'
import * as webllm from "@mlc-ai/web-llm";
import { getLocalStorage } from '@/utils/custom-storage';

const useChatStore = create((set, get) => ({
  engine: null,
  setEngine: async (selectedModel, requiresApiKey) => {
    set({ engine: null })
    set({ progress: null })
    async function handleSelectModel() {
      const worker = new Worker(new URL('/public/workers/chat.js', import.meta.url));
      const newEngine = await webllm.CreateWebWorkerMLCEngine(
        worker,
        selectedModel.model_id,
        {
          initProgressCallback: (e) => {
            get().setProgress(e)
          }
        }
      )
      return newEngine
    }
    let newEngine;
    if (!requiresApiKey) newEngine = await handleSelectModel()
    else newEngine = selectedModel

    return set({ engine: newEngine, selectedModel })
  },

  modelSource: 'local',
  setModelSource: (modelSource) => set({ modelSource }),

  progress: null,
  setProgress: (newProgress) => set({ progress: newProgress }),

  messages: [],
  setMessages: (newMessages) => set({ messages: newMessages }),

  activeChainIndex: 0,
  setActiveChainIndex: (index) => set({ activeChainIndex: index }),

  isStreaming: false,
  setIsStreaming: (isStreaming) => set({ isStreaming }),

  history: [],
  setHistory: (history) => set({ history }),

  actualConversation: null,
  setActualConversation: (actualConversation) => set({ actualConversation }),


  isHistoryCollapsed: true,
  setIsHistoryCollapsed: (isHistoryCollapsed) => set({ isHistoryCollapsed }),

  assistants: JSON.parse(getLocalStorage('assistants')) || [],
  setAssistants: (assistants) => set({ assistants }),

  chain: [],
  setChain: (chain) => set({ chain }),
  toggleFromChain: (assistant) => set(state => ({
    chain: state.chain.some(a => a.id === assistant.id)
      ? state.chain.filter(a => a.id !== assistant.id)
      : [...state.chain, assistant]
  })),

  activeChainIndex: 0,
  setActiveChainIndex: (activeChainIndex) => set({ activeChainIndex }),

  setTop_p: (top_p) => set({ top_p }),
  top_p: 0.7,

  setTemperature: (temperature) => set({ temperature }),
  temperature: 0.5,

  setMaxTokens: (max_tokens) => set({ max_tokens }),
  max_tokens: 2048,

  setRepetitionPenalty: (repetition_penalty) => set({ repetition_penalty }),
  repetition_penalty: 1.1,

  apiKeys: {
    openai: JSON.parse(getLocalStorage('openaiApiKey')) || '',
    gemini: JSON.parse(getLocalStorage('geminiApiKey')) || '',
    anthropic: JSON.parse(getLocalStorage('anthropicApiKey')) || '',
  },
  setApiKeys: (apiKeys) => set({ apiKeys }),


  selectedModel: null,
  setSelectedModel: (selectedModel) => set({ selectedModel }),
}))

export default useChatStore