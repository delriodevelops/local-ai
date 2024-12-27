import { useState, useRef, useEffect } from 'react';

const CustomDropdown = ({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2 rounded-lg bg-neutral-700 text-left flex justify-between items-center hover:bg-neutral-600 duration-300"
      >
        <span className={`${value ? 'text-white' : 'text-neutral-400'} capitalize flex items-center gap-2`}>
          {value.icon && <ion-icon name={value.icon} className="mr-2"></ion-icon>}
          {value.color && <div className={`p-2 rounded-full h-4 w-4 aspect-square flex item-center text-black duration-300 ease-in-out ${value.color}`}></div>}
          <span className={`${value ? 'text-white' : 'text-neutral-400'} capitalize`}>
            {value?.label || placeholder}
          </span>
        </span>
        <ion-icon
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          className="text-neutral-400"
        />
      </button>

      {isOpen && (
        <div className="absolute w-full mt-2 bg-neutral-800 rounded-lg shadow-lg z-50 border border-neutral-700">
          <div className="p-2">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 rounded-lg bg-neutral-700 outline-none text-sm"
            />
          </div>

          <div className="max-h-60 overflow-y-auto">
            {
              filteredOptions.map((option, index) => (
                <button
                  key={index}
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-neutral-700 duration-300 capitalize flex items-center gap-2"
                >
                  {option.icon && <ion-icon name={option.icon} className="mr-2"></ion-icon>}
                  {option.color && <div className={`p-2 rounded-full h-4 w-4 aspect-square flex item-center text-black duration-300 ease-in-out ${option.color}`}></div>}
                  <span>{option.label}</span>
                </button>
              ))
            }
            {filteredOptions.length === 0 && (
              <div className="px-4 py-2 text-neutral-400 text-sm">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;