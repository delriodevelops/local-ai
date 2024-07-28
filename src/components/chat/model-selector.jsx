'use client'
import React, { useEffect, useRef, useState } from 'react'
import * as webllm from "@mlc-ai/web-llm";
import useChatStore from '@/store/chat';

const availableModels = webllm.prebuiltAppConfig.model_list.filter(el => el.low_resource_required && !el?.required_features?.length).sort((a, b) => a.vram_required_MB - b.vram_required_MB)
// const availableModels = webllm.prebuiltAppConfig.model_list
console.log('availableModels', availableModels)

const ModelSelector = () => {

  const { setEngine, progress } = useChatStore(s => s)
  const [selectedModel, setSelectedModel] = useState(null)

  function handleSelection(e) {
    const model = e.target.value
    setSelectedModel(model)
  }

  useEffect(() => {
    if (selectedModel) setEngine(selectedModel)
    else setSelectedModel(availableModels[0].model_id)
  }, [selectedModel])




  return (
    <div className='flex gap-2 items-center'>
      <select className='bg-neutral-700 hover:bg-neutral-600 outline-none border-none rounded-xl p-3 cursor-pointer' onChange={handleSelection}>
        {
          availableModels.map(({ model_id }, i) => (
            <option value={model_id} key={model_id}>{model_id}</option>
          ))
        }
      </select>
      {
        !!progress && (
          <small className='text-sm text-neutral-400'>
            {progress.progress !== 1 && progress.text}
          </small>
        )
      }
    </div>
  )
}

export default ModelSelector