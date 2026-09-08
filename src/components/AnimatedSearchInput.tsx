import React from 'react';
import SearchBar from './SearchBar';

interface AnimatedSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  onClear?: () => void;
  autoFocus?: boolean;
  id?: string;
}

export const AnimatedSearchInput: React.FC<AnimatedSearchInputProps> = (props) => {
  return <SearchBar {...props} />;
};

