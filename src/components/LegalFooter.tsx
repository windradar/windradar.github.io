import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConsent } from '@/hooks/useConsent';
import { InstallAppButton } from '@/components/InstallAppButton';

export function LegalFooter() {
  const { t } = useTranslation();
  const { reopen } = useConsent();
  return (
    <footer className="mt-10 border-t border-border bg-card/50 px-4 py-4 text-[0.7rem] text-muted-foreground">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <span>© {new Date().getFullYear()} WindFlowRadar</span>
        <span className="opacity-40">·</span>
        <Link to="/help" className="font-semibold hover:text-primary">{t('nav.help')}</Link>
        <Link to="/legal/notice" className="hover:text-primary">{t('legal.legalNotice')}</Link>
        <Link to="/legal/privacy" className="hover:text-primary">{t('legal.privacy')}</Link>
        <Link to="/legal/cookies" className="hover:text-primary">{t('legal.cookies')}</Link>
        <Link to="/legal/terms" className="hover:text-primary">{t('legal.terms')}</Link>
        <button onClick={reopen} className="underline hover:text-primary">{t('legal.configureCookies')}</button>
        <InstallAppButton className="inline-flex items-center gap-1 font-semibold text-primary hover:underline" />
      </div>
    </footer>
  );
}
