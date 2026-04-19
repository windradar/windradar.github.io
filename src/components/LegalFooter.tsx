import { Link } from 'react-router-dom';
import { useConsent } from '@/hooks/useConsent';

export function LegalFooter() {
  const { reopen } = useConsent();
  return (
    <footer className="mt-10 border-t border-border bg-card/50 px-4 py-4 text-[0.7rem] text-muted-foreground">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <span>© {new Date().getFullYear()} WindFlowRadar</span>
        <span className="opacity-40">·</span>
        <Link to="/legal/notice" className="hover:text-primary">Aviso legal</Link>
        <Link to="/legal/privacy" className="hover:text-primary">Privacidad</Link>
        <Link to="/legal/cookies" className="hover:text-primary">Cookies</Link>
        <Link to="/legal/terms" className="hover:text-primary">Términos</Link>
        <button onClick={reopen} className="underline hover:text-primary">Configurar cookies</button>
      </div>
    </footer>
  );
}
