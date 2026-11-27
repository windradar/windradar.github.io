import type { StationReading } from '@/lib/stations';

export interface DayStats {
  windKn: number | null;
  windAt: string | null;
  gustKn: number | null;
  gustAt: string | null;
}

export type Trend = 'up' | 'down' | 'steady';

export const TREND_ARROW: Record<Trend, string> = { up: '↗', down: '↘', steady: '→' };
export const TREND_KEY: Record<Trend, string> = { up: 'trendUp', down: 'trendDown', steady: 'trendSteady' };

// Change in the mean wind (kn) between the last 10 minutes and minutes 20-30 ago
// needed to call it rising or falling
const TREND_KN = 2;
const MIN_SAMPLES = 3;

export function meanWind(rows: StationReading[], now: number, fromMin: number, toMin: number): number | null {
  let sum = 0;
  let n = 0;
  for (const r of rows) {
    if (r.wind_speed_kn === null) continue;
    const age = (now - new Date(r.recorded_at).getTime()) / 60000;
    if (age >= fromMin && age < toMin) { sum += r.wind_speed_kn; n++; }
  }
  return n >= MIN_SAMPLES ? sum / n : null;
}

/** Rising / falling / steady wind, or null when there are not enough readings */
export function windTrend(history: StationReading[], now: number): Trend | null {
  const recent = meanWind(history, now, 0, 10);
  const before = meanWind(history, now, 20, 30);
  if (recent === null || before === null) return null;
  const diff = recent - before;
  return diff >= TREND_KN ? 'up' : diff <= -TREND_KN ? 'down' : 'steady';
}

const THREE_H = 3 * 3600 * 1000;
const PRESSURE_TOLERANCE = 20 * 60 * 1000;

/** Pressure now minus pressure about 3 h ago (hPa), or null without a reading near that time */
export function pressureChange3h(history: StationReading[], now: number): number | null {
  let latest: StationReading | null = null;
  for (const r of history) {
    if (r.pressure_hpa !== null && (!latest || r.recorded_at > latest.recorded_at)) latest = r;
  }
  if (!latest) return null;
  const target = new Date(latest.recorded_at).getTime() - THREE_H;
  let ref: StationReading | null = null;
  let refD = PRESSURE_TOLERANCE;
  for (const r of history) {
    if (r.pressure_hpa === null) continue;
    const d = Math.abs(new Date(r.recorded_at).getTime() - target);
    if (d <= refD) { ref = r; refD = d; }
  }
  // A reading that is itself stale says nothing about "now"
  if (!ref || now - new Date(latest.recorded_at).getTime() > 30 * 60 * 1000) return null;
  return Math.round((latest.pressure_hpa! - ref.pressure_hpa!) * 10) / 10;
}

export function startOfLocalDay(now = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Day maxima: the SQL result (whole day) topped up with the readings already in memory */
export function dayMax(history: StationReading[], stats: DayStats | null, since: number): DayStats | null {
  let { windKn, windAt, gustKn, gustAt } = stats ?? { windKn: null, windAt: null, gustKn: null, gustAt: null };
  for (const r of history) {
    if (new Date(r.recorded_at).getTime() < since) continue;
    if (r.wind_speed_kn !== null && (windKn === null || r.wind_speed_kn > windKn)) {
      windKn = r.wind_speed_kn; windAt = r.recorded_at;
    }
    if (r.wind_gust_kn !== null && (gustKn === null || r.wind_gust_kn > gustKn)) {
      gustKn = r.wind_gust_kn; gustAt = r.recorded_at;
    }
  }
  return windKn === null && gustKn === null ? null : { windKn, windAt, gustKn, gustAt };
}

export interface ForecastPoint {
  /** Epoch ms of the forecast hour */
  t: number;
  /** Mean wind, km/h */
  kmh: number;
}

// Forecast steps further apart than this are not bridged (a missing stretch of data)
const MAX_FORECAST_GAP = 3 * 3600 * 1000;

/** Forecast wind at time t (km/h), interpolated between the hourly points, or null outside them */
export function forecastAt(points: ForecastPoint[], t: number): number | null {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (t < a.t || t > b.t) continue;
    if (b.t - a.t > MAX_FORECAST_GAP) return null;
    return b.t === a.t ? a.kmh : a.kmh + ((b.kmh - a.kmh) * (t - a.t)) / (b.t - a.t);
  }
  return null;
}

export type DirLevel = 'stable' | 'variable' | 'unstable';

export const DIR_KEY: Record<DirLevel, string> = { stable: 'dirStable', variable: 'dirVariable', unstable: 'dirUnstable' };
export const DIR_CLASS: Record<DirLevel, string> = {
  stable: 'text-[#44cc88]',
  variable: 'text-amber-500',
  unstable: 'text-destructive',
};

// Below this the direction of a light breeze moves around on its own: it says nothing
const DIR_MIN_WIND_KN = 3;
const DIR_WINDOW_MIN = 15;
const DIR_MIN_SAMPLES = 5;
const DIR_VARIABLE_DEG = 12;
const DIR_UNSTABLE_DEG = 25;

/**
 * How much the direction swings over the last 15 minutes: circular standard deviation
 * of the readings with some wind. null when there is too little wind or too few readings.
 */
export function directionStability(history: StationReading[], now: number): { level: DirLevel; sdDeg: number } | null {
  let sin = 0;
  let cos = 0;
  let n = 0;
  for (const r of history) {
    if (r.wind_dir_deg === null || r.wind_speed_kn === null || r.wind_speed_kn < DIR_MIN_WIND_KN) continue;
    const age = (now - new Date(r.recorded_at).getTime()) / 60000;
    if (age < 0 || age > DIR_WINDOW_MIN) continue;
    const rad = (r.wind_dir_deg * Math.PI) / 180;
    sin += Math.sin(rad);
    cos += Math.cos(rad);
    n++;
  }
  if (n < DIR_MIN_SAMPLES) return null;
  const R = Math.min(1, Math.hypot(sin / n, cos / n));
  const sdDeg = R <= 0 ? 180 : Math.min(180, (Math.sqrt(-2 * Math.log(R)) * 180) / Math.PI);
  const level: DirLevel = sdDeg >= DIR_UNSTABLE_DEG ? 'unstable' : sdDeg >= DIR_VARIABLE_DEG ? 'variable' : 'stable';
  return { level, sdDeg: Math.round(sdDeg) };
}
