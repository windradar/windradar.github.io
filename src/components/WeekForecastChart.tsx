import { useMemo } from 'react';
import type { WeatherData, MarineData } from '@/lib/weather-helpers';
import { kmhToKnots, windColor, waveColor } from '@/lib/weather-helpers';

const SLOT_W = 20;
const BAR_H = 88;

interface Slot {
  time: string;
  windKn: number;
  gustKn: number;
  dir: number;
  wave: number | null;
}

export function WeekForecastChart({ wx, mar }: { wx: WeatherData; mar: MarineData | null }) {
  const h = wx.hourly;

  const slots: Slot[] = useMemo(() => {
    const result: Slot[] = [];
    for (let i = 0; i < h.time.length && result.length < 84; i++) {
      if (parseInt(h.time[i].slice(11, 13), 10) % 2 !== 0) continue;
      result.push({
        time: h.time[i],
        windKn: Math.round(kmhToKnots(h.wind_speed_10m[i] || 0)),
        gustKn: Math.round(kmhToKnots(h.wind_gusts_10m[i] || 0)),
        dir: h.wind_direction_10m[i] || 0,
        wave: mar?.hourly?.wave_height?.[i] ?? null,
      });
    }
    return result;
  }, [h, mar]);

  const dayGroups = useMemo(() => {
    const groups: { dateStr: string; startIdx: number; count: number }[] = [];
    slots.forEach((s, idx) => {
      const d = s.time.slice(0, 10);
      const last = groups[groups.length - 1];
      if (last && last.dateStr === d) { last.count++; }
      else { groups.push({ dateStr: d, startIdx: idx, count: 1 }); }
    });
    return groups;
  }, [slots]);

  if (!slots.length) return null;

  const maxVal = Math.max(...slots.map(s => s.gustKn), 15);
  const totalW = slots.length * SLOT_W;

  const gustPoints = slots
    .map((s, i) => `${i * SLOT_W + SLOT_W / 2},${BAR_H - Math.max(1, (s.gustKn / maxVal) * (BAR_H - 2))}`)
    .join(' ');

  const formatDay = (ds: string) => {
    const d = new Date(ds + 'T12:00:00');
    return d.toLocaleDateString('es', { weekday: 'short', day: 'numeric' });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center gap-4">
        <span className="text-[0.62rem] uppercase tracking-widest text-muted-foreground">
          🌬️ Previsión 7 días · cada 2h
        </span>
        <span className="flex items-center gap-2 text-[0.58rem] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-3.5 rounded-sm bg-[#44cc88] opacity-80" />
            Viento (kn)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-px w-4 bg-[#ff8c00]" style={{ borderTop: '2px solid #ff8c00' }} />
            Ráfaga
          </span>
        </span>
      </div>

      <div className="overflow-x-auto">
        <div style={{ width: totalW, minWidth: totalW }}>
          {/* Day labels */}
          <div className="flex" style={{ height: 17 }}>
            {dayGroups.map(dg => (
              <div
                key={dg.dateStr}
                style={{ width: dg.count * SLOT_W, flexShrink: 0 }}
                className="overflow-hidden border-l border-border/50 pl-0.5"
              >
                <span className="whitespace-nowrap text-[0.52rem] font-bold text-primary/80">
                  {formatDay(dg.dateStr)}
                </span>
              </div>
            ))}
          </div>

          {/* Wind bars + gust line */}
          <svg width={totalW} height={BAR_H} style={{ display: 'block' }}>
            {/* day separator lines */}
            {dayGroups.slice(1).map(dg => (
              <line
                key={dg.dateStr}
                x1={dg.startIdx * SLOT_W} y1={0}
                x2={dg.startIdx * SLOT_W} y2={BAR_H}
                stroke="rgba(100,120,150,0.25)" strokeWidth={1}
              />
            ))}
            {/* horizontal guides */}
            {[0.25, 0.5, 0.75, 1].map(f => (
              <line
                key={f}
                x1={0} y1={BAR_H - f * BAR_H}
                x2={totalW} y2={BAR_H - f * BAR_H}
                stroke="rgba(100,120,150,0.1)" strokeWidth={0.5}
              />
            ))}
            {/* scale labels */}
            {[0.5, 1].map(f => (
              <text
                key={f}
                x={2}
                y={BAR_H - f * BAR_H - 2}
                fontSize={6}
                fill="rgba(100,120,150,0.5)"
              >
                {Math.round(f * maxVal)}kn
              </text>
            ))}
            {/* wind bars */}
            {slots.map((s, i) => {
              const bh = Math.max(2, (s.windKn / maxVal) * BAR_H);
              return (
                <rect
                  key={i}
                  x={i * SLOT_W + 1}
                  y={BAR_H - bh}
                  width={SLOT_W - 2}
                  height={bh}
                  fill={windColor(s.windKn * 1.852)}
                  opacity={0.72}
                  rx={1}
                />
              );
            })}
            {/* wind speed labels above bars */}
            {slots.map((s, i) => {
              const bh = Math.max(2, (s.windKn / maxVal) * BAR_H);
              const y = BAR_H - bh - 2;
              return (
                <text
                  key={i}
                  x={i * SLOT_W + SLOT_W / 2}
                  y={y < 8 ? 8 : y}
                  textAnchor="middle"
                  fontSize={6}
                  className="fill-foreground/70"
                >
                  {s.windKn}
                </text>
              );
            })}
            {/* gust line */}
            <polyline
              points={gustPoints}
              fill="none"
              stroke="#ff8c00"
              strokeWidth={1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>

          {/* Wind direction arrows */}
          <div className="flex" style={{ height: 22 }}>
            {slots.map((s, i) => (
              <div
                key={i}
                style={{ width: SLOT_W, flexShrink: 0 }}
                className="flex items-center justify-center"
              >
                <svg width={13} height={13} viewBox="-6.5 -6.5 13 13">
                  <g transform={`rotate(${s.dir})`}>
                    <polygon points="0,-5.5 2.5,3 0,1.5 -2.5,3" fill="#60a5fa" />
                  </g>
                </svg>
              </div>
            ))}
          </div>

          {/* Wave heights */}
          <div className="flex" style={{ height: 14 }}>
            {slots.map((s, i) => (
              <div
                key={i}
                style={{ width: SLOT_W, flexShrink: 0 }}
                className="flex items-center justify-center"
              >
                {s.wave !== null ? (
                  <span
                    style={{ color: waveColor(s.wave), fontSize: '0.44rem' }}
                    className="font-mono leading-none"
                  >
                    {s.wave.toFixed(1)}
                  </span>
                ) : null}
              </div>
            ))}
          </div>

          {/* Hour labels at 00/06/12/18 */}
          <div className="flex" style={{ height: 12 }}>
            {slots.map((s, i) => {
              const hr = s.time.slice(11, 13);
              if (!['00', '06', '12', '18'].includes(hr)) {
                return <div key={i} style={{ width: SLOT_W, flexShrink: 0 }} />;
              }
              return (
                <div
                  key={i}
                  style={{ width: SLOT_W, flexShrink: 0 }}
                  className="flex justify-center items-center"
                >
                  <span className="text-[0.44rem] text-muted-foreground">{hr}h</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
