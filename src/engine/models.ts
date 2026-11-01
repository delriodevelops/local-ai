// WebLLM pesa varios MB: se importa bajo demanda para que la página abra al instante
export const webllm = () => import('@mlc-ai/web-llm')

// Buenos puntos de partida: rápidos de descargar y suficientes para encadenar pasos
export const RECOMMENDED = [
  'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
  'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  'SmolLM2-360M-Instruct-q4f16_1-MLC',
]

export type ModelInfo = {
  id: string
  sizeGB: number
  recommended: boolean
}

// Solo modelos de chat (sin embeddings ni visión), recomendados primero y luego de menor a mayor
export async function loadModels(): Promise<ModelInfo[]> {
  const { prebuiltAppConfig, ModelType } = await webllm()
  return prebuiltAppConfig.model_list
    .filter(m => (m.model_type ?? ModelType.LLM) === ModelType.LLM)
    .map(m => ({ id: m.model_id, sizeGB: (m.vram_required_MB ?? 0) / 1024, recommended: RECOMMENDED.includes(m.model_id) }))
    .sort((a, b) => Number(b.recommended) - Number(a.recommended) || a.sizeGB - b.sizeGB)
}

export async function isCached(modelId: string) {
  const { hasModelInCache } = await webllm()
  return hasModelInCache(modelId)
}

export const hasWebGPU = () => typeof navigator !== 'undefined' && 'gpu' in navigator
