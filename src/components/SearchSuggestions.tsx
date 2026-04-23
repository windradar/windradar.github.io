import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, Loader2, Clock, X } from 'lucide-react';
import { type SearchHistoryItem, getSearchHistory } from '@/lib/weather-helpers';

interface GeoResult {
  id: number;
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

interface Props {
  onSelect: (name: string, lat: number, lon: number) => void;
}

export function SearchWithSuggestions({ onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=es&format=json`;
      const res = await fetch(url);
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  const handleFocus = () => {
    setHistory(getSearchHistory());
    setOpen(true);
  };

  const handleSelect = (name: string, lat: number, lon: number) => {
    setQuery(name);
    setOpen(false);
    setResults([]);
    onSelect(name, lat, lon);
  };

  const handleSubmit = () => {
    if (results.length > 0) {
      const r = results[0];
      const fullName = [r.name, r.admin1, r.country].filter(Boolean).join(', ');
      handleSelect(fullName, r.latitude, r.longitude);
    } else if (query.trim()) {
      // Trigger a search to get results
      search(query.trim());
    }
  };

  const showHistory = query.length < 2 && history.length > 0;
  const showResults = query.length >= 2 && results.length > 0;
  const showNoResults = query.length >= 2 && !loading && results.length === 0;

  return (
    <div ref={containerRef} className="relative flex min-w-0 flex-1 gap-2">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
          className="w-full rounded-lg border border-border bg-secondary py-2.5 pl-9 pr-8 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          placeholder="Buscar lugar..."
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <button
        onClick={handleSubmit}
        className="flex-shrink-0 whitespace-nowrap rounded-lg bg-primary px-4 py-2.5 font-display text-[0.78rem] font-bold tracking-wider text-primary-foreground transition-all hover:-translate-y-0.5 hover:brightness-110"
      >
        <span className="hidden sm:inline">BUSCAR</span>
        <Search className="h-4 w-4 sm:hidden" />
      </button>

      <AnimatePresence>
        {open && (showHistory || showResults || showNoResults || loading) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[320px] overflow-y-auto rounded-lg border border-border bg-card shadow-xl"
          >
            {loading && (
              <div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando...
              </div>
            )}

            {showResults && results.map(r => {
              const parts = [r.name, r.admin1, r.country].filter(Boolean);
              const fullName = parts.join(', ');
              return (
                <button
                  key={r.id}
                  onClick={() => handleSelect(fullName, r.latitude, r.longitude)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-secondary"
                >
                  <MapPin className="h-4 w-4 flex-shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-foreground">{r.name}</div>
                    <div className="truncate text-[0.65rem] text-muted-foreground">
                      {[r.admin1, r.country].filter(Boolean).join(', ')}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-[0.6rem] text-muted-foreground">
                    {r.latitude.toFixed(2)}°, {r.longitude.toFixed(2)}°
                  </div>
                </button>
              );
            })}

            {showNoResults && !loading && (
              <div className="px-4 py-4 text-center text-xs text-muted-foreground">
                No se encontraron resultados para "{query}"
              </div>
            )}

            {showHistory && !loading && (
              <>
                <div className="px-4 py-2 text-[0.6rem] font-medium uppercase tracking-widest text-muted-foreground">
                  Búsquedas recientes
                </div>
                {history.slice(0, 6).map((h) => (
                  <button
                    key={h.timestamp}
                    onClick={() => handleSelect(h.name, h.lat, h.lon)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-secondary"
                  >
                    <Clock className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                    <span className="truncate text-foreground">{h.name}</span>
                  </button>
                ))}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
