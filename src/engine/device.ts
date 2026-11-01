import { create } from 'zustand'

export type DeviceProfile = {
  gpu: string
  fp16: boolean
  maxBufferGB: number
  cores: number
  // Estimación del navegador; algunos la limitan a 8 GB
  ramGB: number | null
  quotaGB: number
  usedGB: number
  // Sin aislamiento entre orígenes, WebAssembly no puede usar más de un núcleo
  isolated: boolean
}

type GPUAdapterLike = {
  info?: { vendor?: string; architecture?: string; description?: string }
  features: Set<string>
  limits: { maxBufferSize: number }
}

// Lo que el navegador deja saber del equipo, como el "¿qué modelo cabe?" de Strata
export async function readProfile(): Promise<DeviceProfile> {
  const gpu = navigator as Navigator & { gpu?: { requestAdapter(o?: object): Promise<GPUAdapterLike | null> }; deviceMemory?: number }
  const adapter = await gpu.gpu?.requestAdapter({ powerPreference: 'high-performance' })
  const info = adapter?.info
  const estimate = await navigator.storage?.estimate?.()
  const name = [info?.vendor, info?.architecture, info?.description].filter(Boolean).join(' ').trim()
  return {
    gpu: adapter ? name || 'WebGPU graphics card' : 'No WebGPU',
    fp16: !!adapter?.features.has('shader-f16'),
    maxBufferGB: (adapter?.limits.maxBufferSize ?? 0) / 1e9,
    cores: navigator.hardwareConcurrency || 1,
    ramGB: gpu.deviceMemory ?? null,
    quotaGB: (estimate?.quota ?? 0) / 1e9,
    usedGB: (estimate?.usage ?? 0) / 1e9,
    isolated: self.crossOriginIsolated,
  }
}

export const useDevice = create<{ profile: DeviceProfile | null; refresh: () => Promise<void> }>(set => ({
  profile: null,
  refresh: async () => set({ profile: await readProfile() }),
}))

export type Fit = { level: 'good' | 'tight' | 'no'; reason: string }

// Valoración aproximada: WebGPU no dice cuánta memoria tiene la gráfica, así que se estima con la RAM
export function rateModel(model: { id: string; sizeGB: number }, profile: DeviceProfile | null, cached: boolean): Fit {
  if (!profile) return { level: 'good', reason: '' }
  if (/f16/.test(model.id) && !profile.fp16) return { level: 'no', reason: 'needs fp16, not supported here' }
  const free = profile.quotaGB - profile.usedGB
  if (!cached && model.sizeGB > free) return { level: 'no', reason: `needs ${model.sizeGB.toFixed(1)} GB, ${free.toFixed(1)} GB free` }
  const ram = profile.ramGB ?? 8
  if (model.sizeGB <= ram * 0.3) return { level: 'good', reason: 'fits' }
  if (model.sizeGB <= ram * 0.6) return { level: 'tight', reason: 'may be slow' }
  return { level: 'no', reason: 'too big for this device' }
}
