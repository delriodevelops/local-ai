import { rateModel, type DeviceProfile, type Fit } from './device'

// WebLLM pesa varios MB: se importa bajo demanda para que la página abra al instante
export const webllm = () => import('@mlc-ai/web-llm')

// Mes en que salió cada familia en Hugging Face, de la más nueva a la más vieja. Gana la primera línea que encaja
const RELEASED: [RegExp, string][] = [
  [/^gemma-4-/, '2026-03'],
  [/^Qwen3\.5-/, '2026-02'],
  [/^Ministral-3-/, '2025-12'],
  [/^(Qwen3|OLMo-2-0425)-/, '2025-04'],
  [/^gemma3-/, '2025-03'],
  [/^Phi-4-/, '2025-02'],
  [/^DeepSeek-R1-/, '2025-01'],
  [/^(Hermes-3-Llama-3\.2|OLMo-2-1124)-/, '2024-12'],
  [/^Qwen2\.5-Coder-(0\.5|3)B/, '2024-11'],
  [/^SmolLM2-/, '2024-10'],
  [/^(Llama-3\.2|Qwen2\.5|gemma-2-2b-jpn)-/, '2024-09'],
  [/^(Phi-3\.5|Qwen2-Math)-/, '2024-08'],
  [/^(Llama-3\.1|Hermes-3-Llama-3\.1|gemma-2-2b)-/, '2024-07'],
  [/^(gemma-2-9b|Qwen2)-/, '2024-06'],
  [/^(Mistral-7B-Instruct-v0\.3|Hermes-2-Theta)-/, '2024-05'],
  [/^(Llama-3|Phi-3|Hermes-2-Pro-Llama)-/, '2024-04'],
  [/^Hermes-2-Pro-Mistral-/, '2024-03'],
  [/^gemma-2b-/, '2024-02'],
  [/^stablelm-2-/, '2024-01'],
  [/^(Mistral-7B-Instruct-v0\.2|WizardMath|phi-2|TinyLlama-1\.1B-Chat-v1)/, '2023-12'],
  [/^(NeuralHermes|TinyLlama-1\.1B-Chat-v0\.4)/, '2023-11'],
  [/^OpenHermes-/, '2023-10'],
  [/^phi-1_5/, '2023-09'],
  [/^Llama-2-/, '2023-07'],
  [/^RedPajama-/, '2023-05'],
]

// Una familia que no está en la tabla llegó con una versión de WebLLM más nueva que la tabla: cuenta como reciente
const LATEST = RELEASED[0][1]

// Miles de millones de parámetros, sacados del nombre (360M, 1.7B, 1_6b, E2B); los Phi no lo dicen
function params(id: string) {
  if (/^Phi-[34](\.5)?-mini/.test(id)) return 3.8
  if (id.startsWith('phi-2')) return 2.7
  if (id.startsWith('phi-1_5')) return 1.4
  const size = id.match(/-E?(\d+(?:[._]\d+)?)([BM])-/i)
  return size ? Number(size[1].replace('_', '.')) / (/m/i.test(size[2]) ? 1000 : 1) : 1
}

// Lo listo que es, estimado: el doble de parámetros cuenta como ocho meses de avances. Bajan los de nicho (código, mates,
// japonés), los que piensan antes de responder (lentos, y se comen los tokens de la respuesta) y los base, que no siguen instrucciones
function smarts(id: string, released: string) {
  const [year, month] = released.split('-').map(Number)
  const niche = /Coder|Math|jpn|DeepSeek-R1|Reasoning/.test(id) ? 1 : 0
  const base = /-Base-/.test(id) ? 4 : 0
  return Math.log2(params(id)) + ((year - 2023) * 12 + month) / 8 - niche - base
}

export type ModelInfo = {
  id: string
  // Las versiones de un mismo modelo (otra cuantización, menos contexto) comparten familia
  family: string
  sizeGB: number
  released: string
  smarts: number
}

// Solo modelos de chat (sin embeddings ni visión)
export async function loadModels(): Promise<ModelInfo[]> {
  const { prebuiltAppConfig, ModelType } = await webllm()
  return prebuiltAppConfig.model_list
    .filter(m => (m.model_type ?? ModelType.LLM) === ModelType.LLM)
    .map(m => {
      const released = RELEASED.find(([family]) => family.test(m.model_id))?.[1] ?? LATEST
      return {
        id: m.model_id,
        family: m.model_id.replace(/-(BF16-)?q\d\w*?-MLC(-1k)?$/, ''),
        sizeGB: (m.vram_required_MB ?? 0) / 1024,
        released,
        smarts: smarts(m.model_id, released),
      }
    })
}

export type RankedModel = ModelInfo & { fit: Fit }

const FIT = { good: 0, tight: 1, no: 2 }

// Primero lo que cabe bien en este equipo, luego lo justo y al final lo que no cabe; dentro, lo más listo y nuevo.
// Cada modelo sale una vez, en la versión que mejor le va, y las demás versiones van aparte
export function rankModels(models: ModelInfo[], profile: DeviceProfile | null, cached: Set<string>) {
  const rated: RankedModel[] = models.map(m => ({ ...m, fit: rateModel(m, profile, cached.has(m.id)) }))
  // La mejor versión: una que quepa, ya descargada si la hay, a 4 bits, con todo el contexto y lo más ligera posible
  const better = (a: RankedModel, b: RankedModel) =>
    Number(a.fit.level === 'no') - Number(b.fit.level === 'no') ||
    Number(cached.has(b.id)) - Number(cached.has(a.id)) ||
    Number(/-q0/.test(a.id)) - Number(/-q0/.test(b.id)) ||
    Number(a.id.endsWith('-1k')) - Number(b.id.endsWith('-1k')) ||
    FIT[a.fit.level] - FIT[b.fit.level] ||
    a.sizeGB - b.sizeGB
  const families = new Map<string, RankedModel[]>()
  for (const model of rated) families.set(model.family, [...(families.get(model.family) ?? []), model])
  const main: RankedModel[] = []
  const others: RankedModel[] = []
  for (const versions of families.values()) {
    const [best, ...rest] = versions.sort(better)
    main.push(best)
    others.push(...rest)
  }
  const smarter = (a: RankedModel, b: RankedModel) => b.smarts - a.smarts || a.family.localeCompare(b.family)
  return {
    main: main.sort((a, b) => FIT[a.fit.level] - FIT[b.fit.level] || smarter(a, b)),
    // Las otras versiones de cada modelo, juntas y en el mismo orden de listos
    others: others.sort((a, b) => smarter(a, b) || better(a, b)),
  }
}

export async function isCached(modelId: string) {
  const { hasModelInCache } = await webllm()
  return hasModelInCache(modelId)
}

export const hasWebGPU = () => typeof navigator !== 'undefined' && 'gpu' in navigator
