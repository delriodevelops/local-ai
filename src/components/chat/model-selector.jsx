'use client'
import React, { useEffect, useLayoutEffect, useState } from 'react'
import * as webllm from "@mlc-ai/web-llm";
import useChatStore from '@/store/chat';

// Función para obtener información de la GPU
function getGPUInfo() {
  const canvas = document.createElement('canvas');

  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return 'No WebGL support';

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  if (debugInfo) return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

  return 'Unknown GPU';
}

// Filtrar modelos disponibles según las especificaciones del usuario
function filterModels(userSpecs, models) {
  return models.filter(model => {
    const hasEnoughCPU = userSpecs.cpu >= (model.cpu_required || 4); // Valor por defecto
    const hasEnoughRAM = userSpecs.ram >= (model.ram_required || 8); // Valor por defecto
    const hasGPU = model.vram_required_MB ? userSpecs.gpu !== 'No WebGL support' : true;
    const requiredFeatures = !!model.required_features
    return hasEnoughCPU && hasEnoughRAM && hasGPU && !requiredFeatures;
  })
    .sort((a, b) => a.vram_required_MB - b.vram_required_MB);
}

const ModelSelector = () => {

  const { isStreaming } = useChatStore(s => s)


  const { setEngine, progress } = useChatStore(s => s)
  const [selectedModel, setSelectedModel] = useState(undefined)
  const [availableModels, setAvailableModels] = useState([]);

  useLayoutEffect(() => {
    // Obtener las especificaciones del hardware del usuario
    const userSpecs = {
      cpu: navigator.hardwareConcurrency,
      ram: navigator.deviceMemory || 4, // 4 GB por defecto si no está disponible
      gpu: getGPUInfo()
    };

    const allModels = webllm.prebuiltAppConfig.model_list;
    const filteredModels = filterModels(userSpecs, allModels);

    setAvailableModels(filteredModels);

    // Seleccionar el primer modelo por defecto
    if (filteredModels.length > 0) setSelectedModel('TinyLlama-1.1B-Chat-v0.4-q4f32_1-MLC-1k');
  }, []);

  function handleSelection(e) {
    const model = e.target.value;
    setSelectedModel(model);
  }

  useEffect(() => {
    if (selectedModel) setEngine(selectedModel);
  }, [selectedModel]);

  return (
    <div className='flex gap-2 items-center'>
      <select disabled={!!isStreaming} className='disabled:cursor-not-allowed bg-neutral-700 hover:bg-neutral-600 outline-none border-none rounded-xl p-3 cursor-pointer' onChange={handleSelection} value={selectedModel}>
        {
          !!availableModels?.length && availableModels.map(({ model_id, ...el }) => (
            <option value={model_id} key={model_id}>{model_id}</option>
          ))
        }
      </select>
      {!!progress && (
        <small className='text-sm text-neutral-400'>
          {progress.progress !== 1 && progress.text}
        </small>
      )}
    </div>
  )
}

export default ModelSelector;
