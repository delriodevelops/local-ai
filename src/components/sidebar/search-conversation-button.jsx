import React, { useState, useEffect } from 'react';
import useChatStore from '@/store/chat';

const SearchConversationButton = () => {
  const { history, setMessages, setActualConversation } = useChatStore(s => s);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  const handleSearch = (query) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const matches = history.reduce((acc, conversation) => {
      const messageMatches = conversation.messages.filter(message =>
        message.content.toLowerCase().includes(query.toLowerCase())
      ).map(message => ({
        ...message,
        ...conversation,
      }));
      return [...acc, ...messageMatches];
    }, []);

    setResults(matches);
  };

  const handleResultClick = ({ createdAt, messages }) => {
    setIsModalOpen(false);
    setActualConversation(createdAt);
    setMessages(messages);
  };

  const highlightText = (text) => {
    if (!searchQuery) return text;
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase()
        ? <mark key={i} className="font-extrabold text-white bg-transparent">{part}</mark>
        : part
    );
  };

  if (!isModalOpen) {
    return (
      <button
        onClick={() => setIsModalOpen(true)}
        className="hover:bg-neutral-700 p-2 lg:p-3 flex items-center justify-center rounded-lg lg:rounded-xl cursor-pointer duration-300 ease-in-out mb-2"
      >
        <ion-icon name="search" className="text-lg lg:text-xl" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start lg:items-center justify-center duration-300 ease-in-out mt-2" >
      <div className="bg-neutral-800 rounded-top-xl w-full h-full lg:h-auto lg:max-w-2xl lg:max-h-[80vh] overflow-hidden flex flex-col mt-0 lg:mt-4 p-2 lg:p-0" style={{ "interpolate-size": "allow-keywords" }}>
        <div className={`relative flex items-center p-2 bg-neutral-700  border-b border-neutral-600 ${results.length ? 'rounded-t-xl' : 'rounded-xl'}`} >
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            placeholder="Type to search..."
            className="w-full p-2 lg:p-3 pr-8 lg:pr-10 bg-neutral-700 rounded-lg outline-none text-sm lg:text-base"
          />
          <button
            onClick={() => {
              setSearchQuery('');
              setResults([]);
              setIsModalOpen(false);
            }}
            className="bg-neutral-700 p-2 flex items-center aspect-square hover:bg-neutral-600 rounded-lg duration-300 ease-in-out"
          >
            <ion-icon name="close" className="text-lg lg:text-xl" />
          </button>
        </div>

        {
          !!results.length && (
            <div className="flex-1 overflow-y-auto p-2 bg-neutral-700">
              {results.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleResultClick(result)}
                  className="w-full p-3 lg:p-4 mb-2 lg:mb-3 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-sm lg:text-base text-left"
                >
                  <div className="truncate text-neutral-300">
                    {highlightText(result.content)}
                  </div>
                </button>
              ))}
            </div>
          )
        }
      </div>
    </div>
  );
};

export default SearchConversationButton;