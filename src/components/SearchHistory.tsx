import { getSearchHistory, clearSearchHistory, type SearchHistoryItem } from '@/lib/weather-helpers';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  open: boolean;
  onSelect: (item: SearchHistoryItem) => void;
  onClose: () => void;
}

export function SearchHistory({ open, onSelect, onClose }: Props) {
  const history = getSearchHistory();

  if (!open || history.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        className="absolute left-0 top-full z-50 mt-1 w-full max-w-md overflow-hidden rounded-lg border border-border bg-card shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">
            Historial
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearSearchHistory();
              onClose();
            }}
            className="text-[0.6rem] text-destructive hover:underline"
          >
            Borrar todo
          </button>
        </div>
        {history.slice(0, 8).map((item, i) => (
          <button
            key={i}
            onClick={() => { onSelect(item); onClose(); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-secondary"
          >
            <span className="text-muted-foreground">📍</span>
            <span className="flex-1 truncate">{item.name}</span>
            <span className="text-[0.6rem] text-muted-foreground">
              {new Date(item.timestamp).toLocaleDateString('es-ES')}
            </span>
          </button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
