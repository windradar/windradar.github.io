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
import { memo, useMemo } from 'react';
import { useChartTheme, type ChartTheme } from '@/hooks/useChartTheme';
import { Line, Bar } from 'react-chartjs-2';
import type { WeatherData, MarineData } from '@/lib/weather-helpers';
import { waveColor, localDateStr } from '@/lib/weather-helpers';
import { useWindUnit, convertKmh, WIND_UNIT_LABEL, type WindUnit } from '@/lib/wind-units';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const CHART_SLOTS = 96; // 4 days hourly

interface Props {
  wx: WeatherData;
  mar: MarineData | null;
  wxDetail?: WeatherData | null;
}

function buildOpts({ text, grid }: ChartTheme) {
  return {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { labels: { color: text, font: { family: 'JetBrains Mono', size: 11 }, boxWidth: 12 } }
    },
    scales: {
      x: { ticks: { color: text, font: { size: 10 }, maxTicksLimit: 12 }, grid: { color: grid } },
      y: { ticks: { color: text, font: { size: 10 } }, grid: { color: grid } }
    }
  };
}

// Stable data objects: react-chartjs-2 updates the chart whenever `data` changes identity
function buildChartData(wx: WeatherData, mar: MarineData | null, wxDetail: WeatherData | null | undefined, today: string, unit: WindUnit) {
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

    wsKn.push(wsRaw != null ? Math.round(convertKmh(wsRaw, unit) * 10) / 10 : null);
    wgKn.push(wgRaw != null ? Math.round(convertKmh(wgRaw, unit) * 10) / 10 : null);
    temp.push(tRaw);
    wv.push(marI >= 0 ? (mar!.hourly.wave_height[marI] ?? null) : null);
    sst.push(marI >= 0 ? (mar!.hourly.sea_surface_temperature[marI] ?? null) : null);
  });

  return {
    hasArome,
    wind: {
      labels: labs,
      datasets: [
        { label: `Viento (${WIND_UNIT_LABEL[unit]})`, data: wsKn, borderColor: '#00d4ff', backgroundColor: 'rgba(0,212,255,.07)', fill: true, tension: .4, pointRadius: 0, borderWidth: 2 },
        { label: `Ráfagas (${WIND_UNIT_LABEL[unit]})`, data: wgKn, borderColor: '#ff8c00', backgroundColor: 'rgba(255,140,0,.04)', fill: false, tension: .4, pointRadius: 0, borderWidth: 1.5, borderDash: [5, 3] }
      ]
    },
    waves: {
      labels: labs,
      datasets: [{
        label: 'Ola (m)',
        data: wv,
        backgroundColor: wv.map(v => waveColor(v || 0) + '99'),
        borderColor: wv.map(v => waveColor(v || 0)),
        borderWidth: 1
      }]
    },
    temps: {
      labels: labs,
      datasets: [
        { label: 'Aire °C', data: temp, borderColor: '#ffcc44', backgroundColor: 'rgba(255,204,68,.07)', fill: true, tension: .4, pointRadius: 0, borderWidth: 2 },
        { label: 'Agua °C', data: sst, borderColor: '#4dd9ff', backgroundColor: 'rgba(77,217,255,.06)', fill: true, tension: .4, pointRadius: 0, borderWidth: 2 }
      ]
    },
  };
}

export const WindCharts = memo(function WindCharts({ wx, mar, wxDetail }: Props) {
  const today = localDateStr(new Date());
  const unit = useWindUnit();
  const chartTheme = useChartTheme();
  const { lineOpts, barOpts } = useMemo(() => {
    const opts = buildOpts(chartTheme);
    return { lineOpts: opts as ChartOptions<'line'>, barOpts: opts as ChartOptions<'bar'> };
  }, [chartTheme]);
  const charts = useMemo(() => buildChartData(wx, mar, wxDetail, today, unit), [wx, mar, wxDetail, today, unit]);
  if (!charts) return null;

  const windTitle = charts.hasArome
    ? `💨 Viento y ráfagas (${WIND_UNIT_LABEL[unit]}) · AROME HD días 1-2 · Seamless días 3-4`
    : `💨 Viento y ráfagas (${WIND_UNIT_LABEL[unit]}) · 4 días`;

  return (
    <>
      <div className="rounded-lg border border-border bg-card p-4 col-span-full">
        <div className="mb-3 text-[0.62rem] uppercase tracking-widest text-muted-foreground">{windTitle}</div>
        <Line
          data={charts.wind}
          options={lineOpts}
        />
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 text-[0.62rem] uppercase tracking-widest text-muted-foreground">🌊 Altura de ola (m)</div>
        <Bar
          data={charts.waves}
          options={barOpts}
        />
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 text-[0.62rem] uppercase tracking-widest text-muted-foreground">🌡️ Temperatura aire / agua (°C)</div>
        <Line
          data={charts.temps}
          options={lineOpts}
        />
      </div>
    </>
  );
});
