import useChatStore from '@/store/chat'
import React, { useState } from 'react'
const availableIcons = ['person', 'chatbubbles', 'heart', 'help', 'bulb', 'hammer', 'leaf', 'medkit', 'musical-notes', 'paw', 'rocket', 'rose', 'school', 'star', 'umbrella', 'wifi', "code", "brush"]

const AssistantsSidebar = () => {
  const { assistants, setSelectedAssistant, toggleFromChain, createAssistant, chain, isStreaming } = useChatStore(s => s);

  const handleAssistantClick = (assistant) => {
    setSelectedAssistant(assistant);
    toggleFromChain(assistant);
  };

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    icon: 'person',
    instructions: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const newAssistant = {
      id: Date.now().toString(),
      ...formData
    }
    createAssistant(newAssistant)
    setIsModalOpen(false)
    setFormData({ name: '', icon: 'person', instructions: '' })
  }

  return (
    <section className='w-full  bg-neutral-800 h-full overflow-y-auto'>
      <button
        onClick={() => setIsModalOpen(true)}
        className='flex items-center gap-2 p-4 w-full rounded-xl hover:bg-neutral-600 bg-neutral-700 duration-300 ease-in-out cursor-pointer sticky top-0 z-50'
      >
        <span className='p-2 bg-neutral-500 rounded-full aspect-square flex items-center'>
          <ion-icon name='add'></ion-icon>
        </span>
        <span>Create assistant</span>
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-neutral-800 rounded-xl p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Create Assistant</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
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
                  <label className="block text-sm mb-2">Icon</label>
                  <div className='flex gap-2 w-full flex-wrap'>
                    {
                      availableIcons.map((icon, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setFormData({ ...formData, icon })}
                          className={`p-4 rounded-full aspect-square flex item-center ${formData.icon === icon ? 'bg-lime-500 text-black' : 'hover:bg-neutral-600 hover:scale-105 bg-neutral-700'} duration-300 ease-in-out`}
                        >
                          <ion-icon name={icon}></ion-icon>
                        </button>
                      ))
                    }
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

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg mt-4"
                >
                  Create Assistant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div
        className="w-full h-full overflow-y-auto overflow-x-hidden flex flex-col gap-2 pt-2"
      >
        {
          assistants.map(el => {
            const index = chain.findIndex(chel => chel.id === el.id) + 1
            return (
              <button disabled={isStreaming} key={el.id} className={`${!!index ? 'bg-lime-700' : 'hover:bg-neutral-700'} disabled:cursor-not-allowed flex items-center cursor-pointer p-2 rounded-xl gap-2 relative rounded-xl duration-300 ease-in-out cursor-pointer truncate w-full`} onClick={() => handleAssistantClick(el)}>
                <span className='text-xl text-center h-8 w-8 p-2 bg-neutral-900 aspect-square rounded-full flex items-center justify-center'>
                  {
                    index || <ion-icon name={el.icon}></ion-icon>
                  }
                </span>
                <span className='truncate'>{el.name}</span>
              </button>

            )
          })
        }
      </div>
    </section>
  )
}

export default AssistantsSidebar