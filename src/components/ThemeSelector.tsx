import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type Theme = 'dark' | 'light' | 'ebook';

const ORDER: Theme[] = ['dark', 'light', 'ebook'];

// i18n keys; title describes what the next click does
const META: Record<Theme, { icon: string; label: string; title: string }> = {
  dark: { icon: '🌙', label: 'theme.dark', title: 'theme.toLight' },
  light: { icon: '☀️', label: 'theme.light', title: 'theme.toEbook' },
  ebook: { icon: '📖', label: 'theme.ebook', title: 'theme.toDark' },
};

function readStoredTheme(): Theme {
  const stored = localStorage.getItem('windradar_theme');
  return stored === 'light' || stored === 'ebook' || stored === 'dark' ? stored : 'dark';
}

export function ThemeSelector() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('windradar_theme', theme);
  }, [theme]);

  const cycleTheme = () => setTheme(cur => ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length]);
  const label = t(META[theme].label);
  const title = t(META[theme].title);

  return (
    <button
      onClick={cycleTheme}
      className="flex h-[42px] items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 text-xs font-medium text-foreground transition-colors hover:border-primary"
      title={title}
      aria-label={t('theme.buttonLabel', { theme: label, action: title })}
    >
      <span aria-hidden>{META[theme].icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
