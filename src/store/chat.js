import { create } from 'zustand'
import * as webllm from "@mlc-ai/web-llm";
import { getLocalStorage, setLocalStorage } from '@/utils/custom-storage';

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
          sliding_window_size: 16000,
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

  activeChainIndex: 0,
  setActiveChainIndex: (index) => set({ activeChainIndex: index }),

  isStreaming: false,
  setIsStreaming: (isStreaming) => set({ isStreaming }),

  history: [],
  setHistory: (history) => set({ history }),

  actualConversation: null,
  setActualConversation: (actualConversation) => set({ actualConversation }),


  isHistoryCollapsed: false,
  setIsHistoryCollapsed: (isHistoryCollapsed) => set({ isHistoryCollapsed }),

  assistants: JSON.parse(getLocalStorage('assistants')) || [],
  createAssistant: (assistant) => set((state) => {
    const newAssistants = [...state.assistants, assistant]
    setLocalStorage('assistants', JSON.stringify(newAssistants))
    return { assistants: newAssistants }
  }),

  setAssistants: (assistants) => set({ assistants }),

  actualAssistant: {
    content: "Actúa como un asistente para un creador de contenido que busca ideas virales para vídeos de YouTube y TikTok. Ayúdame a generar contenido que sea serio, relajado y humorístico, conectando temas de tecnología, programación, música, política y economía. Proporciona guiones completos para vídeos de entre diez y treinta minutos, títulos llamativos optimizados para SEO, descripciones de vídeos basadas en el guión y sugerencias para miniaturas atractivas. Sugiere formatos ganadores y estrategias para aumentar la retención de audiencia. Mantente al día con las últimas novedades y modas, e incluye recomendaciones para la edición y el montaje de los vídeos. Tienes que hacer la investigación y escribir un guión optimizado para poder sacar fragmentos virales para tiktok y que maximice la retención de audiencia. Y el guión tiene que ser completo (ten en cuenta que 15 minutos hablando son entre 2000 y 2500 palabras) ademas de ir acompañado de indicaciones, anotaciones y propuestas.",
    icon: "happy",
    name: "YouTube assitant por el culo me lo meto esto",
    id: "111",
  },
  setActualAssistant: (actualAssistant) => set({ actualAssistant }),

  actualChain: [],
  setActualChain: (actualChain) => set({ actualChain }),
  selectedAssistant: null,
  setSelectedAssistant: (assistant) => set({ selectedAssistant: assistant }),
  sendMessage: (message) => set((state) => {
    const systemPrompt = state.selectedAssistant?.instructions || "You are a helpful AI assistant"
    const newMessages = [
      { role: 'system', content: systemPrompt },
      ...state.messages,
      { role: 'user', content: message }
    ]
    return { messages: newMessages }
  }),

  chain: [],
  setChain: (chain) => set({ chain }),
  toggleFromChain: (assistant) => set(state => ({
    chain: state.chain.some(a => a.id === assistant.id)
      ? state.chain.filter(a => a.id !== assistant.id)
      : [...state.chain, assistant]
  })),
  activeChainIndex: 0,
  setActiveChainIndex: (index) => set({ activeChainIndex: index }),



  // increasePopulation: () => set((state) => ({ bears: state.bears + 1 })),
  // removeAllBears: () => set({ bears: 0 }),
  // updateBears: (newBears) => set({ bears: newBears }),
}))

export default useChatStore