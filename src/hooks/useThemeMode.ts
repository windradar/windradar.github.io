import { useEffect, useState } from 'react';

const LIGHT_THEMES = ['light', 'ebook'];

export type ThemeMode = 'light' | 'dark';

function readMode(): ThemeMode {
  return LIGHT_THEMES.includes(document.documentElement.getAttribute('data-theme') ?? '') ? 'light' : 'dark';
}

// The app theme lives in <html data-theme> (ThemeSelector), not in a React context
export function useThemeMode(): ThemeMode {
  const [mode, setMode] = useState(readMode);
  useEffect(() => {
    const observer = new MutationObserver(() => setMode(readMode()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  return mode;
}
