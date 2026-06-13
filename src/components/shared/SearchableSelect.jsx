import { useState, useRef, useEffect } from 'react';

export default function SearchableSelect({ value, onChange, options, placeholder, disabled }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const filtered = search
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    onChange(option);
    setOpen(false);
    setSearch('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setSearch('');
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-left flex items-center justify-between gap-2 disabled:opacity-50 transition-all"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400 truncate'}>
          {value || placeholder}
        </span>
        <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="sticky top-0 bg-white border-b border-gray-100">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search..."
              className="w-full px-3 py-2.5 text-sm outline-none"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-400 text-center">No matches</div>
            ) : (
              filtered.map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`w-full text-left px-3 py-2.5 text-sm hover:bg-emerald-50 transition-colors ${
                    value === option ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  {option}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
