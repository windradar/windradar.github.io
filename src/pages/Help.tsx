import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  type LucideIcon, ArrowLeft, BookOpen, Search, X, ChevronDown, Rocket, MapPin, LineChart, SlidersHorizontal,
  BellRing, Share2, CalendarDays, Wrench, UserCircle, Smartphone, Palette, HelpCircle,
} from 'lucide-react';
import { windRowStyle } from '@/lib/wind-row-color';
import { InstallAppButton } from '@/components/InstallAppButton';
import { HELP_CONTENT, type HelpContent, type HelpLang, type HelpSectionText } from './help-content';

interface SectionMeta {
  id: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
}

// Order, icons and colours; the texts come from help-content.ts in the current language
const SECTION_META: SectionMeta[] = [
  { id: 'inicio', icon: Rocket, color: 'text-sky-500', bg: 'bg-sky-500/10', border: 'border-sky-500/30' },
  { id: 'buscar', icon: MapPin, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  { id: 'prevision', icon: LineChart, color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
  { id: 'configuracion', icon: SlidersHorizontal, color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30' },
  { id: 'alertas', icon: BellRing, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  { id: 'compartir', icon: Share2, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  { id: 'sesiones', icon: CalendarDays, color: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-violet-500/30' },
  { id: 'material', icon: Wrench, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  { id: 'cuenta', icon: UserCircle, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
  { id: 'app', icon: Smartphone, color: 'text-teal-500', bg: 'bg-teal-500/10', border: 'border-teal-500/30' },
  { id: 'apariencia', icon: Palette, color: 'text-fuchsia-500', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/30' },
  { id: 'faq', icon: HelpCircle, color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/30' },
];

type Section = SectionMeta & HelpSectionText;

const ROW_LEGEND = [
  { over: 0, label: '+0–4' },
  { over: 5, label: '+5–9' },
  { over: 10, label: '+10–14' },
  { over: 15, label: '+15–19' },
  { over: 20, label: '+20–29' },
  { over: 30, label: '+30' },
];

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function RowColorLegend({ ui }: { ui: HelpContent['ui'] }) {
  const threshold = 10;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-semibold text-foreground">{ui.legendTitle}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{ui.legendDesc}</p>
      <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
        {ROW_LEGEND.map(({ over, label }) => (
          <div
            key={over}
            className="rounded-md border border-border px-2 py-1.5 text-center font-mono text-[0.7rem] font-bold text-foreground"
            style={windRowStyle(threshold + over, threshold)}
          >
            {label} kn
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Help() {
  const { i18n } = useTranslation();
  const lang: HelpLang = i18n.language === 'ca' ? 'ca' : 'es';
  const { ui, sections: texts } = HELP_CONTENT[lang];
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const sections: Section[] = useMemo(
    () => SECTION_META.map(meta => ({ ...meta, ...texts[meta.id] })),
    [texts],
  );

  const tagLabel = { cuenta: ui.tagAccount, dispositivo: ui.tagDevice };

  const q = normalize(query.trim());
  const visibleSections = useMemo(() => {
    if (!q) return sections;
    return sections
      .map(s => ({
        ...s,
        items: s.items.filter(it => normalize(`${s.title} ${it.heading} ${it.body} ${it.tip ?? ''}`).includes(q)),
      }))
      .filter(s => s.items.length > 0);
  }, [q, sections]);

  const toggle = (id: string) => setCollapsed(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-1 py-1 text-xs text-muted-foreground hover:text-primary">
            <ArrowLeft size={14} /> {ui.back}
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <div className="flex items-center gap-1.5 text-sm font-bold">
            <BookOpen size={15} className="text-primary" />
            {ui.title}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 lg:flex lg:gap-10">
        <aside className="hidden lg:block lg:w-52 lg:shrink-0">
          <nav className="sticky top-20 space-y-1" aria-label={ui.contents}>
            <p className="mb-3 text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">{ui.contents}</p>
            {sections.map(s => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                <s.icon size={13} className={s.color} />
                {s.title}
              </a>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 space-y-8">
          <div>
            <h1 className="font-display text-2xl font-extrabold">{ui.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{ui.subtitle}</p>
          </div>

          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={ui.searchPlaceholder}
              aria-label={ui.searchLabel}
              className="w-full rounded-xl border border-border bg-card py-3 pl-9 pr-10 text-sm text-foreground outline-none transition focus:border-primary"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label={ui.clearSearch}
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {!q && (
            <nav className="flex flex-wrap gap-2 lg:hidden" aria-label={ui.contents}>
              {sections.map(s => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-wider transition ${s.border} ${s.bg} ${s.color}`}
                >
                  <s.icon size={11} />
                  {s.title}
                </a>
              ))}
            </nav>
          )}

          {visibleSections.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-sm font-semibold text-foreground">{ui.noResults.replace('{q}', query.trim())}</p>
              <p className="mt-1 text-xs text-muted-foreground">{ui.noResultsHint}</p>
            </div>
          )}

          {visibleSections.map(section => {
            const open = !!q || !collapsed.has(section.id);
            return (
              <section key={section.id} id={section.id} className="scroll-mt-20">
                <button
                  onClick={() => toggle(section.id)}
                  aria-expanded={open}
                  aria-controls={`${section.id}-items`}
                  disabled={!!q}
                  className={`flex w-full items-center gap-2 rounded-xl border p-3 text-left ${section.bg} ${section.border}`}
                >
                  <section.icon size={18} className={section.color} />
                  <span className="min-w-0 flex-1">
                    <span className={`block font-display text-base font-extrabold uppercase tracking-wider ${section.color}`}>
                      {section.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{section.intro}</span>
                  </span>
                  {!q && (
                    <ChevronDown size={18} className={`shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
                  )}
                </button>

                {open && (
                  <div id={`${section.id}-items`} className="mt-3 space-y-3">
                    <ul className="space-y-3">
                      {section.items.map(item => (
                        <li key={item.heading} className="rounded-xl border border-border bg-card p-4">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="text-sm font-semibold leading-snug text-foreground">{item.heading}</p>
                            {item.tags?.map(tag => (
                              <span
                                key={tag}
                                className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-muted-foreground"
                              >
                                {tagLabel[tag]}
                              </span>
                            ))}
                          </div>
                          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
                          {item.tip && (
                            <p className={`mt-2 rounded-lg border px-3 py-2 text-xs leading-relaxed text-foreground ${section.bg} ${section.border}`}>
                              {item.tip}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                    {section.id === 'prevision' && !q && <RowColorLegend ui={ui} />}
                    {section.id === 'app' && !q && <InstallAppButton />}
                  </div>
                )}
              </section>
            );
          })}

          <p className="pb-8 text-center text-xs text-muted-foreground">
            {ui.question}{' '}
            <a href="mailto:juhabar@gmail.com" className="text-primary underline">{ui.contact}</a>.
          </p>
        </main>
      </div>
    </div>
  );
}
