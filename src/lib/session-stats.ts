export interface Snapshot {
  hour: string;
  wind_kn: number;
  gust_kn: number;
  dir_deg: number;
  dir_short: string;
  wave_m: number | null;
  temp: number | null;
}

export interface Session {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  location_name: string | null;
  location_lat: number | null;
  location_lon: number | null;
  weather_snapshot: Snapshot[] | null;
  material_1: string | null;
  material_2: string | null;
  material_3: string | null;
  material_4: string | null;
  tracking_url: string | null;
  notes: string | null;
}

export type PeriodMode = 'all' | 'year' | 'month' | 'range';

export interface PeriodFilter {
  mode: PeriodMode;
  year: number;
  month: number; // 0-11
  rangeFrom: string; // YYYY-MM-DD
  rangeTo: string; // YYYY-MM-DD
}

export const MONTH_LABELS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function availableYears(sessions: Session[], fallback: number): number[] {
  const years = new Set<number>();
  for (const s of sessions) {
    const y = parseInt(s.session_date.slice(0, 4), 10);
    if (!isNaN(y)) years.add(y);
  }
  if (years.size === 0) years.add(fallback);
  return [...years].sort((a, b) => b - a);
}

export function filterSessions(sessions: Session[], f: PeriodFilter): Session[] {
  switch (f.mode) {
    case 'all':
      return sessions;
    case 'year':
      return sessions.filter(s => s.session_date.slice(0, 4) === String(f.year));
    case 'month': {
      const ym = `${f.year}-${String(f.month + 1).padStart(2, '0')}`;
      return sessions.filter(s => s.session_date.slice(0, 7) === ym);
    }
    case 'range':
      return sessions.filter(s =>
        (!f.rangeFrom || s.session_date >= f.rangeFrom) &&
        (!f.rangeTo || s.session_date <= f.rangeTo)
      );
  }
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

export interface SessionStats {
  count: number;
  totalHours: number;
  avgWindKn: number | null;
  maxGustKn: number | null;
  topLocation: { name: string; count: number } | null;
  topMaterial: { name: string; count: number } | null;
}

function topEntry(counts: Map<string, number>): { name: string; count: number } | null {
  let best: { name: string; count: number } | null = null;
  for (const [name, count] of counts) {
    if (!best || count > best.count) best = { name, count };
  }
  return best;
}

export function computeStats(sessions: Session[]): SessionStats {
  let totalMinutes = 0;
  const windValues: number[] = [];
  const gustValues: number[] = [];
  const locationCounts = new Map<string, number>();
  const materialCounts = new Map<string, number>();

  for (const s of sessions) {
    const diff = timeToMinutes(s.end_time) - timeToMinutes(s.start_time);
    if (diff > 0) totalMinutes += diff;

    if (Array.isArray(s.weather_snapshot)) {
      for (const snap of s.weather_snapshot) {
        windValues.push(snap.wind_kn);
        gustValues.push(snap.gust_kn);
      }
    }

    const loc = s.location_name?.trim();
    if (loc) locationCounts.set(loc, (locationCounts.get(loc) || 0) + 1);

    for (const mat of [s.material_1, s.material_2, s.material_3, s.material_4]) {
      const name = mat?.trim();
      if (name) materialCounts.set(name, (materialCounts.get(name) || 0) + 1);
    }
  }

  return {
    count: sessions.length,
    totalHours: totalMinutes / 60,
    avgWindKn: windValues.length ? windValues.reduce((a, b) => a + b, 0) / windValues.length : null,
    maxGustKn: gustValues.length ? Math.max(...gustValues) : null,
    topLocation: topEntry(locationCounts),
    topMaterial: topEntry(materialCounts),
  };
}

export interface ChartBucket {
  label: string;
  count: number;
}

function ymLabel(ym: string): string {
  const [y, m] = ym.split('-');
  return `${MONTH_LABELS_ES[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}

export function buildChartBuckets(sessions: Session[], f: PeriodFilter): ChartBucket[] {
  if (f.mode === 'year') {
    const counts = new Array(12).fill(0);
    for (const s of sessions) {
      const m = parseInt(s.session_date.slice(5, 7), 10) - 1;
      if (m >= 0 && m < 12) counts[m]++;
    }
    return MONTH_LABELS_ES.map((label, i) => ({ label, count: counts[i] }));
  }

  if (f.mode === 'month') {
    const daysInMonth = new Date(f.year, f.month + 1, 0).getDate();
    const counts = new Array(daysInMonth).fill(0);
    for (const s of sessions) {
      const d = parseInt(s.session_date.slice(8, 10), 10) - 1;
      if (d >= 0 && d < daysInMonth) counts[d]++;
    }
    return counts.map((count, i) => ({ label: String(i + 1), count }));
  }

  if (f.mode === 'all') {
    const map = new Map<string, number>();
    for (const s of sessions) {
      const y = s.session_date.slice(0, 4);
      map.set(y, (map.get(y) || 0) + 1);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, count]) => ({ label, count }));
  }

  // range: zero-filled month buckets spanning rangeFrom..rangeTo when both are set,
  // otherwise fall back to whatever months actually appear in the filtered sessions
  if (f.rangeFrom && f.rangeTo) {
    const from = new Date(f.rangeFrom + 'T00:00:00');
    const to = new Date(f.rangeTo + 'T00:00:00');
    const buckets: ChartBucket[] = [];
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    const end = new Date(to.getFullYear(), to.getMonth(), 1);
    while (cursor <= end) {
      const ym = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      const count = sessions.filter(s => s.session_date.slice(0, 7) === ym).length;
      buckets.push({ label: ymLabel(ym), count });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return buckets;
  }

  const map = new Map<string, number>();
  for (const s of sessions) {
    const ym = s.session_date.slice(0, 7);
    map.set(ym, (map.get(ym) || 0) + 1);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([ym, count]) => ({ label: ymLabel(ym), count }));
}
