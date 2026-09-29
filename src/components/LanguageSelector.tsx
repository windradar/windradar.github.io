import { useTranslation } from 'react-i18next';
// flag-icons' es.svg is 81 KB because of the coat of arms, invisible at 18 px
import flagEs from '@/assets/flags/es.svg';
import flagCa from 'flag-icons/flags/4x3/es-ct.svg';
import flagGb from 'flag-icons/flags/4x3/gb.svg';
import flagFr from 'flag-icons/flags/4x3/fr.svg';

const LANGUAGES = [
  { code: 'es', label: 'Castellano', flag: flagEs, enabled: true  },
  { code: 'ca', label: 'Català',     flag: flagCa, enabled: true  },
  { code: 'en', label: 'English',    flag: flagGb, enabled: false },
  { code: 'fr', label: 'Français',   flag: flagFr, enabled: false },
];

const ENABLED = LANGUAGES.filter(l => l.enabled);

// A single toggle: the old hover dropdown could not be opened on touch screens
export function LanguageSelector() {
  const { t, i18n } = useTranslation();
  const idx = Math.max(0, ENABLED.findIndex(l => l.code === i18n.language));
  const current = ENABLED[idx];
  const next = ENABLED[(idx + 1) % ENABLED.length];

  return (
    <button
      onClick={() => i18n.changeLanguage(next.code)}
      className="flex h-[42px] items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 text-xs font-medium text-foreground transition-colors hover:border-primary"
      title={`${current.label} → ${next.label}`}
      aria-label={t('language.buttonLabel', { current: current.label, next: next.label })}
    >
      <img src={current.flag} alt="" width={18} height={13} className="h-[13px] w-[18px] rounded-sm object-cover" />
      <span className="hidden sm:inline font-mono">{current.code.toUpperCase()}</span>
    </button>
  );
}
