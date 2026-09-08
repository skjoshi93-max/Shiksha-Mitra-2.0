import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';

export interface SearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  onClear?: () => void;
  autoFocus?: boolean;
  id?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

export default function SearchBar({
  value = '',
  onChange,
  placeholder = 'Search...',
  className = '',
  inputClassName = '',
  onClear,
  autoFocus = false,
  id,
  onFocus,
  onBlur,
}: SearchBarProps) {
  const [hover, setHover] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isActive = hover || isFocused;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`relative rounded-full p-[2px] transition-all duration-300 ${
        isActive
          ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-[length:200%_200%] animate-gradient-border shadow-lg shadow-purple-500/20 ring-2 ring-purple-400/30'
          : 'bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-800 dark:to-slate-700 shadow-xs'
      } ${className}`}
    >
      <div className="bg-white dark:bg-slate-900 rounded-full relative flex items-center w-full px-3.5 py-2">
        <Search
          className={`h-4 w-4 shrink-0 mr-2.5 pointer-events-none transition-colors duration-200 ${
            isActive ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400 dark:text-slate-500'
          }`}
        />
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            onFocus?.();
          }}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`w-full bg-transparent border-none outline-none text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 pr-2 ${inputClassName}`}
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange?.('');
              onClear?.();
            }}
            className="rounded-full p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

export { SearchBar };
