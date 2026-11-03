// Lo que la landing sabe de la máquina del visitante, sin pedir permiso ni enviar nada a ningún sitio:
// la gráfica que da WebGPU (fabricante y arquitectura, como la lee la app en src/engine/device.ts) y los
// núcleos del procesador. Una gráfica de reserva por software no cuenta: el modelo no correría en ella
export type Machine = { gpu: string | null; cores: number }

type Adapter = { isFallbackAdapter?: boolean; info?: { vendor?: string; architecture?: string; isFallbackAdapter?: boolean } }

let reading: Promise<Machine> | null = null

export function readMachine(): Promise<Machine> {
  reading ??= (async () => {
    const cores = navigator.hardwareConcurrency || 0
    try {
      const gpu = (navigator as Navigator & { gpu?: { requestAdapter(options?: object): Promise<Adapter | null> } }).gpu
      const adapter = await gpu?.requestAdapter({ powerPreference: 'high-performance' })
      if (!adapter || adapter.isFallbackAdapter || adapter.info?.isFallbackAdapter) return { gpu: null, cores }
      const name = [adapter.info?.vendor, adapter.info?.architecture].filter(Boolean).join(' ').trim()
      return { gpu: name || 'WebGPU graphics card', cores }
    } catch {
      return { gpu: null, cores }
    }
  })()
  return reading
}
