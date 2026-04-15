import { useState, useEffect, useRef } from 'react';
import type { Church, Enclave, SearchResult } from '../types';
import { useSearch } from '../hooks/useChurches';
import './MapSearch.css';

type LayerType = 'both' | 'churches' | 'enclaves';

interface MapSearchProps {
  onSelectChurch: (church: Church) => void;
  onSelectEnclave: (enclave: Enclave) => void;
  activeLayer: LayerType;
}

export function MapSearch({ onSelectChurch, onSelectEnclave, activeLayer }: MapSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { results, loading, search, clearResults, filterType, setFilterType } = useSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync search filter with active map layer
  useEffect(() => {
    if (activeLayer === 'churches') setFilterType('church');
    else if (activeLayer === 'enclaves') setFilterType('enclave');
    else setFilterType('all');
  }, [activeLayer, setFilterType]);

  useEffect(() => {
    const debounce = setTimeout(() => { search(query); }, 300);
    return () => clearTimeout(debounce);
  }, [query, search]);

  useEffect(() => {
    setIsOpen(results.length > 0);
  }, [results]);

  useEffect(() => {
    if (isExpanded && inputRef.current) inputRef.current.focus();
  }, [isExpanded]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (!query) setIsExpanded(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    if (result.type === 'church') {
      onSelectChurch({ id: result.id, name: result.name, city: result.city, state: result.state, latitude: result.latitude, longitude: result.longitude, year_founded: null });
    } else {
      onSelectEnclave({ id: result.id, name: result.name, city: result.city, state: result.state, region: null, latitude: result.latitude, longitude: result.longitude });
    }
    setQuery('');
    clearResults();
    setIsOpen(false);
    setIsExpanded(false);
  };

  return (
    <div
      ref={containerRef}
      className={`map-search ${isExpanded ? 'expanded' : ''}`}
      onMouseEnter={() => setIsExpanded(true)}
    >
      <div className="map-search-container">
        <button className="map-search-icon-btn" onClick={() => setIsExpanded(true)} aria-label="Search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </button>

        {isExpanded && (
          <input
            ref={inputRef}
            type="text"
            placeholder="Search churches & enclaves..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setIsOpen(true)}
            onBlur={() => {
              if (!query && !isOpen) setTimeout(() => setIsExpanded(false), 200);
            }}
            className="map-search-input"
          />
        )}

        {loading && isExpanded && <div className="map-search-spinner" />}
      </div>

      {/* Type filter tabs — shown when expanded and typing */}
      {isExpanded && query && (
        <div className="map-search-filters">
          <button className={`search-filter-btn ${filterType === 'all' ? 'active' : ''}`} onClick={() => setFilterType('all')}>All</button>
          <button className={`search-filter-btn search-filter-church ${filterType === 'church' ? 'active' : ''}`} onClick={() => setFilterType('church')}>Churches</button>
          <button className={`search-filter-btn search-filter-enclave ${filterType === 'enclave' ? 'active' : ''}`} onClick={() => setFilterType('enclave')}>Enclaves</button>
        </div>
      )}

      {isOpen && results.length > 0 && (
        <div className="map-search-dropdown">
          {results.map((result) => (
            <div
              key={`${result.type}-${result.id}`}
              className="map-search-result"
              onClick={() => handleSelect(result)}
            >
              <div className="map-search-result-top">
                <div className="map-search-result-name">{result.name}</div>
                <span className={`search-result-badge search-result-badge--${result.type}`}>
                  {result.type === 'church' ? 'Church' : 'Enclave'}
                </span>
              </div>
              <div className="map-search-result-location">
                {[result.city, result.state].filter(Boolean).join(', ')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
