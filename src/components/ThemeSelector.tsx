import { useEffect, useState } from 'react';

export function ThemeSelector() {
  const [dark, setDark] = useState(() => (localStorage.getItem('windradar_theme') || 'dark') === 'dark');

  useEffect(() => {
    const theme = dark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('windradar_theme', theme);
  }, [dark]);

  return (
    <button
      onClick={() => setDark(d => !d)}
      className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary"
      title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      <span>{dark ? '🌙' : '☀️'}</span>
      <span className="hidden sm:inline">{dark ? 'Oscuro' : 'Claro'}</span>
    </button>
  );
}
