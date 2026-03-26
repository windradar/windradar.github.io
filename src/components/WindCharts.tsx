import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import type { WeatherData, MarineData } from '@/lib/weather-helpers';
import { waveColor, localDateStr, kmhToKnots } from '@/lib/weather-helpers';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

interface Props {
  wx: WeatherData;
  mar: MarineData | null;
}

export function WindCharts({ wx, mar }: Props) {
  const h = wx.hourly;
  const times = h.time;
  const today = localDateStr(new Date());

  let s = -1;
  for (let i = 0; i < times.length; i++) {
    if (times[i].slice(0, 10) === today) { s = i; break; }
  }
  if (s < 0) return null;

  const sl = <T,>(arr: T[] | undefined): T[] => {
    if (!arr) return new Array(48).fill(null);
    return arr.slice(s, s + 48);
  };

  const labs = sl(times).map((t: any) => {
    if (!t) return '';
    const d = new Date(t);
    return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}h`;
  });

  const wsKmh = sl(h.wind_speed_10m);
  const wgKmh = sl(h.wind_gusts_10m);
  const wsKn = wsKmh.map(v => v != null ? Math.round(kmhToKnots(v) * 10) / 10 : null);
  const wgKn = wgKmh.map(v => v != null ? Math.round(kmhToKnots(v) * 10) / 10 : null);
  const wv = mar?.hourly ? sl(mar.hourly.wave_height) : new Array(48).fill(null);
  const temp = sl(h.temperature_2m);
  const sst = mar?.hourly ? sl(mar.hourly.sea_surface_temperature) : new Array(48).fill(null);

  const baseOpts: any = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { labels: { color: '#4a6a8a', font: { family: 'JetBrains Mono', size: 10 }, boxWidth: 12 } }
    },
    scales: {
      x: { ticks: { color: '#4a6a8a', font: { size: 8 }, maxTicksLimit: 12 }, grid: { color: 'rgba(26,46,72,.4)' } },
      y: { ticks: { color: '#4a6a8a', font: { size: 9 } }, grid: { color: 'rgba(26,46,72,.4)' } }
    }
  };

  return (
    <>
      <div className="rounded-lg border border-border bg-card p-4 col-span-full">
        <div className="mb-3 text-[0.62rem] uppercase tracking-widest text-muted-foreground">💨 Viento y ráfagas (nudos)</div>
        <Line
          data={{
            labels: labs,
            datasets: [
              { label: 'Viento (kn)', data: wsKn, borderColor: '#00d4ff', backgroundColor: 'rgba(0,212,255,.07)', fill: true, tension: .4, pointRadius: 0, borderWidth: 2 },
              { label: 'Ráfagas (kn)', data: wgKn, borderColor: '#ff8c00', backgroundColor: 'rgba(255,140,0,.04)', fill: false, tension: .4, pointRadius: 0, borderWidth: 1.5, borderDash: [5, 3] }
            ]
          }}
          options={baseOpts}
        />
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 text-[0.62rem] uppercase tracking-widest text-muted-foreground">🌊 Altura de ola (m)</div>
        <Bar
          data={{
            labels: labs,
            datasets: [{
              label: 'Ola (m)',
              data: wv,
              backgroundColor: (wv as (number | null)[]).map(v => waveColor(v || 0) + '99'),
              borderColor: (wv as (number | null)[]).map(v => waveColor(v || 0)),
              borderWidth: 1
            }]
          }}
          options={baseOpts}
        />
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 text-[0.62rem] uppercase tracking-widest text-muted-foreground">🌡️ Temperatura aire / agua (°C)</div>
        <Line
          data={{
            labels: labs,
            datasets: [
              { label: 'Aire °C', data: temp, borderColor: '#ffcc44', backgroundColor: 'rgba(255,204,68,.07)', fill: true, tension: .4, pointRadius: 0, borderWidth: 2 },
              { label: 'Agua °C', data: sst, borderColor: '#4dd9ff', backgroundColor: 'rgba(77,217,255,.06)', fill: true, tension: .4, pointRadius: 0, borderWidth: 2 }
            ]
          }}
          options={baseOpts}
        />
      </div>
    </>
  );
}
