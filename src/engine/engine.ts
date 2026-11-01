import { create } from 'zustand'
import type { ChatCompletionMessageParam, ResponseFormat, WebWorkerMLCEngine } from '@mlc-ai/web-llm'
import { webllm } from './models'
import { exclusive, useResources } from './resources'

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
    // La velocidad medida era la del modelo anterior
    useResources.getState().set({ tokensPerSecond: null })
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
  // Cuando la respuesta consigue el motor y empieza de verdad, tras la cola
  onStart?: () => void
  // Formato obligado (las llamadas a herramientas del agente) y penalización por repetir, que estorba al escribir JSON
  responseFormat?: ResponseFormat
  repetitionPenalty?: number
}

// Una respuesta en streaming; devuelve el texto completo.
// El motor atiende una respuesta cada vez: las ramas paralelas con asistentes hacen cola aquí
export function generate(messages: ChatCompletionMessageParam[], { temperature, maxTokens, signal, onToken, onStart, responseFormat, repetitionPenalty = 1.1 }: GenerateOptions) {
  return exclusive('llm', async () => {
    // Parado mientras esperaba turno: no ha llegado a empezar
    if (signal.aborted) throw new DOMException('Stopped', 'AbortError')
    if (!engine || useEngine.getState().status !== 'ready') throw new Error('No model loaded')
    onStart?.()
    const { modelId } = useEngine.getState()
    const resources = useResources.getState()
    resources.set({ llmBusy: true })
    try {
      // La penalización evita que los modelos pequeños entren en bucle con contextos largos
      const stream = await engine.chat.completions.create({
        messages, stream: true, temperature, max_tokens: maxTokens, repetition_penalty: repetitionPenalty, response_format: responseFormat,
      })
      let text = ''
      let tokens = 0
      let started = 0
      for await (const chunk of stream) {
        if (signal.aborted) {
          engine.interruptGenerate()
          break
        }
        // Cada fragmento del stream es un token; se mide desde el primero para no contar la lectura del prompt
        started ||= performance.now()
        tokens++
        text += chunk.choices[0]?.delta?.content ?? ''
        onToken(text)
      }
      const seconds = (performance.now() - started) / 1000
      if (tokens > 8 && seconds > 0 && useEngine.getState().modelId === modelId) resources.set({ tokensPerSecond: tokens / seconds })
      return text
    } finally {
      resources.set({ llmBusy: false })
    }
  })
}
