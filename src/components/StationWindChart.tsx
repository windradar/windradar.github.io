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
import { useChartTheme } from '@/hooks/useChartTheme';
import { LANG_LOCALE } from '@/lib/weather-helpers';
import { WIND_UNIT_LABEL, convertKmh, useWindUnit } from '@/lib/wind-units';
import { knToKmh, type StationReading } from '@/lib/stations';
import { forecastAt, type ForecastPoint } from '@/lib/station-stats';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const BUCKET_MS = 5 * 60 * 1000;

interface Props {
  /** Readings of the last 6 h, oldest first */
  history: StationReading[];
  /** Hourly forecast wind of the spot, drawn over the real wind */
  forecast: ForecastPoint[];
  aspectRatio?: number;
  /** Larger text, for the full-screen view */
  big?: boolean;
}

// Mean wind, gusts and forecast of the last hours, in 5-minute steps
export const StationWindChart = memo(function StationWindChart({ history, forecast, aspectRatio = 2.6, big = false }: Props) {
  const { t, i18n } = useTranslation();
  const locale = LANG_LOCALE[i18n.language] || 'es-ES';
  const unit = useWindUnit();
  const unitLabel = WIND_UNIT_LABEL[unit];
  const { text, grid } = useChartTheme();

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
    aspectRatio,
    plugins: {
      legend: { labels: { color: text, font: { family: 'JetBrains Mono', size: big ? 14 : 10 }, boxWidth: 12 } },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: { ticks: { color: text, font: { size: big ? 13 : 10 }, maxTicksLimit: 8 }, grid: { color: grid } },
      y: {
        beginAtZero: true,
        title: { display: true, text: unitLabel, color: text, font: { size: big ? 12 : 9 } },
        ticks: { color: text, font: { size: big ? 13 : 10 } },
        grid: { color: grid },
      },
    },
    interaction: { mode: 'index', intersect: false },
  }), [text, grid, unitLabel, aspectRatio, big]);

  if (chart.labels.length < 2) return null;
  return <Line data={chart} options={options} />;
});
