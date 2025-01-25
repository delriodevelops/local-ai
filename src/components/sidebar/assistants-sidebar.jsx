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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-neutral-800 rounded-xl p-6 w-96">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{initialData.id ? 'Edit' : 'Create'} Assistant</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            <ion-icon name="close"></ion-icon>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-2">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 rounded-lg bg-neutral-700 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-2">Icon & Color</label>
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
              <label className="block text-sm mb-2">Instructions</label>
              <textarea
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                className="w-full p-2 rounded-lg bg-neutral-700 outline-none min-h-[100px]"
                required
              />
            </div>

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg">
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
      id: formData.id || Date.now().toString(),
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
    <section className='flex flex-col h-full bg-neutral-800'>
      <button
        onClick={() => {
          setEditingAssistant(null)
          setIsModalOpen(true)
        }}
        className='flex items-center gap-2 p-4 w-full rounded-xl hover:bg-neutral-600 bg-neutral-700 duration-300 ease-in-out cursor-pointer sticky top-0'
      >
        <span className='p-2 bg-neutral-500 rounded-full aspect-square flex items-center'>
          <ion-icon name='add'></ion-icon>
        </span>
        <span>Create assistant</span>
      </button>

      <div className="flex-1 overflow-y-auto overflow-x-hidden mt-2">
        <div className="flex flex-col gap-2">
          {
            assistants?.map(el => {
              const index = chain.findIndex(chel => chel.id === el.id) + 1

              return (
                <div
                  key={el.id}
                  className={`${!!index ? 'bg-lime-700' : 'hover:bg-neutral-700 md:hover:bg-neutral-700'} 
                  group relative flex items-center p-2 rounded-xl gap-2 duration-300 cursor-pointer`}
                >
                  <button
                    disabled={isStreaming}
                    className="flex-1 flex items-center gap-2"
                    onClick={() => toggleFromChain(el)}
                  >
                    <span className={`text-xl text-center h-8 w-8 p-2 
                    ${index ? "bg-neutral-900" : (el?.color?.color || "bg-neutral-900")} 
                    aspect-square rounded-full flex items-center justify-center`}
                    >
                      {index || <ion-icon name={el?.icon?.icon}></ion-icon>}
                    </span>
                    <span className='truncate'>{el.name}</span>
                  </button>

                  <div className="flex md:hidden md:group-hover:flex gap-1 touch-none">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingAssistant(el)
                        setIsModalOpen(true)
                      }}
                      className="p-2 hover:bg-neutral-600 md:hover:bg-neutral-600 rounded-full flex items-center aspect-square"
                    >
                      <ion-icon name="create-outline"></ion-icon>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(el.id)
                      }}
                      className="p-2 hover:bg-neutral-600 md:hover:bg-neutral-600 rounded-full flex items-center aspect-square text-red-500"
                    >
                      <ion-icon name="trash-outline"></ion-icon>
                    </button>
                  </div>
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