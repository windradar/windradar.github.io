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
  type ChartOptions,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import type { WeatherData, MarineData } from '@/lib/weather-helpers';
import { waveColor, localDateStr, kmhToKnots } from '@/lib/weather-helpers';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const CHART_SLOTS = 96; // 4 days hourly

interface Props {
  wx: WeatherData;
  mar: MarineData | null;
  wxDetail?: WeatherData | null;
}

export function WindCharts({ wx, mar, wxDetail }: Props) {
  const today = localDateStr(new Date());

  // Find start of today in seamless data (used as backbone for chart times)
  let seamlessStart = -1;
  for (let i = 0; i < wx.hourly.time.length; i++) {
    if (wx.hourly.time[i].slice(0, 10) === today) { seamlessStart = i; break; }
  }
  if (seamlessStart < 0) return null;

  // Seamless hourly time strings for 4 days (already in local timezone)
  const chartTimes = wx.hourly.time.slice(seamlessStart, seamlessStart + CHART_SLOTS);

  // AROME hour index: "YYYY-MM-DDTHH" → index of the :00 slot
  const aromeHourMap = new Map<string, number>();
  if (wxDetail) {
    for (let i = 0; i < wxDetail.hourly.time.length; i++) {
      if (wxDetail.hourly.time[i].slice(14, 16) === '00') {
        aromeHourMap.set(wxDetail.hourly.time[i].slice(0, 13), i);
      }
    }
  }

  // Marine index by hour prefix
  const marineHourMap = new Map<string, number>();
  mar?.hourly?.time?.forEach((t, i) => marineHourMap.set(t.slice(0, 13), i));

  const hasArome = aromeHourMap.size > 0;

  const labs = chartTimes.map(t => {
    if (!t) return '';
    const d = new Date(t);
    return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}h`;
  });

  // Build merged arrays: AROME where available (first 2 days), seamless for the rest
  const wsKn: (number | null)[] = [];
  const wgKn: (number | null)[] = [];
  const temp: (number | null)[] = [];
  const wv: (number | null)[] = [];
  const sst: (number | null)[] = [];

  chartTimes.forEach((t, i) => {
    const key = t.slice(0, 13);
    const seamlessI = seamlessStart + i;
    const aromeI = hasArome ? (aromeHourMap.get(key) ?? -1) : -1;
    const marI = marineHourMap.get(key) ?? -1;

    const wsRaw = aromeI >= 0
      ? (wxDetail!.hourly.wind_speed_10m[aromeI] ?? null)
      : (wx.hourly.wind_speed_10m[seamlessI] ?? null);
    const wgRaw = aromeI >= 0
      ? (wxDetail!.hourly.wind_gusts_10m[aromeI] ?? null)
      : (wx.hourly.wind_gusts_10m[seamlessI] ?? null);
    const tRaw = aromeI >= 0
      ? (wxDetail!.hourly.temperature_2m[aromeI] ?? null)
      : (wx.hourly.temperature_2m[seamlessI] ?? null);

    wsKn.push(wsRaw != null ? Math.round(kmhToKnots(wsRaw) * 10) / 10 : null);
    wgKn.push(wgRaw != null ? Math.round(kmhToKnots(wgRaw) * 10) / 10 : null);
    temp.push(tRaw);
    wv.push(marI >= 0 ? (mar!.hourly.wave_height[marI] ?? null) : null);
    sst.push(marI >= 0 ? (mar!.hourly.sea_surface_temperature[marI] ?? null) : null);
  });

  const baseOpts: ChartOptions<'line'> = {
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

  const windTitle = hasArome
    ? '💨 Viento y ráfagas (nudos) · AROME HD días 1-2 · Seamless días 3-4'
    : '💨 Viento y ráfagas (nudos) · 4 días';

  return (
    <>
      <div className="rounded-lg border border-border bg-card p-4 col-span-full">
        <div className="mb-3 text-[0.62rem] uppercase tracking-widest text-muted-foreground">{windTitle}</div>
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
