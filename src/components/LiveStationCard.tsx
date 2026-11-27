import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
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
import { Maximize2, Radio, WifiOff } from 'lucide-react';
import { WindVane } from '@/components/WindVane';
import { useNow } from '@/hooks/useStations';
import { useChartTheme } from '@/hooks/useChartTheme';
import { windColor, LANG_LOCALE } from '@/lib/weather-helpers';
import { useWindUnit, windFromKnots, windFromKmh, formatWind, WIND_UNIT_LABEL, convertKmh } from '@/lib/wind-units';
import { STATION_STALE_MIN, knToKmh, readingAgeMin, type Station, type StationReading } from '@/lib/stations';
import {
  DIR_CLASS, DIR_KEY, TREND_ARROW, TREND_KEY, dayMax, directionStability, forecastAt, pressureChange3h, startOfLocalDay, windTrend,
  type DayStats, type ForecastPoint,
} from '@/lib/station-stats';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface Props {
  station: Station;
  latest: StationReading | undefined;
  /** Readings of the last 6 h, oldest first */
  history: StationReading[];
  /** Highest wind and gust since midnight, from the database */
  dayStats: DayStats | null;
  /** Forecast wind for the current hour, km/h (same series as the rest of the page) */
  forecastKmh: number | null;
  /** Hourly forecast wind of the spot, drawn over the real wind in the chart */
  forecast: ForecastPoint[];
}

const BUCKET_MS = 5 * 60 * 1000;

export const LiveStationCard = memo(function LiveStationCard({ station, latest, history, dayStats, forecastKmh, forecast }: Props) {
  const { t, i18n } = useTranslation();
  const locale = LANG_LOCALE[i18n.language] || 'es-ES';
  const unit = useWindUnit();
  const unitLabel = WIND_UNIT_LABEL[unit];
  const now = useNow();
  const { text, grid } = useChartTheme();

  const reading = useMemo(() => {
    // A reading can arrive through Realtime before the history query finishes
    const last = history[history.length - 1];
    if (!last) return latest;
    return !latest || new Date(last.recorded_at) > new Date(latest.recorded_at) ? last : latest;
  }, [history, latest]);

  const ageMin = reading ? readingAgeMin(reading, now) : Infinity;
  const online = !!reading && reading.wind_speed_kn !== null && ageMin <= STATION_STALE_MIN;

  const trend = useMemo(() => (online ? windTrend(history, now) : null), [history, now, online]);
  const dirStab = useMemo(() => (online ? directionStability(history, now) : null), [history, now, online]);
  const pressureDelta = useMemo(() => pressureChange3h(history, now), [history, now]);
  const dayTop = useMemo(
    () => dayMax(history, dayStats, startOfLocalDay(now)),
    [history, dayStats, now],
  );

  const agoLabel = (min: number) => {
    const m = Math.floor(min);
    return m >= 90 ? t('station.agoHour', { n: Math.round(m / 60) }) : t('station.agoMin', { n: m });
  };
  const clock = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

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
    const conv = (kn: number) => Math.round(convertKmh(knToKmh(kn), unit) * 10) / 10;
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
        {
          label: t('station.forecastSeries', { unit: unitLabel }),
          data: keys.map(k => {
            const kmh = forecastAt(forecast, k + BUCKET_MS / 2);
            return kmh === null ? null : Math.round(convertKmh(kmh, unit) * 10) / 10;
          }),
          borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,.08)',
          fill: false, tension: 0.35, pointRadius: 0, borderWidth: 2, spanGaps: false,
        },
      ],
    };
  }, [history, forecast, unit, unitLabel, locale, t]);

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
  const speedKmh = knToKmh(reading.wind_speed_kn ?? 0);
  const accent = online ? windColor(speedKmh) : 'hsl(var(--muted-foreground))';
  const show = (kn: number | null) => (kn === null ? '—' : formatWind(windFromKnots(kn, unit), unit));
  const pressureDrop = pressureDelta !== null && pressureDelta <= -3;

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
        <Link
          to="/live"
          className="text-muted-foreground transition-colors hover:text-primary"
          aria-label={t('station.openLive')}
          title={t('station.openLive')}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className={`grid grid-cols-1 items-center gap-4 sm:grid-cols-[170px_1fr] ${online ? '' : 'opacity-60'}`}>
        <div className="mx-auto w-full max-w-[170px]">
          {reading.wind_dir_deg !== null && (
            <WindVane direction={reading.wind_dir_deg} color={accent} />
          )}
        </div>

        <div>
          <div className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">{t('station.wind')}</div>
          <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
            <span className="font-mono text-5xl font-bold leading-none" style={{ color: accent }}>
              {show(reading.wind_speed_kn)}
            </span>
            <span className="pb-1 text-sm text-muted-foreground">{unitLabel}</span>
            {trend && (
              <span className="pb-1 text-sm font-semibold text-foreground/80">
                {TREND_ARROW[trend]} {t(`station.${TREND_KEY[trend]}`)}
              </span>
            )}
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
          {dirStab && (
            <div className={`mt-1 text-xs font-semibold ${DIR_CLASS[dirStab.level]}`}>
              {t(`station.${DIR_KEY[dirStab.level]}`)}
              <span className="font-normal text-muted-foreground"> · {t('station.dirSpread', { deg: dirStab.sdDeg })}</span>
            </div>
          )}
          {dayTop && dayTop.windKn !== null && (
            <div className="mt-1 text-xs text-muted-foreground">
              {t('station.maxToday')}{' '}
              <span className="font-mono font-semibold text-foreground">{show(dayTop.windKn)} {unitLabel}</span>
              {dayTop.windAt && <> {t('station.at', { time: clock(dayTop.windAt) })}</>}
              {dayTop.gustKn !== null && (
                <>
                  {' · '}{t('station.gust').toLowerCase()}{' '}
                  <span className="font-mono font-semibold text-foreground">{show(dayTop.gustKn)} {unitLabel}</span>
                  {dayTop.gustAt && <> {t('station.at', { time: clock(dayTop.gustAt) })}</>}
                </>
              )}
            </div>
          )}
          {!online && (
            <div className="mt-1 text-[0.65rem] text-muted-foreground">
              {t('station.lastSeen', { ago: agoLabel(ageMin) })}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[0.72rem] text-muted-foreground">
            {reading.temp_c !== null && (
              <span>{t('station.temp')} <span className="font-mono text-foreground">{reading.temp_c.toFixed(1)}°</span></span>
            )}
            {reading.humidity !== null && (
              <span>{t('station.humidity')} <span className="font-mono text-foreground">{Math.round(reading.humidity)} %</span></span>
            )}
            {reading.rain_rate_mm !== null && (
              <span>{t('station.rain')} <span className="font-mono text-foreground">{reading.rain_rate_mm.toFixed(1)} mm/h</span></span>
            )}
            {reading.uv_index !== null && (
              <span>{t('station.uv')} <span className="font-mono text-foreground">{reading.uv_index.toFixed(0)}</span></span>
            )}
            {reading.pressure_hpa !== null && (
              <span>
                {t('station.pressure')} <span className="font-mono text-foreground">{Math.round(reading.pressure_hpa)} hPa</span>
                {pressureDelta !== null && (
                  <span className={pressureDrop ? 'font-semibold text-amber-500' : ''}>
                    {' '}{pressureDelta > 0 ? '↑' : pressureDelta < 0 ? '↓' : '→'} {Math.abs(pressureDelta).toFixed(1)}/3 h
                    {pressureDrop && <> · {t('station.pressureDrop')}</>}
                  </span>
                )}
              </span>
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
