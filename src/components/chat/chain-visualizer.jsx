import React, { useState } from 'react'
import useChatStore from '@/store/chat'

const ChainVisualizer = () => {
  const { chain, setChain, activeChainIndex, isStreaming } = useChatStore();
  const [isDragging, setIsDraggin] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const moveItem = (fromIndex, toIndex) => {
    if (isStreaming) return;
    const newChain = [...chain];
    const [movedItem] = newChain.splice(fromIndex, 1);
    newChain.splice(toIndex, 0, movedItem);
    setChain(newChain);
  };

  const handleDragStart = (e, index, assistant) => {
    if (isStreaming) return;
    setDraggedId(assistant.id);

    try {
      const dragPreview = document.createElement('div');
      dragPreview.innerHTML = `
        <div class="flex items-center gap-3 p-4 rounded-xl bg-neutral-800 shadow-xl" style="width: ${e.target.offsetWidth}px">
          <span class="text-xl">
            <ion-icon name="${assistant?.icon?.icon}"></ion-icon>
          </span>
          <span class="font-medium">${assistant.name}</span>
        </div>
      `;

      dragPreview.style.cssText = `
        position: fixed;
        top: -1000px;
        transform: rotate(3deg) scale(1.05);
        pointer-events: none;
        z-index: 100;
      `;

      document.body.appendChild(dragPreview);

      const rect = e.target.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;

      e.dataTransfer.setDragImage(dragPreview.firstElementChild, offsetX, offsetY);
      setTimeout(() => document.body.removeChild(dragPreview), 0);

      e.dataTransfer.setData('text/plain', index.toString());
      setIsDragging(true);
    } catch (error) {
      console.error('Error in drag start:', error);
    }
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(index);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
      if (dragIndex === dropIndex || isNaN(dragIndex)) return;

      const newChain = [...chain];
      const [draggedItem] = newChain.splice(dragIndex, 1);
      newChain.splice(dropIndex, 0, draggedItem);
      setChain(newChain);
    } catch (error) {
      console.error('Error in drop:', error);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedId(null);
    setDragOverIndex(null);
  };

  return (
    <>
      {/* Desktop Version - Horizontal Scroll */}
      <div className="hidden md:block w-full">
        <div className="overflow-x-auto">
          <div className="flex gap-4 pb-2">
            {chain.map((assistant, index) => (
              <div
                key={assistant.id}
                draggable={!isStreaming}
                onDragStart={(e) => handleDragStart(e, index, assistant)}
                className="flex-shrink-0 cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-800">
                  <span className="text-xl">
                    <ion-icon name={assistant?.icon?.icon}></ion-icon>
                  </span>
                  <span className="font-medium whitespace-nowrap">{assistant.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Version - Modal */}
      <div className="md:hidden">
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 p-3 rounded-lg bg-neutral-800 hover:bg-neutral-700"
        >
          <ion-icon name="git-branch-outline"></ion-icon>
          <span>Manage Chain ({chain.length})</span>
        </button>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-neutral-900 rounded-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
              <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
                <h3 className="text-lg font-medium">Chain Order</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-lg hover:bg-neutral-800"
                >
                  <ion-icon name="close-outline"></ion-icon>
                </button>
              </div>
              <div className="p-4 space-y-2">
                {chain.map((assistant, index) => (
                  <div
                    key={assistant.id}
                    className="flex items-center justify-between p-4 bg-neutral-800 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">
                        <ion-icon name={assistant?.icon?.icon}></ion-icon>
                      </span>
                      <span className="font-medium">{assistant.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => index > 0 && moveItem(index, index - 1)}
                        disabled={index === 0 || isStreaming}
                        className="p-2 rounded-lg hover:bg-neutral-700 disabled:opacity-50"
                      >
                        <ion-icon name="chevron-up-outline"></ion-icon>
                      </button>
                      <button
                        onClick={() => index < chain.length - 1 && moveItem(index, index + 1)}
                        disabled={index === chain.length - 1 || isStreaming}
                        className="p-2 rounded-lg hover:bg-neutral-700 disabled:opacity-50"
                      >
                        <ion-icon name="chevron-down-outline"></ion-icon>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ChainVisualizer;