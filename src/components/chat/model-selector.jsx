'use client'
import React, { useEffect, useLayoutEffect, useState, useRef } from 'react'
import * as webllm from "@mlc-ai/web-llm"
import useChatStore from '@/store/chat'
import { getLocalStorage, setLocalStorage } from '@/utils/custom-storage'

function getGPUInfo() {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
  if (!gl) return 'No WebGL support'
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
  if (debugInfo) return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
  return 'Unknown GPU'
}

function filterModels(userSpecs, models) {
  return models.filter(model => {
    const hasEnoughCPU = userSpecs.cpu >= (model.cpu_required || 4)
    const hasEnoughRAM = userSpecs.ram >= (model.ram_required || 8)
    const hasGPU = model.vram_required_MB ? userSpecs.gpu !== 'No WebGL support' : true
    const requiredFeatures = !!model.required_features
    return hasEnoughCPU && hasEnoughRAM && hasGPU && !requiredFeatures
  }).sort((a, b) => a.vram_required_MB - b.vram_required_MB)
}

const ModelSelector = () => {
  const { isStreaming } = useChatStore(s => s)
  const { setEngine, progress, setModelSource, modelSource, apiKeys, setApiKeys } = useChatStore(s => s)
  const [selectedModel, setSelectedModel] = useState(undefined)
  const [availableModels, setAvailableModels] = useState([])
  const [hfModels, setHfModels] = useState([])
  const [isLoadingHf, setIsLoadingHf] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showModelModal, setShowModelModal] = useState(false)
  const [modalMessage, setModalMessage] = useState('')
  const [modalAction, setModalAction] = useState('')

  useLayoutEffect(() => {
    const userSpecs = {
      cpu: navigator.hardwareConcurrency,
      ram: navigator.deviceMemory || 4,
      gpu: getGPUInfo()
    }

    const allModels = webllm.prebuiltAppConfig.model_list
    const filteredModels = filterModels(userSpecs, allModels)

    setAvailableModels(filteredModels)
    if (filteredModels.length > 0) setSelectedModel('snowflake-arctic-embed-s-q0f32-MLC-b4')
  }, [])

  useEffect(() => {
    if (selectedModel) setEngine(selectedModel, !['local', "huggingface"].includes(modelSource))
  }, [selectedModel])

  const handleApiKeySubmit = (key) => {
    setApiKeys(prev => {
      const newKeys = { ...prev, [modalMessage.toLowerCase()]: key }
      setLocalStorage(`${modalMessage.toLowerCase()}ApiKey`, key)
      return newKeys
    })
    setShowModal(false)
  }

  return (
    <div className="flex flex-col pt-2">
      <button
        onClick={() => setShowModelModal(true)}
        disabled={isStreaming}
        className="hidden md:flex w-full md:w-96 items-center justify-between p-3 bg-neutral-700 hover:bg-neutral-600 disabled:cursor-not-allowed disabled:opacity-50 rounded-xl"
        title={selectedModel || "Selecciona un modelo"}

      >
        <span className="truncate">{selectedModel || "Selecciona un modelo"}</span>
        <ion-icon name="chevron-down" class="text-neutral-400"></ion-icon>
      </button>

      <button
        onClick={() => setShowModelModal(true)}
        disabled={isStreaming}
        className='absolute top-3 right-3 z-50 md:hidden bg-neutral-800 p-3 flex rounded-xl items-center aspect-square disabled:cursor-not-allowed disabled:opacity-50'
      >
        <ion-icon name="server-outline" />
      </button>

      {!!progress && (
        <small className="text-[0.75em] text-neutral-400">
          {progress.progress !== 1 && progress.text}
        </small>
      )}

      {showModelModal && (
        <div className="fixed inset-0 z-50 md:relative md:inset-auto">
          <div className="fixed inset-0 bg-black/50 md:hidden" onClick={() => setShowModelModal(false)} />
          <div className="fixed inset-x-0 bottom-0 md:absolute md:inset-auto md:w-96 md:mt-1">
            <CustomModelSelector
              availableModels={availableModels}
              allModels={webllm.prebuiltAppConfig.model_list}
              hfModels={hfModels}
              setHfModels={setHfModels}
              isLoadingHf={isLoadingHf}
              setIsLoadingHf={setIsLoadingHf}
              selectedModel={selectedModel}
              onModelSelect={(model) => {
                setSelectedModel(model)
                setShowModelModal(false)
              }}
              isStreaming={isStreaming}
              setShowModal={setShowModal}
              setModalMessage={setModalMessage}
              setModalAction={setModalAction}
              apiKeys={apiKeys}
              onClose={() => setShowModelModal(false)}
            />
          </div>
        </div>
      )}

      {showModal && (
        <Modal
          message={modalMessage}
          action={modalAction}
          onClose={() => setShowModal(false)}
          onSubmit={handleApiKeySubmit}
          currentApiKey={apiKeys[modalMessage.toLowerCase()]}
        />
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
  isStreaming,
  setShowModal,
  setModalMessage,
  setModalAction,
  apiKeys,
  onClose
}) => {
  const [showAllModels, setShowAllModels] = useState(false)
  const [showFavorites, setShowFavorites] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { setModelSource, modelSource } = useChatStore(s => s)
  const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false)
  const [favorites, setFavorites] = useState(() => {
    const saved = getLocalStorage('modelFavorites')
    return saved ? JSON.parse(saved) : []
  })
  const dropdownRef = useRef(null)

  useEffect(() => {
    setLocalStorage('modelFavorites', JSON.stringify(favorites))
  }, [favorites])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsSourceDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleChangeApiKey = () => {
    setModalMessage(modelSource.toUpperCase())
    setModalAction('change')
    setShowModal(true)
  }

  const searchHuggingFaceModels = async (query) => {
    if (!query) {
      setHfModels([])
      return
    }

    setIsLoadingHf(true)
    try {
      const response = await fetch(`https://huggingface.co/api/models?search=${query}&filter=text-generation`)
      const data = await response.json()

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

  const getModelsBySource = () => {
    switch (modelSource) {
      case 'local':
        return showAllModels ? allModels : availableModels
      case 'huggingface':
        return hfModels
      case 'openai':
        return [
          "gpt-3.5-turbo",
          "gpt-4",
          "gpt-4-turbo",
          "gpt-4o-mini",
          "gpt-4o",
          "o1-preview",
          "o1-mini",
        ].map(el => ({ model_id: el, source: "openai", icon: "openai" }))
      case 'gemini':
        return [
          { model_id: 'gemini-1', source: 'gemini', icon: 'gemini' },
        ]
      case 'anthropic':
        return [
          { model_id: 'claude-instant', source: 'anthropic', icon: 'anthropic' },
        ]
      default:
        return []
    }
  }

  const sourceOptions = [
    { value: 'local', label: 'Local', icon: 'desktop-outline' },
    { value: 'huggingface', label: 'HuggingFace', icon: 'cloud-outline' },
    { value: 'openai', label: 'OpenAI', icon: 'aperture' },
    { value: 'gemini', label: 'Gemini', icon: 'logo-google' },
    { value: 'anthropic', label: 'anthropic', icon: 'logo-electron' },
  ]

  const models = getModelsBySource()

  const filteredModels = models.filter(model => {
    const matchesSearch = model.model_id.toLowerCase().includes(searchQuery.toLowerCase())
    if (showFavorites) {
      return matchesSearch && favorites.includes(model.model_id)
    }
    return matchesSearch
  })

  return (
    <div className="w-full bg-neutral-800 rounded-t-xl md:rounded-xl shadow-lg max-h-[90vh] md:max-h-[32rem] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-neutral-700 md:hidden">
        <h2 className="text-lg font-semibold">Select Model</h2>
        <button onClick={onClose} className="p-2">
          <ion-icon name="close-outline" class="text-2xl"></ion-icon>
        </button>
      </div>

      <div className="p-2 border-b border-neutral-700">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsSourceDropdownOpen(!isSourceDropdownOpen)}
                className="bg-neutral-700 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 flex items-center justify-between w-48"
              >
                <span className="flex items-center gap-2">
                  <ion-icon name={sourceOptions.find(option => option.value === modelSource).icon}></ion-icon>
                  {sourceOptions.find(option => option.value === modelSource).label}
                </span>
                <ion-icon name="chevron-down-outline"></ion-icon>
              </button>

              {isSourceDropdownOpen && (
                <div className="absolute z-20 w-full mt-1 bg-neutral-800 rounded-lg shadow-lg">
                  {sourceOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setModelSource(option.value)
                        setIsSourceDropdownOpen(false)
                        setSearchQuery('')
                        if (['huggingface', 'local'].includes(option.value)) {
                          setHfModels([])
                        }
                        if (['openai', 'gemini', 'anthropic'].includes(option.value) && !apiKeys[option.value]) {
                          setModalMessage(option.value.toUpperCase())
                          setModalAction('add')
                          setShowModal(true)
                        }
                      }}
                      className="w-full p-2 text-left hover:bg-neutral-700 flex items-center gap-2"
                    >
                      <ion-icon name={option.icon}></ion-icon>
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {(modelSource === 'local' || modelSource === 'huggingface') && (
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
              className="text-xl flex items-center justify-center p-1 rounded-lg"
              onClick={() => setShowFavorites(!showFavorites)}
            >
              <ion-icon name={showFavorites ? "heart" : "heart-outline"}></ion-icon>
            </button>

            {['openai', 'gemini', 'anthropic'].includes(modelSource) && apiKeys[modelSource] && (
              <button
                onClick={handleChangeApiKey}
                className="bg-neutral-700 hover:bg-neutral-600 rounded-lg p-2 text flex items-center focus:outline-none focus:ring-2 focus:ring-blue-600"
                title="Cambiar API Key"
              >
                <ion-icon name="key"></ion-icon>
              </button>
            )}
          </div>

          <input
            type="text"
            placeholder={
              modelSource === 'local'
                ? (!showAllModels ? "Buscar modelos recomendados..." : "Buscar todos los modelos...")
                : modelSource === 'huggingface'
                  ? "Buscar modelos de HuggingFace..."
                  : `Buscar modelos de ${modelSource.charAt(0).toUpperCase() + modelSource.slice(1)}...`
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 bg-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      <ul className="flex-1 overflow-auto">
        {isLoadingHf ? (
          <li className="p-3 text-neutral-400 text-sm text-center">
            Cargando modelos de HuggingFace...
          </li>
        ) : filteredModels.map((model) => {
          const { model_id, vram_required_MB, isHf, downloads, likes, icon } = model
          const isCompatible = modelSource === 'huggingface' || availableModels.some(m => m.model_id === model_id)
          const isFavorite = favorites.includes(model_id)

          return (
            <li
              key={model_id}
              className={`p-2 hover:bg-neutral-700 flex items-center justify-between group
              ${selectedModel === model_id ? 'bg-neutral-600' : ''}`}
            >
              <div
                className="flex-1 cursor-pointer"
                onClick={() => {
                  onModelSelect(model_id)
                  setSearchQuery('')
                }}
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    {icon && (
                      <img src={`/icons/${icon}.svg`} alt={icon} className="w-4 h-4" />
                    )}
                    <span className="truncate">{model_id}</span>
                  </div>
                  <div>
                    {isHf ? (
                      <div className="text-neutral-400 text-[0.75rem] flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <ion-icon name="cloud-download" />
                          <span>{downloads?.toLocaleString()}</span>
                        </div>
                        <div>
                          <ion-icon name="thumbs-up" /> {likes?.toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      <small className="text-neutral-400 text-[0.75rem] uppercase">
                        {vram_required_MB && `GPU ${(vram_required_MB / 1024).toFixed(2)} GB`}
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
            No se encontraron modelos...
          </li>
        )}
      </ul>
    </div>
  )
}

const Modal = ({ message, action, onClose, onSubmit, currentApiKey }) => {
  const [apiKey, setApiKey] = useState(currentApiKey || '')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(apiKey)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-neutral-800 p-6 rounded-xl shadow-lg max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">
          {action === 'add' ? 'Ingresa tu API Key' : 'Cambia tu API Key'}
        </h2>
        <form onSubmit={handleSubmit}>
          <p className="mb-4">
            {action === 'add'
              ? `Por favor, ingresa tu API Key para ${message}:`
              : `Ingresa la nueva API Key para ${message}:`
            }
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full p-2 mb-4 bg-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            placeholder="Ingresa tu API key"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-neutral-700 text-white rounded hover:bg-neutral-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              {action === 'add' ? 'Guardar' : 'Actualizar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ModelSelector