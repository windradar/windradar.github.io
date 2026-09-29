import { memo, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { type FavoriteSpot, windColor, dirArrow, kmhToKnots } from '@/lib/weather-helpers';
import { useWindUnit, windFromKmh, formatWind, WIND_UNIT_LABEL } from '@/lib/wind-units';

interface Props {
  favorites: FavoriteSpot[];
  thresholdKn: number;
  fromHour: string;
  toHour: string;
  currentLat: number | null;
  currentLon: number | null;
  onSelect: (name: string, lat: number, lon: number) => void;
}

interface SpotHourly {
  time: string[];
  wind_speed_10m: (number | null)[];
  wind_gusts_10m: (number | null)[];
  wind_direction_10m: (number | null)[];
}

interface DaySummary {
  maxKmh: number;
  gustKmh: number;
  dirAtMax: number;
  firstWindy: string | null;
  lastWindy: string | null;
}

const CACHE_TTL = 30 * 60 * 1000;
// Module-level so switching spots or re-rendering Index does not refetch
const cache = new Map<string, { at: number; data: SpotHourly[] }>();

async function fetchAll(favs: FavoriteSpot[], signal: AbortSignal): Promise<SpotHourly[]> {
  const key = favs.map(f => `${f.lat},${f.lon}`).join('|');
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.data;
  // One request for every favourite: Open-Meteo accepts comma-separated coordinates
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${favs.map(f => f.lat).join(',')}&longitude=${favs.map(f => f.lon).join(',')}&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m&wind_speed_unit=kmh&timezone=auto&forecast_days=2`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const json = await res.json();
  const list = (Array.isArray(json) ? json : [json]) as { hourly: SpotHourly }[];
  const data = list.map(x => x.hourly);
  cache.set(key, { at: Date.now(), data });
  return data;
}

function summarize(h: SpotHourly, day: string, thresholdKn: number, fromHour: string, toHour: string): DaySummary | null {
  let maxKmh = -1, gustKmh = 0, dirAtMax = 0;
  let firstWindy: string | null = null, lastWindy: string | null = null;
  for (let i = 0; i < h.time.length; i++) {
    const t = h.time[i];
    if (t.slice(0, 10) !== day) continue;
    const hr = t.slice(11, 16);
    if (hr < fromHour || hr > toHour) continue;
    const ws = h.wind_speed_10m[i] ?? 0;
    if (ws > maxKmh) {
      maxKmh = ws;
      gustKmh = h.wind_gusts_10m[i] ?? 0;
      dirAtMax = h.wind_direction_10m[i] ?? 0;
    }
    if (kmhToKnots(ws) >= thresholdKn) {
      firstWindy ??= hr;
      lastWindy = hr;
    }
  }
  return maxKmh < 0 ? null : { maxKmh, gustKmh, dirAtMax, firstWindy, lastWindy };
}

function hourLabel(hr: string) {
  return String(Number(hr.slice(0, 2)));
}

export const FavoritesPanel = memo(function FavoritesPanel({
  favorites, thresholdKn, fromHour, toHour, currentLat, currentLon, onSelect,
}: Props) {
  const { t } = useTranslation();
  const unit = useWindUnit();
  const [data, setData] = useState<SpotHourly[] | null>(null);
  const [failed, setFailed] = useState(false);

  const favKey = favorites.map(f => `${f.lat},${f.lon}`).join('|');

  useEffect(() => {
    if (!favorites.length) return;
    const controller = new AbortController();
    setFailed(false);
    setData(null);
    fetchAll(favorites, controller.signal)
      .then(d => setData(d))
      .catch(e => { if (!(e instanceof DOMException && e.name === 'AbortError')) setFailed(true); });
    return () => controller.abort();
    // favKey captures the coordinates; the array identity changes on every read
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favKey]);

  const rows = useMemo(() => {
    if (!data || data.length !== favorites.length) return null;
    return favorites.map((f, i) => {
      const h = data[i];
      const days = [...new Set(h.time.map(x => x.slice(0, 10)))];
      return {
        fav: f,
        today: days[0] ? summarize(h, days[0], thresholdKn, fromHour, toHour) : null,
        tomorrow: days[1] ? summarize(h, days[1], thresholdKn, fromHour, toHour) : null,
      };
    });
  }, [data, favorites, thresholdKn, fromHour, toHour]);

  if (!favorites.length || failed) return null;

  const unitLabel = WIND_UNIT_LABEL[unit];

  const dayLine = (label: string, d: DaySummary | null) => {
    if (!d) return null;
    const windy = d.firstWindy !== null;
    return (
      <div className="flex items-baseline gap-1.5 text-[0.72rem]">
        <span className="w-[3.2rem] shrink-0 text-[0.62rem] uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="font-mono text-sm font-bold" style={{ color: windColor(d.maxKmh) }}>
          {formatWind(windFromKmh(d.maxKmh, unit), unit)}
        </span>
        <span className="text-[0.62rem] text-muted-foreground">{unitLabel}</span>
        <span className="text-muted-foreground" aria-hidden>{dirArrow(d.dirAtMax)}</span>
        <span className={`ml-auto whitespace-nowrap text-[0.65rem] ${windy ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
          {windy
            ? (d.firstWindy === d.lastWindy
              ? `${hourLabel(d.firstWindy!)} h`
              : `${hourLabel(d.firstWindy!)}–${hourLabel(d.lastWindy!)} h`)
            : t('favPanel.noWind')}
        </span>
      </div>
    );
  };

  return (
    <section className="mb-6" aria-label={t('favPanel.title')}>
      <div className="mb-2.5 flex items-center gap-2 font-display text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        <Star className="h-3 w-3" fill="currentColor" /> {t('favPanel.title')}
        <span className="font-sans font-normal normal-case tracking-normal">· {t('favPanel.subtitle', { kn: thresholdKn })}</span>
        <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
      </div>
      <div className="-mx-3 flex snap-x gap-2 overflow-x-auto px-3 pb-1 md:mx-0 md:px-0">
        {favorites.map((f, i) => {
          const row = rows?.[i];
          const isCurrent = currentLat !== null && currentLon !== null
            && Math.abs(f.lat - currentLat) < 1e-4 && Math.abs(f.lon - currentLon) < 1e-4;
          const windyToday = row?.today?.firstWindy != null;
          return (
            <button
              key={`${f.lat},${f.lon}`}
              onClick={() => onSelect(f.name, f.lat, f.lon)}
              aria-current={isCurrent ? 'true' : undefined}
              className={`w-[210px] shrink-0 snap-start rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/60 ${isCurrent ? 'border-primary' : windyToday ? 'border-[#44cc88]/50' : 'border-border'}`}
            >
              <div className="mb-2 truncate text-sm font-bold text-foreground">{f.name.split(',')[0]}</div>
              {row ? (
                <div className="space-y-1">
                  {dayLine(t('favPanel.today'), row.today)}
                  {dayLine(t('favPanel.tomorrow'), row.tomorrow)}
                </div>
              ) : (
                <div className="space-y-1.5" aria-hidden>
                  <div className="h-3.5 w-full animate-pulse rounded bg-secondary" />
                  <div className="h-3.5 w-4/5 animate-pulse rounded bg-secondary" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
});
