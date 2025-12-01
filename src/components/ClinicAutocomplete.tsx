import React, { useState, useEffect, useRef } from 'react';
import { supabaseClient } from '../utility';

// Direct port from qx-client/src/components/ClinicAutocomplete.jsx
// Only changes: TypeScript types, supabaseClient import, and inline styles instead of Tailwind

interface Clinic {
  id: string;
  name: string;
  address?: string;
}

interface ClinicAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onClinicSelect: (clinic: Clinic | null) => void;
  selectedClinic: Clinic | null;
}

export default function ClinicAutocomplete({
  value,
  onChange,
  onClinicSelect,
  selectedClinic,
}: ClinicAutocompleteProps) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState<Clinic[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync external value changes
  useEffect(() => {
    if (value !== query) {
      setQuery(value || '');
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search clinics with debounce
  const searchClinics = async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from('clinics')
        .select('id, name, address')
        .ilike('name', `%${searchQuery}%`)
        .order('name')
        .limit(10);

      if (error) {
        console.error('Clinic search error:', error);
        setSuggestions([]);
      } else {
        setSuggestions(data || []);
      }
    } catch (err) {
      console.error('Clinic search failed:', err);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    onChange(newValue);
    setHighlightedIndex(-1);

    // If there was a selected clinic and user is typing, disconnect it
    if (selectedClinic) {
      onClinicSelect(null);
    }

    // Debounced search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchClinics(newValue);
      if (newValue.length >= 2) {
        setIsOpen(true);
      }
    }, 300);
  };

  const handleSelectClinic = (clinic: Clinic) => {
    setQuery(clinic.name);
    onChange(clinic.name);
    onClinicSelect(clinic);
    setIsOpen(false);
    setSuggestions([]);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          handleSelectClinic(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleFocus = () => {
    if (query.length >= 2 && suggestions.length > 0) {
      setIsOpen(true);
    }
  };

  const isLinked = !!selectedClinic;

  // Styles matching qx-client but for dark mode compatibility
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '4px 32px 4px 11px',
    fontSize: '14px',
    lineHeight: '1.5715',
    borderRadius: '6px',
    border: isLinked ? '2px solid #1890ff' : '1px solid #424242',
    backgroundColor: 'transparent',
    color: 'inherit',
    outline: 'none',
    height: '32px',
    boxSizing: 'border-box',
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 1000,
    width: '100%',
    marginTop: '4px',
    backgroundColor: '#1f1f1f',
    border: '1px solid #424242',
    borderRadius: '6px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.45)',
    maxHeight: '240px',
    overflow: 'auto',
    padding: 0,
    listStyle: 'none',
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder="Search or enter clinic name..."
          style={inputStyle}
          autoComplete="off"
        />
        {isLinked && (
          <span
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#1890ff',
            }}
          >
            <svg
              style={{ width: '16px', height: '16px' }}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        )}
        {isLoading && (
          <span
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          >
            <svg
              style={{
                animation: 'spin 1s linear infinite',
                width: '16px',
                height: '16px',
                color: '#666',
              }}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                style={{ opacity: 0.25 }}
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                style={{ opacity: 0.75 }}
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </span>
        )}
      </div>

      {/* Dropdown suggestions */}
      {isOpen && suggestions.length > 0 && (
        <ul style={dropdownStyle}>
          {suggestions.map((clinic, index) => (
            <li
              key={clinic.id}
              onClick={() => handleSelectClinic(clinic)}
              onMouseEnter={() => setHighlightedIndex(index)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                backgroundColor:
                  highlightedIndex === index ? '#177ddc' : 'transparent',
                color: '#fff',
              }}
            >
              <div style={{ fontWeight: 500 }}>{clinic.name}</div>
              {clinic.address && (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#8c8c8c',
                    marginTop: '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {clinic.address}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* No results message */}
      {isOpen && query.length >= 2 && suggestions.length === 0 && !isLoading && (
        <div
          style={{
            position: 'absolute',
            zIndex: 1000,
            width: '100%',
            marginTop: '4px',
            backgroundColor: '#1f1f1f',
            border: '1px solid #424242',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '14px',
            color: '#8c8c8c',
          }}
        >
          No existing clinics found. A new clinic will be created.
        </div>
      )}

      {/* Linked clinic indicator */}
      {isLinked && (
        <div style={{ marginTop: '4px', fontSize: '12px', color: '#1890ff' }}>
          Linked to existing clinic. Editing address fields will create a new clinic entry.
        </div>
      )}
    </div>
  );
}

export { ClinicAutocomplete };
