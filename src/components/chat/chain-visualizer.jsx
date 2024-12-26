import useChatStore from '@/store/chat'
import React, { useState } from 'react'

const ChainVisualizer = () => {
  const { chain, setChain, activeChainIndex, isStreaming } = useChatStore();
  const [isDragging, setIsDragging] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handleDragStart = (e, index, assistant) => {
    if (isStreaming) return;
    setDraggedId(assistant.id);
    
    try {
      const dragPreview = document.createElement('div');
      dragPreview.innerHTML = `
        <div class="flex items-center gap-3 p-4 rounded-xl bg-neutral-800 shadow-xl" style="width: ${e.target.offsetWidth}px">
          <span class="text-xl p-2 rounded-lg bg-neutral-900">
            <ion-icon name="${assistant.icon}"></ion-icon>
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
    <div className="flex gap-4 pt-4 pb-8 border-b border-neutral-700 overflow-x-auto items-start px-4">
      {chain.map((assistant, index) => (
        <div
          key={assistant.id}
          draggable={!isStreaming}
          onDragStart={(e) => handleDragStart(e, index, assistant)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          className={`
            flex items-center gap-3 p-4 rounded-xl
            transition-all duration-300 ease-out
            select-none backdrop-blur-sm
            transform-gpu will-change-transform
            ${isStreaming 
              ? 'cursor-not-allowed opacity-80' 
              : isDragging 
                ? 'cursor-grabbing' 
                : 'cursor-grab hover:cursor-grab active:cursor-grabbing'
            }
            ${draggedId === assistant.id ? 'opacity-50 scale-95' : 'opacity-100'}
            ${isDragging && dragOverIndex === index 
              ? 'translate-x-4 bg-neutral-600/50 scale-105 border-2 border-neutral-500/50' 
              : ''
            }
            ${isDragging && dragOverIndex !== null && index > dragOverIndex 
              ? '-translate-x-4 rotate-1' 
              : ''
            }
            ${isDragging && dragOverIndex !== null && index < dragOverIndex 
              ? 'translate-x-4 -rotate-1' 
              : ''
            }
            ${isStreaming && activeChainIndex === index
              ? 'bg-lime-600/90 shadow-xl shadow-lime-500/30 text-white font-semibold'
              : 'bg-neutral-800/90 shadow-md hover:shadow-neutral-900/20 hover:bg-neutral-700/80 hover:scale-105'
            }
          `}
        >
          <span className="text-xl">
            <ion-icon name={assistant.icon}></ion-icon>
          </span>
          <span className="font-medium">{assistant.name}</span>
        </div>
      ))}
    </div>
  );
};

export default ChainVisualizer;