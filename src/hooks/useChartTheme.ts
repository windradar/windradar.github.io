import { useEffect, useState } from 'react';

export interface ChartTheme {
  text: string;
  grid: string;
}

// "210 25% 55%" (shadcn CSS variable) → "hsla(210, 25%, 55%, a)"
function cssVarColor(name: string, alpha = 1): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const [h, s, l] = raw.split(/\s+/);
  if (!h || !s || !l) return alpha === 1 ? '#4a6a8a' : `rgba(74,106,138,${alpha})`;
  return `hsla(${h}, ${s}, ${l}, ${alpha})`;
}

function readTheme(): ChartTheme {
  return {
    text: cssVarColor('--muted-foreground'),
    grid: cssVarColor('--border', 0.7),
  };
}

// Canvas charts cannot use CSS variables: resolve them and re-read when the
// theme (data-theme on <html>, see ThemeSelector) changes
export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState(readTheme);
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(readTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  return theme;
}
