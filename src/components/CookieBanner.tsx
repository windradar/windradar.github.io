import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useConsent } from '@/hooks/useConsent';
import { Cookie, X } from 'lucide-react';

export function CookieBanner() {
  const { needsBanner, state, acceptAll, rejectAll, savePartial } = useConsent();
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(state.categories.analytics);
  const [marketing, setMarketing] = useState(state.categories.marketing);

  if (!needsBanner) return null;

  const regionLabel =
    state.region === 'EU' ? 'UE / RGPD' :
    state.region === 'UK' ? 'Reino Unido / UK GDPR' :
    state.region === 'CA' ? 'California / CCPA' : 'Internacional';

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-[100] border-t-2 border-primary/40 bg-card/95 px-4 py-4 shadow-2xl backdrop-blur"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="flex-1 text-xs text-foreground">
            <p className="mb-1 font-bold">
              🍪 Privacidad y cookies <span className="ml-1 text-[0.65rem] font-normal text-muted-foreground">({regionLabel})</span>
            </p>
            <p className="text-muted-foreground">
              Usamos cookies <strong>técnicas</strong> imprescindibles para que funcione la app (sesión, preferencias).
              Con tu permiso, también las usamos para <strong>analítica</strong> (mejorar el servicio) y <strong>publicidad</strong> (Google AdSense).
              Más info en{' '}
              <Link to="/legal/cookies" className="text-primary underline">Política de cookies</Link>,{' '}
              <Link to="/legal/privacy" className="text-primary underline">Privacidad</Link> y{' '}
              <Link to="/legal/notice" className="text-primary underline">Aviso legal</Link>.
            </p>
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="rounded text-muted-foreground hover:text-foreground"
            aria-label="Configurar cookies"
            title="Configurar"
          >
            <X size={16} className={expanded ? '' : 'rotate-45'} />
          </button>
        </div>

        {expanded && (
          <div className="rounded-md border border-border bg-secondary/40 p-3 space-y-2 text-xs">
            <label className="flex items-center gap-2 opacity-70">
              <input type="checkbox" checked disabled />
              <span><strong>Necesarias</strong> — siempre activas (autenticación, preferencias).</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={analytics} onChange={e => setAnalytics(e.target.checked)} />
              <span><strong>Analítica</strong> — métricas anónimas de uso.</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={marketing} onChange={e => setMarketing(e.target.checked)} />
              <span><strong>Publicidad</strong> — Google AdSense personalizado.</span>
            </label>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {expanded ? (
            <button
              onClick={() => savePartial({ analytics, marketing })}
              className="rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20"
            >
              Guardar selección
            </button>
          ) : (
            <button
              onClick={() => setExpanded(true)}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
            >
              Configurar
            </button>
          )}
          <button
            onClick={rejectAll}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
          >
            Rechazar
          </button>
          <button
            onClick={acceptAll}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:brightness-110"
          >
            Aceptar todo
          </button>
        </div>
      </div>
    </div>
  );
}
