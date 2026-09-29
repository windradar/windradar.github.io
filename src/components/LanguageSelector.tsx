import { useTranslation } from 'react-i18next';
// flag-icons' es.svg is 81 KB because of the coat of arms, invisible at 18 px
import flagEs from '@/assets/flags/es.svg';
import flagCa from 'flag-icons/flags/4x3/es-ct.svg';
import flagGb from 'flag-icons/flags/4x3/gb.svg';
import flagFr from 'flag-icons/flags/4x3/fr.svg';

const LANGUAGES = [
  { code: 'es', label: 'Castellano', flag: flagEs, enabled: true,  visible: true  },
  { code: 'ca', label: 'Català',     flag: flagCa, enabled: true,  visible: true  },
  { code: 'en', label: 'English',    flag: flagGb, enabled: false, visible: false },
  { code: 'fr', label: 'Français',   flag: flagFr, enabled: false, visible: false },
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
        <img src={current.flag} alt="" width={18} height={13} className="h-[13px] w-[18px] rounded-sm object-cover" />
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
            <img src={lang.flag} alt="" width={18} height={13} className="h-[13px] w-[18px] flex-shrink-0 rounded-sm object-cover" />
            <span className="flex-1 text-left">{lang.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
