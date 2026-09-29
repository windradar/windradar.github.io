interface Hourly {
  time: string[];
  wind_speed_10m: (number | null)[];
  wind_gusts_10m: (number | null)[];
  wind_direction_10m: (number | null)[];
}

export type DayWindow =
  | { kind: 'window'; start: string; end: string; minKmh: number; maxKmh: number; gustKmh: number; dirDeg: number }
  | { kind: 'none'; maxKmh: number; maxAt: string };

const minutes = (t: string) => Number(t.slice(11, 13)) * 60 + Number(t.slice(14, 16));
const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

function circularMean(degs: number[]): number {
  const s = degs.reduce((a, d) => a + Math.sin((d * Math.PI) / 180), 0);
  const c = degs.reduce((a, d) => a + Math.cos((d * Math.PI) / 180), 0);
  return (((Math.atan2(s, c) * 180) / Math.PI) + 360) % 360;
}

/**
 * Longest run of consecutive slots with wind >= threshold among `idxs`
 * (ties: higher average wind). `end` is when the last slot finishes.
 */
export function findBestWindow(h: Hourly, idxs: number[], thresholdKn: number): DayWindow | null {
  if (!idxs.length) return null;
  const thresholdKmh = thresholdKn * 1.852;
  const step = idxs.length > 1 ? minutes(h.time[idxs[1]]) - minutes(h.time[idxs[0]]) : 60;

  // Object holder: TS does not track assignments made inside the closure
  const top: { idxs: number[] | null; avg: number } = { idxs: null, avg: 0 };
  let run: number[] = [];
  const closeRun = () => {
    if (!run.length) return;
    const avg = run.reduce((a, i) => a + (h.wind_speed_10m[i] ?? 0), 0) / run.length;
    if (!top.idxs || run.length > top.idxs.length || (run.length === top.idxs.length && avg > top.avg)) {
      top.idxs = run;
      top.avg = avg;
    }
    run = [];
  };

  for (let k = 0; k < idxs.length; k++) {
    const i = idxs[k];
    const contiguous = k === 0 || minutes(h.time[i]) - minutes(h.time[idxs[k - 1]]) === step;
    if (!contiguous) closeRun();
    if ((h.wind_speed_10m[i] ?? 0) >= thresholdKmh) run.push(i);
    else closeRun();
  }
  closeRun();

  const w = top.idxs;
  if (!w) {
    let maxI = idxs[0];
    for (const i of idxs) if ((h.wind_speed_10m[i] ?? 0) > (h.wind_speed_10m[maxI] ?? 0)) maxI = i;
    return { kind: 'none', maxKmh: h.wind_speed_10m[maxI] ?? 0, maxAt: h.time[maxI].slice(11, 16) };
  }

  const speeds = w.map(i => h.wind_speed_10m[i] ?? 0);
  return {
    kind: 'window',
    start: h.time[w[0]].slice(11, 16),
    end: hhmm(minutes(h.time[w[w.length - 1]]) + step),
    minKmh: Math.min(...speeds),
    maxKmh: Math.max(...speeds),
    gustKmh: Math.max(...w.map(i => h.wind_gusts_10m[i] ?? 0)),
    dirDeg: circularMean(w.map(i => h.wind_direction_10m[i] ?? 0)),
  };
}
