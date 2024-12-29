'use client'
import React, { useEffect, useLayoutEffect, useState } from 'react'
import * as webllm from "@mlc-ai/web-llm";
import useChatStore from '@/store/chat';

function getGPUInfo() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return 'No WebGL support';
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  if (debugInfo) return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
  return 'Unknown GPU';
}

function filterModels(userSpecs, models) {
  return models.filter(model => {
    const hasEnoughCPU = userSpecs.cpu >= (model.cpu_required || 4);
    const hasEnoughRAM = userSpecs.ram >= (model.ram_required || 8);
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
    const userSpecs = {
      cpu: navigator.hardwareConcurrency,
      ram: navigator.deviceMemory || 4,
      gpu: getGPUInfo()
    };

    const allModels = webllm.prebuiltAppConfig.model_list;
    const filteredModels = filterModels(userSpecs, allModels);

    setAvailableModels(filteredModels);
    if (filteredModels.length > 0) setSelectedModel('snowflake-arctic-embed-s-q0f32-MLC-b4');
  }, []);

  useEffect(() => {
    if (selectedModel) setEngine(selectedModel);
  }, [selectedModel]);

  return (
    <div className='flex flex-col gap-2 items-center pt-2'>
      <CustomModelSelector
        availableModels={availableModels}
        allModels={webllm.prebuiltAppConfig.model_list}
        selectedModel={selectedModel}
        onModelSelect={setSelectedModel}
        isStreaming={isStreaming}
      />
      {!!progress && (
        <small className='text-[0.75em] text-neutral-400'>
          {progress.progress !== 1 && progress.text}
        </small>
      )}
    </div>
  )
}

const CustomModelSelector = ({
  availableModels,
  allModels,
  selectedModel,
  onModelSelect,
  isStreaming
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showAllModels, setShowAllModels] = useState(false)
  const [showFavorites, setShowFavorites] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('modelFavorites')
    return saved ? JSON.parse(saved) : []
  })

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('modelFavorites', JSON.stringify(favorites))
  }, [favorites])

  const toggleFavorite = (modelId) => {
    setFavorites(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId)
      } else {
        return [...prev, modelId]
      }
    })
  }

  const models = showAllModels ? allModels : availableModels
  const filteredModels = models.filter(model => {
    const matchesSearch = model.model_id.toLowerCase().includes(searchQuery.toLowerCase())
    if (showFavorites) {
      return matchesSearch && favorites.includes(model.model_id)
    }
    return matchesSearch
  })

  return (
    <div className="flex gap-2 w-full">
      <div className="relative">
        <button
          onClick={() => !isStreaming && setIsOpen(!isOpen)}
          disabled={isStreaming}
          className="w-96 flex items-center justify-between p-3 bg-neutral-700 hover:bg-neutral-600 disabled:cursor-not-allowed disabled:opacity-50 rounded-xl"
          title={selectedModel || "Selecciona un modelo"}
        >
          <span className='truncate'>{selectedModel || "Selecciona un modelo"}</span>
          <ion-icon name="chevron-down" className="text-neutral-400"></ion-icon>
        </button>

        {isOpen && (
          <div className="absolute z-10 w-96 mt-1 bg-neutral-800 rounded-xl shadow-lg">
            <div className="p-2 border-b border-neutral-700">
              <div>
                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={showAllModels}
                      onChange={() => setShowAllModels(!showAllModels)}
                      disabled={isStreaming}
                    />
                    <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                  <button
                    className='text-xl flex items-center justify-center p-1 rounded-lg'
                    onClick={() => setShowFavorites(!showFavorites)}
                  >
                    <ion-icon name={showFavorites ? "heart" : "heart-outline"}></ion-icon>
                  </button>
                  <input
                    type="text"
                    placeholder={!showAllModels ? "Search recomended models..." : "Search all models..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full p-2 bg-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              {showAllModels && (
                <p className="text-xs text-yellow-500/70 mt-1">
                  ⚠️ Some models may not work correctly on your device
                </p>
              )}
            </div>

            <ul className="max-h-72 overflow-auto overflow-x-hidden">
              {
                filteredModels.map(({ model_id, vram_required_MB }) => {
                  const isCompatible = availableModels.some(m => m.model_id === model_id)
                  const isFavorite = favorites.includes(model_id)

                  return (
                    <li
                      key={model_id}
                      className={`p-2 hover:bg-neutral-700 flex items-center justify-between
                      ${selectedModel === model_id ? 'bg-neutral-600' : ''}`}
                    >
                      <div
                        className='flex-1 cursor-pointer'
                        onClick={() => {
                          onModelSelect(model_id)
                          setIsOpen(false)
                          setSearchQuery('')
                        }}
                      >
                        <div className='flex flex-col'>
                          <div className="flex items-center gap-1">
                            {
                              !isCompatible && (
                                <div className="flex items-center gap-1" title="Este modelo puede no funcionar correctamente">
                                  <ion-icon name="warning" class="text-yellow-500"></ion-icon>
                                </div>
                              )
                            }
                            <span className='truncate'>{model_id}</span>
                          </div>
                          <div className='-mt-1'>
                            <small className="text-neutral-400 text-[0.75rem] uppercase">
                              {vram_required_MB && `gpu ${(vram_required_MB / 1024).toFixed(2)} gb`}
                            </small>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleFavorite(model_id)}
                        className={`ml-2 p-1 text-xl `}
                      >
                        <ion-icon name={isFavorite ? "heart" : "heart-outline"}></ion-icon>
                      </button>
                    </li>
                  )
                })}
              {filteredModels.length === 0 && (
                <li className="p-3 text-neutral-400 text-sm text-center">
                  No models found...
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default ModelSelector;