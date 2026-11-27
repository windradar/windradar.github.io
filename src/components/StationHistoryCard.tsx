import { memo, useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { ChevronDown, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useChartTheme } from '@/hooks/useChartTheme';
import { LANG_LOCALE, localDateStr } from '@/lib/weather-helpers';
import { WIND_UNIT_LABEL, convertKmh, formatWind, useWindUnit, windFromKmh } from '@/lib/wind-units';
import { knToKmh, type Station } from '@/lib/stations';
import { forecastAt, type ForecastPoint } from '@/lib/station-stats';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface SeriesRow {
  bucket: string;
  avg_wind_kn: number | null;
  max_gust_kn: number | null;
}

interface DayData {
  rows: SeriesRow[];
  forecast: ForecastPoint[];
}

const BUCKET_MS = 15 * 60 * 1000;
const DAY_MS = 86400000;

// One past day of a station: what it measured against what the forecast had promised
// for that day (Open-Meteo keeps the forecasts as they were issued)
export const StationHistoryCard = memo(function StationHistoryCard({ station }: { station: Station }) {
  const { t, i18n } = useTranslation();
  const locale = LANG_LOCALE[i18n.language] || 'es-ES';
  const unit = useWindUnit();
  const unitLabel = WIND_UNIT_LABEL[unit];
  const { text, grid } = useChartTheme();
  const dateId = useId();

  const yesterday = localDateStr(new Date(Date.now() - DAY_MS));
  const minDate = localDateStr(new Date(Date.now() - 90 * DAY_MS));
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(yesterday);
  const [data, setData] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open || !day) return;
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(false);
    setData(null);

    (async () => {
      try {
        const from = new Date(`${day}T00:00:00`);
        const to = new Date(from);
        to.setDate(to.getDate() + 1);

        const seriesReq = supabase.rpc('station_day_series', {
          p_station: station.id, p_from: from.toISOString(), p_to: to.toISOString(),
        });
        // The forecast is a bonus: if it fails the measured wind is still shown
        const forecastReq = fetch(
          `https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=${station.lat}&longitude=${station.lon}&start_date=${day}&end_date=${day}&hourly=wind_speed_10m,wind_speed_100m&wind_speed_unit=kmh&timezone=auto`,
          { signal: controller.signal },
        ).then(r => (r.ok ? r.json() : null)).catch(() => null);

        const [series, fc] = await Promise.all([seriesReq, forecastReq]);
        if (cancelled) return;
        if (series.error) throw series.error;

        const forecast: ForecastPoint[] = [];
        const h = fc?.hourly;
        if (h?.time) {
          for (let i = 0; i < h.time.length; i++) {
            // Same rule as the rest of the app: wind at 100 m, 10 m where there is none
            const kmh = h.wind_speed_100m?.[i] ?? h.wind_speed_10m?.[i];
            const ms = new Date(h.time[i]).getTime();
            if (kmh != null && Number.isFinite(ms)) forecast.push({ t: ms, kmh });
          }
        }
        setData({ rows: series.data ?? [], forecast: forecast.sort((a, b) => a.t - b.t) });
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, day, station.id, station.lat, station.lon]);

  const view = useMemo(() => {
    if (!data || !data.rows.length) return null;
    const conv = (kmh: number) => Math.round(convertKmh(kmh, unit) * 10) / 10;
    const times = data.rows.map(r => new Date(r.bucket).getTime());
    const avgKmh = data.rows.map(r => (r.avg_wind_kn === null ? null : knToKmh(r.avg_wind_kn)));
    const fcKmh = times.map(ms => forecastAt(data.forecast, ms + BUCKET_MS / 2));

    let errSum = 0;
    let errN = 0;
    avgKmh.forEach((v, i) => {
      const f = fcKmh[i];
      if (v !== null && f !== null) { errSum += Math.abs(v - f); errN++; }
    });
    const realMax = avgKmh.reduce<number | null>((m, v) => (v !== null && (m === null || v > m) ? v : m), null);
    const fcMax = data.forecast.length ? Math.max(...data.forecast.map(p => p.kmh)) : null;

    return {
      realMax,
      fcMax,
      mae: errN >= 4 ? errSum / errN : null,
      chart: {
        labels: times.map(ms => new Date(ms).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })),
        datasets: [
          {
            label: t('station.windSeries', { unit: unitLabel }),
            data: avgKmh.map(v => (v === null ? null : conv(v))),
            borderColor: '#00d4ff', backgroundColor: 'rgba(0,212,255,.08)',
            fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2,
          },
          {
            label: t('station.gustSeries', { unit: unitLabel }),
            data: data.rows.map(r => (r.max_gust_kn === null ? null : conv(knToKmh(r.max_gust_kn)))),
            borderColor: '#ff8c00', borderDash: [5, 3],
            fill: false, tension: 0.3, pointRadius: 0, borderWidth: 1.4,
          },
          {
            label: t('station.forecastSeries', { unit: unitLabel }),
            data: fcKmh.map(v => (v === null ? null : conv(v))),
            borderColor: '#a78bfa',
            fill: false, tension: 0.3, pointRadius: 0, borderWidth: 2,
          },
        ],
      },
    };
  }, [data, unit, unitLabel, locale, t]);

  const options = useMemo<ChartOptions<'line'>>(() => ({
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 2.4,
    plugins: {
      legend: { labels: { color: text, font: { family: 'JetBrains Mono', size: 10 }, boxWidth: 12 } },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: { ticks: { color: text, font: { size: 10 }, maxTicksLimit: 12 }, grid: { color: grid } },
      y: {
        beginAtZero: true,
        title: { display: true, text: unitLabel, color: text, font: { size: 9 } },
        ticks: { color: text, font: { size: 10 } },
        grid: { color: grid },
      },
    },
    interaction: { mode: 'index', intersect: false },
  }), [text, grid, unitLabel]);

  const fmt = (kmh: number) => formatWind(windFromKmh(kmh, unit), unit);

  return (
    <section className="mb-6 rounded-lg border border-border bg-card p-4" aria-label={t('station.histTitle')}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 font-display text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <History className="h-3 w-3" />
        {t('station.histTitle')}
        <span className="font-sans font-normal normal-case tracking-normal">· {station.name}</span>
        <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-3">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <label htmlFor={dateId} className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">
              {t('station.histDay')}
            </label>
            <input
              id={dateId}
              type="date"
              value={day}
              min={minDate}
              max={yesterday}
              onChange={e => e.target.value && setDay(e.target.value)}
              className="rounded-md border border-border bg-secondary px-2 py-1 font-mono text-xs text-foreground outline-none focus:border-primary"
            />
            {loading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />}
          </div>

          {error && <div role="alert" className="text-xs text-destructive">{t('station.histError')}</div>}

          {!loading && !error && data && !view && (
            <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">{t('station.histNoData')}</div>
          )}

          {view && (
            <>
              <div className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                {view.realMax !== null && (
                  <span>{t('station.histRealMax')} <span className="font-mono font-semibold text-foreground">{fmt(view.realMax)} {unitLabel}</span></span>
                )}
                {view.fcMax !== null && (
                  <span>{t('station.histForecastMax')} <span className="font-mono font-semibold text-foreground">{fmt(view.fcMax)} {unitLabel}</span></span>
                )}
                {view.mae !== null && (
                  <span>{t('station.histMae')} <span className="font-mono font-semibold text-foreground">{fmt(view.mae)} {unitLabel}</span></span>
                )}
              </div>
              <Line data={view.chart} options={options} />
            </>
          )}
        </div>
      )}
    </section>
  );
});
