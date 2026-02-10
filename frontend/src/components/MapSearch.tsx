import { useState, useEffect, useRef } from 'react';
import type { Church } from '../types';
import { useSearch } from '../hooks/useChurches';
import './MapSearch.css';

interface MapSearchProps {
  onSelectChurch: (church: Church) => void;
}

export function MapSearch({ onSelectChurch }: MapSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { results, loading, search, clearResults } = useSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        if (!query) {
          setIsExpanded(false);
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [query]);

  const handleSelect = (church: Church) => {
    onSelectChurch(church);
    setQuery('');
    clearResults();
    setIsOpen(false);
    setIsExpanded(false);
  };

  const handleIconClick = () => {
    setIsExpanded(true);
  };

  const handleBlur = () => {
    if (!query && !isOpen) {
      setTimeout(() => {
        setIsExpanded(false);
      }, 200);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`map-search ${isExpanded ? 'expanded' : ''}`}
      onMouseEnter={() => setIsExpanded(true)}
    >
      <div className="map-search-container">
        <button
          className="map-search-icon-btn"
          onClick={handleIconClick}
          aria-label="Search"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </button>

        {isExpanded && (
          <input
            ref={inputRef}
            type="text"
            placeholder="Search churches..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setIsOpen(true)}
            onBlur={handleBlur}
            className="map-search-input"
          />
        )}

        {loading && isExpanded && <div className="map-search-spinner" />}
      </div>

      {isOpen && results.length > 0 && (
        <div className="map-search-dropdown">
          {results.map((church) => (
            <div
              key={church.id}
              className="map-search-result"
              onClick={() => handleSelect(church)}
            >
              <div className="map-search-result-name">{church.name}</div>
              <div className="map-search-result-location">
                {[church.city, church.state].filter(Boolean).join(', ')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
