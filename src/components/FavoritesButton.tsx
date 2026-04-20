import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MapPin, Trash2 } from 'lucide-react';
import { getFavorites, removeFavorite, type FavoriteSpot } from '@/lib/weather-helpers';

interface Props {
  onSelect: (name: string, lat: number, lon: number) => void;
  refreshKey?: number;
}

export function FavoritesButton({ onSelect, refreshKey }: Props) {
  const [open, setOpen] = useState(false);
  const [favs, setFavs] = useState<FavoriteSpot[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setFavs(getFavorites()); }, [open, refreshKey]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Favoritos"
        title="Spots favoritos"
        className="flex h-[42px] items-center gap-1 rounded-lg border border-border bg-secondary px-2.5 text-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <Star className="h-4 w-4" fill={favs.length > 0 ? 'currentColor' : 'none'} />
        {favs.length > 0 && (
          <span className="text-[0.65rem] font-bold">{favs.length}</span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-1 w-[260px] max-h-[340px] overflow-y-auto rounded-lg border border-border bg-card shadow-xl"
          >
            <div className="px-3 py-2 text-[0.6rem] font-medium uppercase tracking-widest text-muted-foreground border-b border-border">
              Spots favoritos
            </div>
            {favs.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                Sin favoritos.<br />Marca con ⭐ tras buscar.
              </div>
            ) : favs.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-secondary"
              >
                <button
                  onClick={() => { onSelect(f.name, f.lat, f.lon); setOpen(false); }}
                  className="flex flex-1 min-w-0 items-center gap-2 text-left"
                >
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                  <span className="truncate text-foreground">{f.name}</span>
                </button>
                <button
                  onClick={() => { removeFavorite(f.lat, f.lon); setFavs(getFavorites()); }}
                  className="rounded p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
