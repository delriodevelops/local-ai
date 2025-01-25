import React, { useState } from 'react';
import useChatStore from '@/store/chat';
import { motion, Reorder, AnimatePresence } from 'framer-motion';

const ChainVisualizer = () => {
  const { chain, setChain, isStreaming } = useChatStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {/* Desktop Version */}
      <div className="hidden md:flex w-full">
        <div className="overflow-x-auto">
          <Reorder.Group
            axis="x"
            values={chain}
            onReorder={setChain}
            className="flex gap-4 overflow-x-auto pb-4"
          >
            {chain.map((assistant) => (
              <Reorder.Item
                key={assistant.id}
                value={assistant}
                className="flex-shrink-0 relative"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                <motion.div
                  className="flex items-center gap-3 p-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 cursor-grab transition-all"
                  whileDrag={{
                    scale: 1.05,
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <span className="text-xl text-neutral-300">
                    <ion-icon name={assistant?.icon?.icon}></ion-icon>
                  </span>
                  <span className="font-medium whitespace-nowrap text-neutral-100">
                    {assistant.name}
                  </span>
                </motion.div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>
      </div>

      {/* Mobile Version */}
      <div className="md:hidden">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsModalOpen(true)}
          className="w-full flex items-center gap-3 p-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 transition-colors relative"
        >
          <ion-icon name="link" className="text-xl text-neutral-300" />
          {!!chain.length && <small className="text-neutral-100 absolute -bottom-1 -right-1 bg-neutral-700 rounded-full w-5 aspect-square">{chain.length}</small>}
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
                className="bg-neutral-900 rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
                  <h3 className="text-lg font-medium text-neutral-100">Reorder Chain</h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200"
                  >
                    <ion-icon name="close-outline" className="text-xl" />
                  </button>
                </div>

                <div className="overflow-y-auto p-4">
                  <Reorder.Group
                    axis="y"
                    values={chain}
                    onReorder={setChain}
                    className="space-y-3"
                  >
                    {chain.map((assistant, index) => (
                      <Reorder.Item
                        key={assistant.id}
                        value={assistant}
                        className="flex items-center justify-between p-4 bg-neutral-800 rounded-lg"
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center gap-3">
                          <ion-icon
                            name="menu-outline"
                            className="text-xl text-neutral-500"
                          />
                          <span className="font-medium text-neutral-100">
                            {assistant.name}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (index > 0) {
                                const newChain = [...chain];
                                [newChain[index], newChain[index - 1]] =
                                  [newChain[index - 1], newChain[index]];
                                setChain(newChain);
                              }
                            }}
                            disabled={index === 0 || isStreaming}
                            className="p-2 text-neutral-400 hover:text-neutral-200 disabled:opacity-30"
                          >
                            <ion-icon name="chevron-up-outline" className="text-xl" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (index < chain.length - 1) {
                                const newChain = [...chain];
                                [newChain[index], newChain[index + 1]] =
                                  [newChain[index + 1], newChain[index]];
                                setChain(newChain);
                              }
                            }}
                            disabled={index === chain.length - 1 || isStreaming}
                            className="p-2 text-neutral-400 hover:text-neutral-200 disabled:opacity-30"
                          >
                            <ion-icon name="chevron-down-outline" className="text-xl" />
                          </button>
                        </div>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
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