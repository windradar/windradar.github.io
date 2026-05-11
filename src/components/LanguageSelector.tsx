import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'es', label: 'Castellano', flag: '🇪🇸' },
  { code: 'ca', label: 'Català',     flag: '🏴' },
  { code: 'en', label: 'English',    flag: '🇬🇧' },
  { code: 'fr', label: 'Français',   flag: '🇫🇷' },
];

export function LanguageSelector() {
  const { i18n } = useTranslation();
  const current = LANGUAGES.find(l => l.code === i18n.language) ?? LANGUAGES[0];

  const cycle = () => {
    const idx = LANGUAGES.findIndex(l => l.code === i18n.language);
    const next = LANGUAGES[(idx + 1) % LANGUAGES.length];
    i18n.changeLanguage(next.code);
  };

  return (
    <div className="relative group">
      <button
        onClick={cycle}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary"
        title={current.label}
      >
        <span>{current.flag}</span>
        <span className="hidden sm:inline font-mono">{current.code.toUpperCase()}</span>
      </button>

      {/* Dropdown on hover */}
      <div className="absolute right-0 top-full z-50 mt-1 hidden min-w-[130px] rounded-lg border border-border bg-card shadow-lg group-hover:block">
        {LANGUAGES.map(lang => (
          <button
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={`flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-secondary ${
              lang.code === i18n.language ? 'font-bold text-primary' : 'text-foreground'
            }`}
          >
            <span>{lang.flag}</span>
            <span>{lang.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
