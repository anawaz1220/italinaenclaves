import { useState, useEffect, useRef } from 'react';
import type { Church } from '../types';
import { useSearch } from '../hooks/useChurches';
import './SearchBar.css';

interface SearchBarProps {
  onSelectChurch: (church: Church) => void;
}

export function SearchBar({ onSelectChurch }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { results, loading, search, clearResults } = useSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const debounce = setTimeout(() => {
      search(query);
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, search]);

  useEffect(() => {
    setIsOpen(results.length > 0);
  }, [results]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (church: Church) => {
    onSelectChurch(church);
    setQuery('');
    clearResults();
    setIsOpen(false);
  };

  return (
    <div className="search-bar">
      <div className="search-input-wrapper">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search churches by name or location..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          className="search-input"
        />
        {loading && <div className="search-spinner" />}
      </div>

      {isOpen && results.length > 0 && (
        <div ref={dropdownRef} className="search-dropdown">
          {results.map((church) => (
            <div
              key={church.id}
              className="search-result"
              onClick={() => handleSelect(church)}
            >
              <div className="search-result-name">{church.name}</div>
              <div className="search-result-location">
                {[church.city, church.state].filter(Boolean).join(', ')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
