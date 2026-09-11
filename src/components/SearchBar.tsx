import React, { useState } from 'react';
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
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      className={`relative flex items-center w-full px-3.5 py-2 input-3d-recessed transition-all duration-200 ${
        isFocused ? 'ring-2 ring-slate-400/20 bg-white dark:bg-slate-900 border-slate-400 dark:border-slate-600' : ''
      } ${className}`}
    >
      <Search
        strokeWidth={1.75}
        className={`h-4 w-4 shrink-0 mr-2.5 pointer-events-none transition-colors duration-200 ${
          isFocused ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'
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
          className="rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          title="Clear search"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

export { SearchBar };
