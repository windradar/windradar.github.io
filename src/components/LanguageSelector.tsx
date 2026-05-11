import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'es', label: 'Castellano', fi: 'es',    enabled: true,  visible: true  },
  { code: 'ca', label: 'Català',     fi: 'es-ct', enabled: true,  visible: true  },
  { code: 'en', label: 'English',    fi: 'gb',    enabled: false, visible: false },
  { code: 'fr', label: 'Français',   fi: 'fr',    enabled: false, visible: false },
];

const ENABLED  = LANGUAGES.filter(l => l.enabled);
const VISIBLE  = LANGUAGES.filter(l => l.visible);

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
        <span className={`fi fi-${current.fi} rounded-sm`} style={{ width: 18, height: 13, display: 'inline-block' }} />
        <span className="hidden sm:inline font-mono">{current.code.toUpperCase()}</span>
      </button>

      <div className="absolute right-0 top-full z-50 mt-1 hidden min-w-[150px] rounded-lg border border-border bg-card shadow-lg group-hover:block">
        {VISIBLE.map(lang => (
          <button
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-secondary ${
              lang.code === i18n.language ? 'font-bold text-primary' : 'text-foreground'
            }`}
          >
            <span className={`fi fi-${lang.fi} rounded-sm flex-shrink-0`} style={{ width: 18, height: 13, display: 'inline-block' }} />
            <span className="flex-1 text-left">{lang.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
