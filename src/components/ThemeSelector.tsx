import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'ebook';

const ORDER: Theme[] = ['dark', 'light', 'ebook'];

const META: Record<Theme, { icon: string; label: string; title: string }> = {
  dark: { icon: '🌙', label: 'Oscuro', title: 'Cambiar a modo claro' },
  light: { icon: '☀️', label: 'Claro', title: 'Cambiar a modo ebook' },
  ebook: { icon: '📖', label: 'Ebook', title: 'Cambiar a modo oscuro' },
};

function readStoredTheme(): Theme {
  const stored = localStorage.getItem('windradar_theme');
  return stored === 'light' || stored === 'ebook' || stored === 'dark' ? stored : 'dark';
}

export function ThemeSelector() {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('windradar_theme', theme);
  }, [theme]);

  const cycleTheme = () => setTheme(t => ORDER[(ORDER.indexOf(t) + 1) % ORDER.length]);

  return (
    <button
      onClick={cycleTheme}
      className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary"
      title={META[theme].title}
    >
      <span>{META[theme].icon}</span>
      <span className="hidden sm:inline">{META[theme].label}</span>
    </button>
  );
}
