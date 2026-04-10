import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface Option {
  id: string;
  name: string;
  [key: string]: any;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  label,
  required,
  disabled
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.id === value);

  const filteredOptions = options.filter(opt =>
    opt.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-2" ref={containerRef}>
      {label && (
        <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center justify-between bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-left transition-all",
            isOpen ? "ring-2 ring-blue-600 border-transparent" : "hover:border-neutral-700",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <span className={cn("block truncate", !selectedOption && "text-neutral-500")}>
            {selectedOption ? selectedOption.name : placeholder}
          </span>
          <ChevronDown size={18} className="text-neutral-500" />
        </button>

        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-2 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-2 border-b border-neutral-800 flex items-center gap-2">
              <Search size={16} className="text-neutral-500" />
              <input
                type="text"
                autoFocus
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-sm text-white placeholder:text-neutral-500"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="text-neutral-500 hover:text-white">
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-sm text-neutral-500">No results found</div>
              ) : (
                filteredOptions.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={cn(
                      "w-full text-left px-4 py-3 text-sm hover:bg-neutral-800 transition-colors",
                      value === opt.id && "bg-blue-600/10 text-blue-500 font-medium"
                    )}
                  >
                    {opt.name}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
