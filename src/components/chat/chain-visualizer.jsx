import React, { useEffect, useState } from 'react';
import useChatStore from '@/store/chat';
import { motion, AnimatePresence } from 'framer-motion';
import ChainFlow from './chain-flow';

const ChainVisualizer = () => {
  const { chain, isStreaming, activeChainIndex } = useChatStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Al lanzar una cadena se abre el esquema, para ver por qué paso va
  useEffect(() => {
    if (isStreaming && chain.length > 1) setIsPanelOpen(true);
  }, [isStreaming]);

  const runningName = isStreaming && chain.length ? chain[activeChainIndex]?.name : null;

  return (
    <>
      {/* Desktop Version */}
      <div className="hidden lg:flex flex-1 min-w-0 items-center">
        <button
          type="button"
          onClick={() => setIsPanelOpen(o => !o)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border duration-300 ease-snap ${isPanelOpen ? 'border-lime-400/50 bg-neutral-800' : 'border-neutral-700 bg-neutral-900 hover:border-neutral-500'}`}
          aria-expanded={isPanelOpen}
        >
          <ion-icon name="git-network-outline" />
          <span className="label text-neutral-300">Chain</span>
          {!!chain.length && <span className="font-mono text-[11px] bg-signal text-neutral-950 rounded px-1.5">{chain.length}</span>}
          {runningName && <span className="font-mono text-[11px] text-lime-300 truncate max-w-40">· {runningName}</span>}
          <ion-icon name={isPanelOpen ? 'chevron-up' : 'chevron-down'} />
        </button>

        <AnimatePresence>
          {isPanelOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute left-0 right-0 top-full z-30 mt-1 rounded-xl bg-neutral-900/95 backdrop-blur-md shadow-2xl shadow-black/50 border border-neutral-700 overflow-x-auto"
            >
              <ChainFlow onNavigate={() => setIsPanelOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Version */}
      <div className="lg:hidden">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsModalOpen(true)}
          className="w-full flex items-center gap-3 p-3 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 transition-colors relative"
        >
          <ion-icon name="git-network-outline" className="text-xl text-neutral-300" />
          {!!chain.length && <small className="font-mono text-[10px] text-neutral-950 absolute -bottom-1 -right-1 bg-signal rounded w-4 aspect-square flex items-center justify-center">{chain.length}</small>}
        </motion.button>

        <AnimatePresence>
          {isModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setIsModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-md max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
                  <h3 className="font-display text-2xl text-neutral-50">Chain</h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200"
                  >
                    <ion-icon name="close-outline" className="text-xl" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <ChainFlow vertical onNavigate={() => setIsModalOpen(false)} />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default ChainVisualizer;
