import { useState, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { kmhToKnots, localDateStr, humanDate } from '@/lib/weather-helpers';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface Props {
  lat: number;
  lon: number;
}

export function WindCompareChart({ lat, lon }: Props) {
  const [compareDate, setCompareDate] = useState('');
  const [compareData, setCompareData] = useState<any>(null);
  const [todayData, setTodayData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const today = localDateStr(new Date());
  const minDate = localDateStr(new Date(Date.now() - 7 * 86400000));

  const loadComparison = useCallback(async (selectedDate: string) => {
    if (!selectedDate || selectedDate === today) return;
    setLoading(true);
    setError('');
    try {
      const isPast = selectedDate < today;
      const compareUrl = isPast
        ? `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,wind_gusts_10m&wind_speed_unit=kmh&timezone=auto&start_date=${selectedDate}&end_date=${selectedDate}`
        : `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,wind_gusts_10m&wind_speed_unit=kmh&timezone=auto&start_date=${selectedDate}&end_date=${selectedDate}`;

      const todayUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,wind_gusts_10m&wind_speed_unit=kmh&timezone=auto&start_date=${today}&end_date=${today}`;

      const [cRes, tRes] = await Promise.all([
        fetch(compareUrl).then(r => r.json()),
        fetch(todayUrl).then(r => r.json()),
      ]);

      if (cRes.error) throw new Error(cRes.reason || 'Error');
      setCompareData(cRes);
      setTodayData(tRes);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [lat, lon, today]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = e.target.value;
    setCompareDate(d);
    if (d) loadComparison(d);
  };

  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

  const toKn = (arr: number[] | undefined) =>
    arr ? arr.slice(0, 24).map(v => v != null ? Math.round(kmhToKnots(v) * 10) / 10 : null) : new Array(24).fill(null);

  const baseOpts: any = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { labels: { color: '#4a6a8a', font: { family: 'JetBrains Mono', size: 10 }, boxWidth: 12 } },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: { ticks: { color: '#4a6a8a', font: { size: 8 }, maxTicksLimit: 12 }, grid: { color: 'rgba(26,46,72,.4)' } },
      y: {
        title: { display: true, text: 'Nudos (kn)', color: '#4a6a8a', font: { size: 9 } },
        ticks: { color: '#4a6a8a', font: { size: 9 } },
        grid: { color: 'rgba(26,46,72,.4)' },
      },
    },
    interaction: { mode: 'index', intersect: false },
  };

  const hasData = todayData && compareData;

  return (
    <div className="rounded-lg border border-border bg-card p-4 col-span-full">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="text-[0.62rem] uppercase tracking-widest text-muted-foreground">📊 Comparar viento</div>
        <div className="flex items-center gap-2">
          <label className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">Fecha a comparar:</label>
          <input
            type="date"
            value={compareDate}
            onChange={handleDateChange}
            min={minDate}
            max={localDateStr(new Date(Date.now() + 6 * 86400000))}
            className="rounded-md border border-border bg-secondary px-2 py-1 font-mono text-xs text-foreground outline-none focus:border-primary"
          />
        </div>
        {loading && <div className="h-4 w-4 rounded-full border-2 border-border border-t-primary animate-spin" />}
        {error && <span className="text-[0.6rem] text-destructive">{error}</span>}
      </div>

      {!hasData && !loading && (
        <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
          Selecciona una fecha para comparar con hoy ({humanDate(today)})
        </div>
      )}

      {hasData && (
        <Line
          data={{
            labels: hours,
            datasets: [
              {
                label: `Viento hoy (${humanDate(today)})`,
                data: toKn(todayData.hourly.wind_speed_10m),
                borderColor: '#00d4ff',
                backgroundColor: 'rgba(0,212,255,.07)',
                fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2,
              },
              {
                label: `Viento ${humanDate(compareDate)}`,
                data: toKn(compareData.hourly.wind_speed_10m),
                borderColor: '#ff8c00',
                backgroundColor: 'rgba(255,140,0,.07)',
                fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2,
              },
              {
                label: `Ráfagas hoy`,
                data: toKn(todayData.hourly.wind_gusts_10m),
                borderColor: '#00d4ff',
                borderDash: [5, 3],
                fill: false, tension: 0.4, pointRadius: 0, borderWidth: 1.2,
              },
              {
                label: `Ráfagas ${humanDate(compareDate)}`,
                data: toKn(compareData.hourly.wind_gusts_10m),
                borderColor: '#ff8c00',
                borderDash: [5, 3],
                fill: false, tension: 0.4, pointRadius: 0, borderWidth: 1.2,
              },
            ],
          }}
          options={baseOpts}
        />
      )}
    </div>
  );
}
