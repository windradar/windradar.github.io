import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const THEMES = [
  { id: 'dark', label: 'Oscuro', color: '#0a1220', icon: '🌙' },
  { id: 'light', label: 'Claro', color: '#f0f2f5', icon: '☀️' },
  { id: 'blue', label: 'Azul', color: '#1a3a6a', icon: '🔵' },
  { id: 'red', label: 'Rojo', color: '#4a1515', icon: '🔴' },
  { id: 'green', label: 'Verde', color: '#0a2a15', icon: '🟢' },
] as const;

export function ThemeSelector() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('windradar_theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('windradar_theme', theme);
  }, [theme]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary"
      >
        <span>{THEMES.find(t => t.id === theme)?.icon}</span>
        <span className="hidden sm:inline">{THEMES.find(t => t.id === theme)?.label}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-border bg-card shadow-xl"
          >
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => { setTheme(t.id); setOpen(false); }}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-xs transition-colors hover:bg-secondary ${
                  theme === t.id ? 'text-primary' : 'text-foreground'
                }`}
              >
                <span
                  className="h-3 w-3 rounded-full border border-border"
                  style={{ backgroundColor: t.color }}
                />
                <span className="whitespace-nowrap">{t.label}</span>
                {theme === t.id && <span className="ml-2 text-primary">✓</span>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
