'use client'
import React, { useEffect, useLayoutEffect, useState } from 'react'
import * as webllm from "@mlc-ai/web-llm";
import useChatStore from '@/store/chat';
import { getLocalStorage } from '@/utils/custom-storage';

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
  const [availableModels, setAvailableModels] = useState([])
  const [hfModels, setHfModels] = useState([])
  const [isLoadingHf, setIsLoadingHf] = useState(false)

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
        hfModels={hfModels}
        setHfModels={setHfModels}
        isLoadingHf={isLoadingHf}
        setIsLoadingHf={setIsLoadingHf}
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
  hfModels,
  setHfModels,
  isLoadingHf,
  setIsLoadingHf,
  selectedModel,
  onModelSelect,
  isStreaming
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showAllModels, setShowAllModels] = useState(false)
  const [showFavorites, setShowFavorites] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [modelSource, setModelSource] = useState('local') // 'local' or 'huggingface'
  const [favorites, setFavorites] = useState(() => {
    const saved = getLocalStorage('modelFavorites')
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    localStorage.setItem('modelFavorites', JSON.stringify(favorites))
  }, [favorites])

  const searchHuggingFaceModels = async (query) => {
    if (!query) {
      setHfModels([])
      return
    }

    setIsLoadingHf(true)
    try {
      const response = await fetch(`https://huggingface.co/api/models?search=${query}&filter=text-generation`)
      const data = await response.json()

      // Convertir los resultados de HF al formato esperado
      const formattedModels = data.map(model => ({
        model_id: model.modelId,
        source: 'huggingface',
        downloads: model.downloads,
        likes: model.likes,
        isHf: true
      }))

      setHfModels(formattedModels)
    } catch (error) {
      console.error('Error fetching HF models:', error)
    } finally {
      setIsLoadingHf(false)
    }
  }

  useEffect(() => {
    if (modelSource === 'huggingface') {
      const delayDebounce = setTimeout(() => {
        searchHuggingFaceModels(searchQuery)
      }, 500)

      return () => clearTimeout(delayDebounce)
    }
  }, [searchQuery, modelSource])

  const toggleFavorite = (modelId) => {
    setFavorites(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId)
      } else {
        return [...prev, modelId]
      }
    })
  }

  const models = modelSource === 'local'
    ? (showAllModels ? allModels : availableModels)
    : hfModels

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
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <select
                    value={modelSource}
                    onChange={(e) => {
                      setModelSource(e.target.value)
                      setSearchQuery('')
                      setHfModels([])
                    }}
                    className="bg-neutral-700 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="local">Local Models</option>
                    <option value="huggingface">HuggingFace Models</option>
                  </select>

                  {modelSource === 'local' && (
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
                  )}

                  <button
                    className='text-xl flex items-center justify-center p-1 rounded-lg'
                    onClick={() => setShowFavorites(!showFavorites)}
                  >
                    <ion-icon name={showFavorites ? "heart" : "heart-outline"}></ion-icon>
                  </button>
                </div>

                <input
                  type="text"
                  placeholder={modelSource === 'local'
                    ? (!showAllModels ? "Search recommended models..." : "Search all models...")
                    : "Search HuggingFace models..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-2 bg-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {showAllModels && modelSource === 'local' && (
                <p className="text-xs text-yellow-500/70 mt-1">
                  ⚠️ Some models may not work correctly on your device
                </p>
              )}
            </div>

            <ul className="max-h-72 overflow-auto overflow-x-hidden">
              {isLoadingHf ? (
                <li className="p-3 text-neutral-400 text-sm text-center">
                  Loading HuggingFace models...
                </li>
              ) : filteredModels.map((model) => {
                const { model_id, vram_required_MB, isHf, downloads, likes } = model
                const isCompatible = modelSource === 'huggingface' || availableModels.some(m => m.model_id === model_id)
                const isFavorite = favorites.includes(model_id)

                return (
                  <li
                    key={model_id}
                    className={`p-2 hover:bg-neutral-700 flex items-center justify-between group
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
                          {!isCompatible && (
                            <div className="flex items-center gap-1" title="Este modelo puede no funcionar correctamente">
                              <ion-icon name="warning" class="text-yellow-500"></ion-icon>
                            </div>
                          )}
                          <span className='truncate'>{model_id}</span>
                        </div>
                        <div>
                          {isHf ? (
                            <div className="text-neutral-400 text-[0.75rem] flex items-center gap-2">
                              <div className='flex items-center gap-1'><ion-icon name="cloud-download" /> <span>{downloads?.toLocaleString()}</span></div>
                              <div><ion-icon name="thumbs-up"/> {likes?.toLocaleString()}</div>
                            </div>
                          ) : (
                            <small className="text-neutral-400 text-[0.75rem] uppercase">
                              {vram_required_MB && `gpu ${(vram_required_MB / 1024).toFixed(2)} gb`}
                            </small>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleFavorite(model_id)}
                      className={`ml-2 p-1 text-xl ${!isFavorite ? 'invisible group-hover:visible' : ''}`}
                    >
                      <ion-icon name={isFavorite ? "heart" : "heart-outline"}></ion-icon>
                    </button>
                  </li>
                )
              })}
              {!isLoadingHf && filteredModels.length === 0 && (
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