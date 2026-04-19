import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';

export type ConsentCategories = {
  necessary: true; // always true
  analytics: boolean;
  marketing: boolean;
};

export type ConsentState = {
  categories: ConsentCategories;
  decidedAt: string | null; // ISO date when user made a choice
  region: 'EU' | 'UK' | 'CA' | 'OTHER';
};

const STORAGE_KEY = 'wfr_consent_v1';
const DEFAULT: ConsentState = {
  categories: { necessary: true, analytics: false, marketing: false },
  decidedAt: null,
  region: 'OTHER',
};

interface Ctx {
  state: ConsentState;
  needsBanner: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  savePartial: (cats: Partial<Omit<ConsentCategories, 'necessary'>>) => void;
  reopen: () => void;
}

const ConsentCtx = createContext<Ctx | null>(null);

function detectRegion(): ConsentState['region'] {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const lang = (navigator.language || '').toLowerCase();
    if (tz.startsWith('Europe/London') || lang === 'en-gb') return 'UK';
    if (tz.startsWith('Europe/')) return 'EU';
    if (tz.startsWith('America/Los_Angeles') || tz.startsWith('America/Tijuana')) return 'CA';
    return 'OTHER';
  } catch {
    return 'OTHER';
  }
}

function loadAdSenseIfMissing() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('script[data-consent="adsense"]')) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7799630223343814';
  s.crossOrigin = 'anonymous';
  s.dataset.consent = 'adsense';
  document.head.appendChild(s);
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConsentState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT, ...(JSON.parse(raw) as ConsentState) };
    } catch { /* noop */ }
    return { ...DEFAULT, region: detectRegion() };
  });
  const [forceShow, setForceShow] = useState(false);

  useEffect(() => {
    if (state.decidedAt && state.categories.marketing) loadAdSenseIfMissing();
  }, [state]);

  const persist = useCallback((next: ConsentState) => {
    setState(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* noop */ }
    setForceShow(false);
  }, []);

  const acceptAll = useCallback(() => {
    persist({ ...state, categories: { necessary: true, analytics: true, marketing: true }, decidedAt: new Date().toISOString() });
  }, [persist, state]);

  const rejectAll = useCallback(() => {
    persist({ ...state, categories: { necessary: true, analytics: false, marketing: false }, decidedAt: new Date().toISOString() });
  }, [persist, state]);

  const savePartial = useCallback((cats: Partial<Omit<ConsentCategories, 'necessary'>>) => {
    persist({
      ...state,
      categories: { necessary: true, analytics: !!cats.analytics, marketing: !!cats.marketing },
      decidedAt: new Date().toISOString(),
    });
  }, [persist, state]);

  const reopen = useCallback(() => setForceShow(true), []);

  const needsBanner = forceShow || !state.decidedAt;

  return (
    <ConsentCtx.Provider value={{ state, needsBanner, acceptAll, rejectAll, savePartial, reopen }}>
      {children}
    </ConsentCtx.Provider>
  );
}

export function useConsent() {
  const ctx = useContext(ConsentCtx);
  if (!ctx) throw new Error('useConsent must be used within ConsentProvider');
  return ctx;
}
