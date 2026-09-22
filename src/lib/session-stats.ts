export interface Snapshot {
  hour: string;
  wind_kn: number;
  gust_kn: number;
  dir_deg: number;
  dir_short: string;
  wave_m: number | null;
  temp: number | null;
}

export interface SessionMaterial {
  category_id: string;
  name: string;
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
  sport_name: string | null;
  materials: SessionMaterial[];
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

export const NO_SPORT_LABEL = 'Sin deporte';

function sportLabelOf(s: Session): string {
  return s.sport_name?.trim() || NO_SPORT_LABEL;
}

// Fixed, light/bright palette — colors read well on the app's dark background
// and stay stable for a given sport name (see sportColor below).
const SPORT_CHART_PALETTE = ['#00d4ff', '#4ade80', '#facc15', '#fb923c', '#f472b6', '#a78bfa', '#34d399', '#38bdf8'];
const NO_SPORT_COLOR = '#94a3b8';

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

// Deterministic: the same sport name always maps to the same color,
// regardless of which other sports are visible in the current period.
export function sportColor(label: string): string {
  if (label === NO_SPORT_LABEL) return NO_SPORT_COLOR;
  return SPORT_CHART_PALETTE[hashString(label) % SPORT_CHART_PALETTE.length];
}

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

export interface BreakdownRow {
  label: string;
  value: number;
}

export interface SessionStats {
  count: number;
  hoursBySport: BreakdownRow[]; // value = hours
  sessionsBySport: BreakdownRow[]; // value = session count
  hoursByMaterial: BreakdownRow[]; // value = hours
}

function toSortedRows(map: Map<string, number>): BreakdownRow[] {
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function computeStats(sessions: Session[]): SessionStats {
  const hoursBySport = new Map<string, number>();
  const sessionsBySport = new Map<string, number>();
  const hoursByMaterial = new Map<string, number>();

  for (const s of sessions) {
    const diff = timeToMinutes(s.end_time) - timeToMinutes(s.start_time);
    const hours = diff > 0 ? diff / 60 : 0;
    const sportLabel = sportLabelOf(s);
    hoursBySport.set(sportLabel, (hoursBySport.get(sportLabel) || 0) + hours);
    sessionsBySport.set(sportLabel, (sessionsBySport.get(sportLabel) || 0) + 1);

    for (const mat of s.materials) {
      const name = mat.name?.trim();
      if (!name) continue;
      hoursByMaterial.set(name, (hoursByMaterial.get(name) || 0) + hours);
    }
  }

  return {
    count: sessions.length,
    hoursBySport: toSortedRows(hoursBySport),
    sessionsBySport: toSortedRows(sessionsBySport),
    hoursByMaterial: toSortedRows(hoursByMaterial),
  };
}

export interface ChartBucket {
  label: string;
  bySport: Record<string, number>;
}

function ymLabel(ym: string): string {
  const [y, m] = ym.split('-');
  return `${MONTH_LABELS_ES[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}

function addToBucket(bucket: Record<string, number>, sportLabel: string) {
  bucket[sportLabel] = (bucket[sportLabel] || 0) + 1;
}

export function buildChartBuckets(sessions: Session[], f: PeriodFilter): ChartBucket[] {
  if (f.mode === 'year') {
    const buckets: Record<string, number>[] = Array.from({ length: 12 }, () => ({}));
    for (const s of sessions) {
      const m = parseInt(s.session_date.slice(5, 7), 10) - 1;
      if (m >= 0 && m < 12) addToBucket(buckets[m], sportLabelOf(s));
    }
    return MONTH_LABELS_ES.map((label, i) => ({ label, bySport: buckets[i] }));
  }

  if (f.mode === 'month') {
    const daysInMonth = new Date(f.year, f.month + 1, 0).getDate();
    const buckets: Record<string, number>[] = Array.from({ length: daysInMonth }, () => ({}));
    for (const s of sessions) {
      const d = parseInt(s.session_date.slice(8, 10), 10) - 1;
      if (d >= 0 && d < daysInMonth) addToBucket(buckets[d], sportLabelOf(s));
    }
    return buckets.map((bySport, i) => ({ label: String(i + 1), bySport }));
  }

  if (f.mode === 'all') {
    const map = new Map<string, Record<string, number>>();
    for (const s of sessions) {
      const y = s.session_date.slice(0, 4);
      if (!map.has(y)) map.set(y, {});
      addToBucket(map.get(y)!, sportLabelOf(s));
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, bySport]) => ({ label, bySport }));
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
      const bySport: Record<string, number> = {};
      for (const s of sessions) {
        if (s.session_date.slice(0, 7) === ym) addToBucket(bySport, sportLabelOf(s));
      }
      buckets.push({ label: ymLabel(ym), bySport });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return buckets;
  }

  const map = new Map<string, Record<string, number>>();
  for (const s of sessions) {
    const ym = s.session_date.slice(0, 7);
    if (!map.has(ym)) map.set(ym, {});
    addToBucket(map.get(ym)!, sportLabelOf(s));
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([ym, bySport]) => ({ label: ymLabel(ym), bySport }));
}
