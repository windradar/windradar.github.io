import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'es', label: 'Castellano', flag: '🇪🇸', enabled: true },
  { code: 'ca', label: 'Català',     flag: '🏴',  enabled: true },
  { code: 'en', label: 'English',    flag: '🇬🇧', enabled: false },
  { code: 'fr', label: 'Français',   flag: '🇫🇷', enabled: false },
];

const ENABLED = LANGUAGES.filter(l => l.enabled);

export function LanguageSelector() {
  const { i18n } = useTranslation();
  const current = LANGUAGES.find(l => l.code === i18n.language) ?? LANGUAGES[0];

  const cycle = () => {
    const idx = ENABLED.findIndex(l => l.code === i18n.language);
    const next = ENABLED[(idx + 1) % ENABLED.length];
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

      <div className="absolute right-0 top-full z-50 mt-1 hidden min-w-[150px] rounded-lg border border-border bg-card shadow-lg group-hover:block">
        {LANGUAGES.map(lang => (
          <button
            key={lang.code}
            onClick={() => lang.enabled && i18n.changeLanguage(lang.code)}
            disabled={!lang.enabled}
            className={`flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors ${
              lang.enabled
                ? lang.code === i18n.language
                  ? 'font-bold text-primary hover:bg-secondary'
                  : 'text-foreground hover:bg-secondary'
                : 'cursor-not-allowed text-muted-foreground/40'
            }`}
          >
            <span>{lang.flag}</span>
            <span className="flex-1 text-left">{lang.label}</span>
            {!lang.enabled && (
              <span className="text-[0.55rem] uppercase tracking-wider text-muted-foreground/50">
                Pròx.
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
