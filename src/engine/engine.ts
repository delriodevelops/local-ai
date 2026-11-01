import { create } from 'zustand'
import type { ChatCompletionMessageParam, WebWorkerMLCEngine } from '@mlc-ai/web-llm'
import { webllm } from './models'

type Status = 'empty' | 'loading' | 'ready' | 'error'

type EngineState = {
  status: Status
  modelId: string | null
  progress: number
  progressText: string
  error: string | null
  load: (modelId: string) => Promise<void>
}

let engine: WebWorkerMLCEngine | null = null

export const useEngine = create<EngineState>((set, get) => ({
  status: 'empty',
  modelId: null,
  progress: 0,
  progressText: '',
  error: null,

  async load(modelId) {
    if (get().modelId === modelId && get().status === 'ready') return
    set({ status: 'loading', modelId, progress: 0, progressText: 'Starting…', error: null })
    const initProgressCallback = ({ progress, text }: { progress: number; text: string }) =>
      set({ progress, progressText: text })
    try {
      if (!engine) {
        const { CreateWebWorkerMLCEngine } = await webllm()
        const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
        engine = await CreateWebWorkerMLCEngine(worker, modelId, { initProgressCallback })
      } else {
        engine.setInitProgressCallback(initProgressCallback)
        await engine.reload(modelId)
      }
      // Si mientras tanto se eligió otro modelo, ese manda
      if (get().modelId === modelId) set({ status: 'ready', progress: 1 })
    } catch (error) {
      set({ status: 'error', error: error instanceof Error ? error.message : String(error) })
    }
  },
}))

export type GenerateOptions = {
  temperature: number
  maxTokens: number
  signal: AbortSignal
  onToken: (text: string) => void
}

// Una respuesta en streaming; devuelve el texto completo
export async function generate(messages: ChatCompletionMessageParam[], { temperature, maxTokens, signal, onToken }: GenerateOptions) {
  if (!engine || useEngine.getState().status !== 'ready') throw new Error('No model loaded')
  const stream = await engine.chat.completions.create({ messages, stream: true, temperature, max_tokens: maxTokens })
  let text = ''
  for await (const chunk of stream) {
    if (signal.aborted) {
      engine.interruptGenerate()
      break
    }
    text += chunk.choices[0]?.delta?.content ?? ''
    onToken(text)
  }
  return text
}
