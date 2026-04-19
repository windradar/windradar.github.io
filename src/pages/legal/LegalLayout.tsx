import { Link, NavLink } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ReactNode } from 'react';

const TABS = [
  { to: '/legal/notice', label: 'Aviso legal' },
  { to: '/legal/privacy', label: 'Privacidad' },
  { to: '/legal/cookies', label: 'Cookies' },
  { to: '/legal/terms', label: 'Términos' },
];

export default function LegalLayout({ title, lastUpdated, children }: { title: string; lastUpdated: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
          <ArrowLeft size={14} /> Volver
        </Link>

        <h1 className="mb-2 font-display text-2xl font-extrabold">{title}</h1>
        <p className="mb-4 text-[0.7rem] text-muted-foreground">Última actualización: {lastUpdated}</p>

        <nav className="mb-6 flex flex-wrap gap-2">
          {TABS.map(t => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `rounded-full border px-3 py-1 text-[0.7rem] font-bold uppercase tracking-wider transition ${
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-secondary text-muted-foreground hover:border-primary/50 hover:text-primary'
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>

        <article className="prose prose-sm max-w-none rounded-xl border border-border bg-card p-6 text-sm leading-relaxed text-foreground [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-base [&_h2]:font-bold [&_h2]:uppercase [&_h2]:tracking-wider [&_h2]:text-primary [&_h3]:mt-4 [&_h3]:mb-1 [&_h3]:font-bold [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_a]:text-primary [&_a]:underline [&_strong]:text-foreground [&_code]:rounded [&_code]:bg-secondary [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em]">
          {children}
        </article>
      </div>
    </div>
  );
}
