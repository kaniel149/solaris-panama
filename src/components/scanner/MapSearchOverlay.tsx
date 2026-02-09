import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Loader2, X } from 'lucide-react';
import { searchPlaces, type GeocodingResult } from '@/services/geocodingService';

interface MapSearchOverlayProps {
  onSelectPlace: (result: GeocodingResult) => void;
}

export default function MapSearchOverlay({ onSelectPlace }: MapSearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      setHasSearched(false);
      return;
    }
    setIsLoading(true);
    setHasSearched(true);
    try {
      const data = await searchPlaces(q);
      setResults(data);
      setIsOpen(true);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(value), 400);
    },
    [doSearch]
  );

  const handleSelect = useCallback(
    (result: GeocodingResult) => {
      onSelectPlace(result);
      setQuery(result.displayName.split(',')[0]);
      setIsOpen(false);
      setResults([]);
      setHasSearched(false);
    },
    [onSelectPlace]
  );

  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setHasSearched(false);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute top-3 left-1/2 -translate-x-1/2 z-20 w-80">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8888a0]" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search places in Panama..."
          className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-[#12121a]/90 backdrop-blur-xl border border-white/[0.06] text-sm text-white placeholder-[#8888a0] outline-none focus:border-[#00ffcc]/30 transition-colors"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00ffcc] animate-spin" />
        )}
        {!isLoading && query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8888a0] hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="mt-1.5 rounded-xl bg-[#12121a]/95 backdrop-blur-xl border border-white/[0.06] overflow-hidden shadow-2xl"
          >
            {results.length > 0 ? (
              results.map((result, i) => (
                <button
                  key={`${result.lat}-${result.lng}-${i}`}
                  onClick={() => handleSelect(result)}
                  className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-white/[0.04] transition-colors text-left"
                >
                  <MapPin className="w-4 h-4 text-[#00ffcc] mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">
                      {result.displayName.split(',')[0]}
                    </p>
                    <p className="text-xs text-[#8888a0] truncate">
                      {result.displayName.split(',').slice(1).join(',').trim()}
                    </p>
                  </div>
                </button>
              ))
            ) : hasSearched ? (
              <div className="px-3 py-4 text-center text-sm text-[#8888a0]">
                No results found
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
