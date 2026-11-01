// src/components/sidebar/assistants-sidebar.jsx
import useChatStore from '@/store/chat'
import React, { useState } from 'react'
import DropdownSelector from '../dropdown-selector';

const availableIcons = ['person', 'chatbubbles', 'heart', 'help', 'bulb', 'hammer', 'leaf', 'medkit', 'musical-notes', 'paw', 'rocket', 'rose', 'school', 'star', 'umbrella', 'wifi', "code", "brush"]
const availableColors = ["red", "amber", "emerald", "lime", "blue", "indigo", "purple", "pink", "rose", "cyan", "teal", "green", "yellow", "orange"]

const AssistantForm = ({ initialData, onSubmit, onClose }) => {
  const [formData, setFormData] = useState(initialData)

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 w-[min(24rem,calc(100vw-2rem))] animate-rise">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display text-3xl">{initialData.id ? 'Edit' : 'Create'} Assistant</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            <ion-icon name="close"></ion-icon>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="label block mb-2">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 rounded-lg bg-neutral-800 border border-neutral-700 focus:border-lime-400/60 outline-none"
                required
              />
            </div>

            <div>
              <label className="label block mb-2">Icon & Color</label>
              <div className='flex gap-2 w-full flex-nowrap items-center'>
                <span className={`p-4 text-6xl rounded-full h-full aspect-square flex item-center text-black duration-300 ease-in-out ${formData.color.color}`}>
                  <ion-icon name={formData.icon.icon}></ion-icon>
                </span>
                <div className='flex flex-col gap-2 w-full'>
                  <DropdownSelector
                    onChange={(icon) => setFormData({ ...formData, icon })}
                    value={formData.icon}
                    options={availableIcons.map(option => ({ label: option, value: option, icon: option }))}
                  />
                  <DropdownSelector
                    options={availableColors.map(option => ({ label: option, value: option, color: `bg-${option}-500` }))}
                    value={formData.color}
                    onChange={(color) => setFormData({ ...formData, color })}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="label block mb-2">Instructions</label>
              <textarea
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                className="w-full p-2 rounded-lg bg-neutral-800 border border-neutral-700 focus:border-lime-400/60 outline-none min-h-[100px] text-sm"
                required
              />
            </div>

            <button type="submit" className="w-full bg-signal hover:bg-lime-200 text-neutral-950 font-medium py-2 rounded-lg">
              {initialData.id ? 'Save Changes' : 'Create Assistant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const AssistantsSidebar = () => {
  const { assistants, setAssistants, toggleFromChain, chain, isStreaming } = useChatStore(s => s)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAssistant, setEditingAssistant] = useState(null)

  const defaultAssistant = {
    name: '',
    icon: { value: 'person', label: 'person', icon: 'person' },
    instructions: '',
    color: { value: 'lime', label: 'lime', color: 'bg-lime-500' }
  }

  const handleSubmit = (formData) => {

    const newAssistant = {
      id: formData.id || crypto.randomUUID(),
      ...formData
    }

    const newAssistants = formData.id
      ? assistants.map(a => a.id === formData.id ? newAssistant : a)
      : [...assistants, newAssistant]

    setAssistants(newAssistants)
    localStorage.setItem('assistants', JSON.stringify(newAssistants))
  }

  const handleDelete = (id) => {
    const newAssistants = assistants.filter(a => a.id !== id)
    setAssistants(newAssistants)
    localStorage.setItem('assistants', JSON.stringify(newAssistants))
  }

  return (
    <section className='flex flex-col h-full overflow-hidden border-t border-neutral-800 pt-3'>
      <div className='flex items-center justify-between px-2 pb-2'>
        <h2 className="label">Assistants <span className='normal-case tracking-normal text-neutral-500'>· tap to chain</span></h2>
        <button
          onClick={() => {
            setEditingAssistant(null)
            setIsModalOpen(true)
          }}
          title="Create assistant"
          className='flex items-center gap-1 text-xs font-mono text-lime-300 hover:text-signal px-2 py-1 rounded-md hover:bg-neutral-800 duration-300 ease-snap'
        >
          <ion-icon name='add'></ion-icon> New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex flex-col gap-0.5">
          {
            assistants?.map(el => {
              const index = chain.findIndex(chel => chel.id === el.id) + 1

              return (
                <div
                  key={el.id}
                  className={`${index ? 'bg-lime-400/10 ring-1 ring-inset ring-lime-400/30' : 'hover:bg-neutral-800'} 
                  group relative flex items-center px-2 py-1.5 rounded-md gap-2 duration-300 ease-snap cursor-pointer`}
                >
                  <button
                    disabled={isStreaming}
                    className="flex-1 flex items-center gap-3 relative min-w-0 text-left"
                    onClick={() => toggleFromChain(el)}
                  >
                    <span className={`text-sm shrink-0 h-7 w-7 rounded-md flex items-center justify-center font-mono 
                    ${index ? "bg-signal text-neutral-950 font-medium" : `${el?.color?.color || "bg-neutral-700"} text-neutral-950`}`}
                    >
                      {index ? String(index).padStart(2, '0') : <ion-icon name={el?.icon?.icon}></ion-icon>}
                    </span>
                    <span className={`truncate text-sm ${index ? 'text-neutral-50' : 'text-neutral-300'}`}>{el.name}</span>
                    <div className="flex absolute lg:invisible lg:group-hover:visible right-0 gap-0.5 touch-none bg-neutral-800 rounded-md">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAssistant(el)
                          setIsModalOpen(true)
                        }}
                        title="Edit"
                        className="p-1.5 hover:bg-neutral-700 rounded-md flex items-center text-neutral-300"
                      >
                        <ion-icon name="create-outline"></ion-icon>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(el.id)
                        }}
                        title="Delete"
                        className="p-1.5 hover:bg-neutral-700 rounded-md flex items-center text-red-400"
                      >
                        <ion-icon name="trash-outline"></ion-icon>
                      </button>
                    </div>
                  </button>
                </div>
              )
            })
          }
        </div>
      </div>

      {isModalOpen && (
        <AssistantForm
          initialData={editingAssistant || defaultAssistant}
          onSubmit={handleSubmit}
          onClose={() => {
            setIsModalOpen(false)
            setEditingAssistant(null)
          }}
        />
      )}
    </section>
  )
}

export default AssistantsSidebar