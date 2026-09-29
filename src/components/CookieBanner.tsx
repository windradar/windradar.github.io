import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConsent } from '@/hooks/useConsent';
import { Cookie, X } from 'lucide-react';

export function CookieBanner() {
  const { t } = useTranslation();
  const { needsBanner, state, acceptAll, rejectAll, savePartial } = useConsent();
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(state.categories.analytics);
  const [marketing, setMarketing] = useState(state.categories.marketing);

  if (!needsBanner) return null;

  const regionLabel =
    state.region === 'EU' ? t('cookies.region.eu') :
    state.region === 'UK' ? t('cookies.region.uk') :
    state.region === 'CA' ? t('cookies.region.california') : t('cookies.region.intl');

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t('cookies.bannerLabel')}
      className="fixed inset-x-0 bottom-0 z-[100] border-t-2 border-primary/40 bg-card/95 px-4 py-4 shadow-2xl backdrop-blur"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="flex-1 text-xs text-foreground">
            <p className="mb-1 font-bold">
              🍪 {t('cookies.title')} <span className="ml-1 text-[0.65rem] font-normal text-muted-foreground">({regionLabel})</span>
            </p>
            <p className="text-muted-foreground">
              {t('cookies.desc')}{' '}
              {t('cookies.moreInfo')}{' '}
              <Link to="/legal/cookies" className="text-primary underline">{t('cookies.cookiePolicy')}</Link>,{' '}
              <Link to="/legal/privacy" className="text-primary underline">{t('cookies.privacy')}</Link> {t('cookies.and')}{' '}
              <Link to="/legal/notice" className="text-primary underline">{t('cookies.legalNotice')}</Link>.
            </p>
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="rounded-md p-2 text-muted-foreground hover:text-foreground"
            aria-label={t('legal.configureCookies')}
            aria-expanded={expanded}
            title={t('cookies.configure')}
          >
            <X size={16} className={expanded ? '' : 'rotate-45'} aria-hidden="true" />
          </button>
        </div>

        {expanded && (
          <div className="rounded-md border border-border bg-secondary/40 p-3 space-y-2 text-xs">
            <label className="flex items-center gap-2 opacity-70">
              <input type="checkbox" checked disabled />
              <span><strong>{t('cookies.necessary')}</strong> — {t('cookies.necessaryDesc')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={analytics} onChange={e => setAnalytics(e.target.checked)} />
              <span><strong>{t('cookies.analytics')}</strong> — {t('cookies.analyticsDesc')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={marketing} onChange={e => setMarketing(e.target.checked)} />
              <span><strong>{t('cookies.marketing')}</strong> — {t('cookies.marketingDesc')}</span>
            </label>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {expanded ? (
            <button
              onClick={() => savePartial({ analytics, marketing })}
              className="rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20"
            >
              {t('cookies.saveSelection')}
            </button>
          ) : (
            <button
              onClick={() => setExpanded(true)}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
            >
              {t('cookies.configure')}
            </button>
          )}
          <button
            onClick={rejectAll}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
          >
            {t('cookies.reject')}
          </button>
          <button
            onClick={acceptAll}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:brightness-110"
          >
            {t('cookies.acceptAll')}
          </button>
        </div>
      </div>
    </div>
  );
}
