import { memo, useMemo } from 'react';
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
import { Radio, WifiOff } from 'lucide-react';
import { WindVane } from '@/components/WindVane';
import { useNow, useStationHistory } from '@/hooks/useStations';
import { useChartTheme } from '@/hooks/useChartTheme';
import { windColor, LANG_LOCALE } from '@/lib/weather-helpers';
import { useWindUnit, windFromKnots, windFromKmh, formatWind, WIND_UNIT_LABEL, convertKmh } from '@/lib/wind-units';
import { STATION_STALE_MIN, readingAgeMin, type Station, type StationReading } from '@/lib/stations';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface Props {
  station: Station;
  latest: StationReading | undefined;
  /** Forecast wind for the current hour, km/h (same series as the rest of the page) */
  forecastKmh: number | null;
}

const BUCKET_MS = 5 * 60 * 1000;

const KN_TO_KMH = 1.852;

export const LiveStationCard = memo(function LiveStationCard({ station, latest, forecastKmh }: Props) {
  const { t, i18n } = useTranslation();
  const locale = LANG_LOCALE[i18n.language] || 'es-ES';
  const unit = useWindUnit();
  const unitLabel = WIND_UNIT_LABEL[unit];
  const now = useNow();
  const history = useStationHistory(station.id);
  const { text, grid } = useChartTheme();

  const reading = useMemo(() => {
    // A reading can arrive through Realtime before the history query finishes
    const last = history[history.length - 1];
    if (!last) return latest;
    return !latest || new Date(last.recorded_at) > new Date(latest.recorded_at) ? last : latest;
  }, [history, latest]);

  const ageMin = reading ? readingAgeMin(reading, now) : Infinity;
  const online = !!reading && reading.wind_speed_kn !== null && ageMin <= STATION_STALE_MIN;

  const agoLabel = (min: number) => {
    const m = Math.floor(min);
    return m >= 90 ? t('station.agoHour', { n: Math.round(m / 60) }) : t('station.agoMin', { n: m });
  };

  const chart = useMemo(() => {
    const buckets = new Map<number, { sum: number; n: number; gust: number | null }>();
    for (const r of history) {
      if (r.wind_speed_kn === null) continue;
      const key = Math.floor(new Date(r.recorded_at).getTime() / BUCKET_MS) * BUCKET_MS;
      const b = buckets.get(key) ?? { sum: 0, n: 0, gust: null };
      b.sum += r.wind_speed_kn;
      b.n += 1;
      const g = r.wind_gust_kn ?? r.wind_speed_kn;
      b.gust = b.gust === null ? g : Math.max(b.gust, g);
      buckets.set(key, b);
    }
    const keys = [...buckets.keys()].sort((a, b) => a - b);
    const conv = (kn: number) => Math.round(convertKmh(kn * KN_TO_KMH, unit) * 10) / 10;
    return {
      labels: keys.map(k => new Date(k).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })),
      datasets: [
        {
          label: t('station.windSeries', { unit: unitLabel }),
          data: keys.map(k => conv(buckets.get(k)!.sum / buckets.get(k)!.n)),
          borderColor: '#00d4ff', backgroundColor: 'rgba(0,212,255,.08)',
          fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2,
        },
        {
          label: t('station.gustSeries', { unit: unitLabel }),
          data: keys.map(k => conv(buckets.get(k)!.gust ?? 0)),
          borderColor: '#ff8c00', borderDash: [5, 3],
          fill: false, tension: 0.35, pointRadius: 0, borderWidth: 1.4,
        },
      ],
    };
  }, [history, unit, unitLabel, locale, t]);

  const options = useMemo<ChartOptions<'line'>>(() => ({
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 2.6,
    plugins: {
      legend: { labels: { color: text, font: { family: 'JetBrains Mono', size: 10 }, boxWidth: 12 } },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: { ticks: { color: text, font: { size: 10 }, maxTicksLimit: 8 }, grid: { color: grid } },
      y: {
        beginAtZero: true,
        title: { display: true, text: unitLabel, color: text, font: { size: 9 } },
        ticks: { color: text, font: { size: 10 } },
        grid: { color: grid },
      },
    },
    interaction: { mode: 'index', intersect: false },
  }), [text, grid, unitLabel]);

  if (!reading) return null;

  const hasWind = reading.wind_speed_kn !== null;
  const speedKmh = (reading.wind_speed_kn ?? 0) * KN_TO_KMH;
  const accent = online ? windColor(speedKmh) : 'hsl(var(--muted-foreground))';
  const show = (kn: number | null) => (kn === null ? '—' : formatWind(windFromKnots(kn, unit), unit));

  return (
    <section
      className="mb-6 rounded-lg border border-border bg-card p-4"
      aria-label={t('station.title')}
    >
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <div className="flex items-center gap-1.5 font-display text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {online ? <Radio className="h-3 w-3 text-[#44cc88]" /> : <WifiOff className="h-3 w-3" />}
          {t('station.title')}
        </div>
        <span className="truncate text-xs text-muted-foreground">{station.name}</span>
        <span
          className={`ml-auto flex items-center gap-1.5 text-[0.65rem] ${online ? 'font-semibold text-[#44cc88]' : 'text-muted-foreground'}`}
          role="status"
        >
          {online && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#44cc88]" aria-hidden />}
          {online
            ? (ageMin < 1 ? t('station.now') : t('station.updated', { ago: agoLabel(ageMin) }))
            : t('station.offline')}
        </span>
      </div>

      <div className={`grid grid-cols-1 items-center gap-4 sm:grid-cols-[170px_1fr] ${online ? '' : 'opacity-60'}`}>
        <div className="mx-auto w-full max-w-[170px]">
          {reading.wind_dir_deg !== null && (
            <WindVane direction={reading.wind_dir_deg} color={accent} />
          )}
        </div>

        <div>
          <div className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">{t('station.wind')}</div>
          <div className="flex items-end gap-2">
            <span className="font-mono text-5xl font-bold leading-none" style={{ color: accent }}>
              {show(reading.wind_speed_kn)}
            </span>
            <span className="pb-1 text-sm text-muted-foreground">{unitLabel}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
            <span>
              <span className="text-[0.62rem] uppercase tracking-wider text-muted-foreground">{t('station.gust')} </span>
              <span className="font-mono font-bold" style={{ color: accent }}>{show(reading.wind_gust_kn)}</span>
              <span className="text-[0.62rem] text-muted-foreground"> {unitLabel}</span>
            </span>
            {online && forecastKmh !== null && hasWind && (
              <span className="text-xs text-muted-foreground">
                {t('station.vsForecast', {
                  real: formatWind(windFromKnots(reading.wind_speed_kn!, unit), unit),
                  forecast: formatWind(windFromKmh(forecastKmh, unit), unit),
                  unit: unitLabel,
                })}
              </span>
            )}
          </div>
          {!online && (
            <div className="mt-1 text-[0.65rem] text-muted-foreground">
              {t('station.lastSeen', { ago: agoLabel(ageMin) })}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[0.72rem] text-muted-foreground">
            {reading.temp_c !== null && (
              <span>{t('station.temp')} <span className="font-mono text-foreground">{reading.temp_c.toFixed(1)}°</span></span>
            )}
            {reading.rain_rate_mm !== null && (
              <span>{t('station.rain')} <span className="font-mono text-foreground">{reading.rain_rate_mm.toFixed(1)} mm/h</span></span>
            )}
            {reading.uv_index !== null && (
              <span>{t('station.uv')} <span className="font-mono text-foreground">{reading.uv_index.toFixed(0)}</span></span>
            )}
          </div>
        </div>
      </div>

      {chart.labels.length > 1 && (
        <div className="mt-4">
          <div className="mb-1.5 text-[0.6rem] uppercase tracking-widest text-muted-foreground">{t('station.chartTitle')}</div>
          <Line data={chart} options={options} />
        </div>
      )}
    </section>
  );
});
