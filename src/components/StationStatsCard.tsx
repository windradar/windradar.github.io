import { memo, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { loadSettings } from '@/components/SettingsPanel';
import { CARD16, LANG_LOCALE } from '@/lib/weather-helpers';
import { WIND_UNIT_LABEL, formatWind, useWindUnit, windFromKnots } from '@/lib/wind-units';
import type { Station } from '@/lib/stations';

interface RoseRow { dir_bin: number; speed_class: number; samples: number }
interface DayRow { day: string; minutes_windy: number; readings: number }

const SIZE = 240;
const C = SIZE / 2;
const R = 88;
const HALF_WEDGE = 9;
// Speed class upper limits in kn (class 4 has none) and their colours
const CLASS_LIMITS = [5, 10, 15, 20];
const CLASS_COLORS = ['#7bb8d8', '#44cc88', '#ffcc44', '#ff8c00', '#ff3366'];
// A day with fewer readings than this (6 h of 1-minute readings) is not counted
const MIN_READINGS_PER_DAY = 360;
// Minutes of wind at or above the user's threshold that make a day "windy"
const WINDY_MINUTES = 120;
const DAYS = 90;

function polar(angleDeg: number, r: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: C + r * Math.sin(a), y: C - r * Math.cos(a) };
}

function wedge(centerDeg: number, r: number): string {
  const p1 = polar(centerDeg - HALF_WEDGE, r);
  const p2 = polar(centerDeg + HALF_WEDGE, r);
  return `M ${C} ${C} L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} Z`;
}

// What the station has seen over the last 90 days: where the wind comes from and how
// strong, and how many days had enough wind. Fills up as readings accumulate.
export const StationStatsCard = memo(function StationStatsCard({ station }: { station: Station }) {
  const { t, i18n } = useTranslation();
  const locale = LANG_LOCALE[i18n.language] || 'es-ES';
  const unit = useWindUnit();
  const unitLabel = WIND_UNIT_LABEL[unit];
  const [open, setOpen] = useState(false);
  const [rose, setRose] = useState<RoseRow[] | null>(null);
  const [days, setDays] = useState<DayRow[] | null>(null);
  const [error, setError] = useState(false);
  const [minKn] = useState(() => loadSettings().minWindKn);

  useEffect(() => {
    if (!open || rose) return;
    let cancelled = false;
    setError(false);
    (async () => {
      try {
        const [r, d] = await Promise.all([
          supabase.rpc('station_wind_rose', { p_station: station.id, p_days: DAYS }),
          supabase.rpc('station_daily_summary', { p_station: station.id, p_days: DAYS, p_min_kn: minKn }),
        ]);
        if (cancelled) return;
        if (r.error || d.error) throw r.error ?? d.error;
        setRose(r.data ?? []);
        setDays(d.data ?? []);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [open, rose, station.id, minKn]);

  const view = useMemo(() => {
    if (!rose?.length) return null;
    const totals = Array.from({ length: 16 }, () => [0, 0, 0, 0, 0]);
    for (const row of rose) totals[row.dir_bin][row.speed_class] += Number(row.samples);
    const sectorSum = totals.map(c => c.reduce((a, b) => a + b, 0));
    const max = Math.max(...sectorSum);
    const all = sectorSum.reduce((a, b) => a + b, 0);
    if (max <= 0) return null;
    return { totals, sectorSum, max, all };
  }, [rose]);

  const months = useMemo(() => {
    const out = new Map<string, { counted: number; windy: number }>();
    for (const d of days ?? []) {
      if (Number(d.readings) < MIN_READINGS_PER_DAY) continue;
      const key = d.day.slice(0, 7);
      const m = out.get(key) ?? { counted: 0, windy: 0 };
      m.counted += 1;
      if (Number(d.minutes_windy) >= WINDY_MINUTES) m.windy += 1;
      out.set(key, m);
    }
    return [...out.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [days]);

  const countedDays = months.reduce((n, [, m]) => n + m.counted, 0);
  const classLabel = (i: number) => {
    const fmt = (kn: number) => formatWind(windFromKnots(kn, unit), unit);
    if (i === 0) return `< ${fmt(CLASS_LIMITS[0])}`;
    if (i === 4) return `${fmt(CLASS_LIMITS[3])}+`;
    return `${fmt(CLASS_LIMITS[i - 1])}–${fmt(CLASS_LIMITS[i])}`;
  };

  return (
    <section className="mb-6 rounded-lg border border-border bg-card p-4" aria-label={t('station.statsTitle')}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 font-display text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <BarChart3 className="h-3 w-3" />
        {t('station.statsTitle')}
        <span className="font-sans font-normal normal-case tracking-normal">· {station.name}</span>
        <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-3">
          {error && <div role="alert" className="text-xs text-destructive">{t('station.statsError')}</div>}
          {!error && !rose && (
            <div className="flex h-24 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
            </div>
          )}
          {!error && rose && !view && (
            <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">{t('station.statsNoData')}</div>
          )}

          {view && (
            <div className="grid grid-cols-1 items-center gap-5 sm:grid-cols-[minmax(0,260px)_1fr]">
              <div>
                <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto h-auto w-full max-w-[260px]" role="img" aria-label={t('station.roseTitle')}>
                  {[0.25, 0.5, 0.75, 1].map(f => (
                    <circle key={f} cx={C} cy={C} r={R * f} fill="none" className="stroke-border" strokeWidth="0.8" />
                  ))}
                  {view.totals.map((classes, bin) => {
                    let cum = classes.reduce((a, b) => a + b, 0);
                    const parts: React.ReactNode[] = [];
                    // Outermost class first so the inner ones are drawn on top
                    for (let c = 4; c >= 0; c--) {
                      if (classes[c] > 0) {
                        parts.push(
                          <path key={`${bin}-${c}`} d={wedge(bin * 22.5, (R * cum) / view.max)} fill={CLASS_COLORS[c]} fillOpacity="0.9" />,
                        );
                      }
                      cum -= classes[c];
                    }
                    return <g key={bin}>{parts}</g>;
                  })}
                  {[0, 4, 8, 12].map(i => {
                    const p = polar(i * 22.5, R + 12);
                    return (
                      <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" className="fill-muted-foreground" fontSize="11" fontWeight="700">
                        {CARD16[i]}
                      </text>
                    );
                  })}
                </svg>
                <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[0.65rem] text-muted-foreground">
                  {CLASS_COLORS.map((color, i) => (
                    <span key={color} className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
                      {classLabel(i)}
                    </span>
                  ))}
                  <span>{unitLabel}</span>
                </div>
              </div>

              <div className="text-sm">
                <div className="mb-2 text-[0.6rem] uppercase tracking-widest text-muted-foreground">
                  {t('station.windyDaysTitle', { kn: formatWind(windFromKnots(minKn, unit), unit), unit: unitLabel })}
                </div>
                {months.length === 0 ? (
                  <div className="text-xs text-muted-foreground">{t('station.statsNoData')}</div>
                ) : (
                  <ul className="space-y-1">
                    {months.map(([key, m]) => (
                      <li key={key} className="flex items-baseline gap-2">
                        <span className="w-32 shrink-0 capitalize text-muted-foreground">
                          {new Date(`${key}-01T12:00:00`).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
                        </span>
                        <span className="font-mono font-bold text-foreground">{m.windy}</span>
                        <span className="text-xs text-muted-foreground">{t('station.windyDaysOf', { days: m.counted })}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {countedDays < 14 && (
                  <p className="mt-3 text-[0.7rem] leading-relaxed text-muted-foreground">
                    {t('station.statsFewData', { days: countedDays })}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
});
