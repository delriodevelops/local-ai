// Los modelos locales que se pueden elegir para cada tarea, del más nuevo y listo al más modesto.
// Solo datos: lo leen el worker (qué cargar) y la página (qué cabe en este equipo)
export type LocalModel = {
  id: string
  name: string
  repo: string
  released: string
  // Descarga con la gráfica en fp16
  sizeGB: number
  // Sin shader-f16 no cabe: en fp32 ocuparía el doble
  fp16Only?: boolean
}

export type LocalTask = 'transcribe' | 'describe' | 'imagine'

// FLUX.2 klein no va en el worker de imagen y audio sino en los suyos (flux.ts)
export const FLUX = 'flux2-klein-4b'

export const LOCAL_MODELS: Record<LocalTask, LocalModel[]> = {
  transcribe: [
    { id: 'whisper-large-v3-turbo', name: 'Whisper large-v3 turbo', repo: 'onnx-community/whisper-large-v3-turbo', released: '2024-10', sizeGB: 1.6, fp16Only: true },
    { id: 'whisper-base', name: 'Whisper base', repo: 'onnx-community/whisper-base', released: '2022-09', sizeGB: 0.3 },
  ],
  describe: [
    { id: 'lfm3-vl-2b', name: 'LFM3-VL 2B', repo: 'onnx-community/LFM3-VL-2B-ONNX', released: '2026-10', sizeGB: 1.9, fp16Only: true },
    { id: 'lfm2.5-vl-450m', name: 'LFM2.5-VL 450M', repo: 'onnx-community/LFM2.5-VL-450M-ONNX', released: '2026-04', sizeGB: 0.5 },
  ],
  imagine: [
    { id: FLUX, name: 'FLUX.2 klein 4B', repo: 'cgb/flux2-klein-4b-onnx-webgpu', released: '2026-01', sizeGB: 6.5, fp16Only: true },
    { id: 'janus-pro-1b', name: 'Janus-Pro 1B', repo: 'onnx-community/Janus-Pro-1B-ONNX', released: '2025-01', sizeGB: 2.4 },
  ],
}

// El que se pidió o, si ya no existe (una elección guardada de otra versión), el más modesto
export const findLocal = (task: LocalTask, id?: string) => LOCAL_MODELS[task].find(m => m.id === id) ?? LOCAL_MODELS[task].at(-1)!
