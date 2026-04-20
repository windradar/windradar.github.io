export const WIND_NAMES = [
  'Tramontana', 'Gregal NNE', 'Gregal', 'Gregal ENE',
  'Llevant', 'Xaloc ESE', 'Xaloc', 'Xaloc SSE',
  'Migjorn', 'Llebeig SSO', 'Llebeig', 'Llebeig OSO',
  'Ponent', 'Mestral ONO', 'Mestral', 'Tramontana NNO'
];
export const CARD16 = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'];

export function windInfo(deg: number) {
  const n = ((deg % 360) + 360) % 360;
  const i = Math.round(n / 22.5) % 16;
  return { short: CARD16[i], full: WIND_NAMES[i] };
}

export function kmhToKnots(kmh: number): number {
  return kmh / 1.852;
}

export function bft(kmh: number): [number, string, number] {
  const sc: [number, string, number][] = [
    [0,'Calma',2],[1,'Ventolina',6],[2,'Flojito',12],[3,'Flojo',20],
    [4,'Bonancible',29],[5,'Fresquito',39],[6,'Fresco',50],[7,'Frescachón',62],
    [8,'Temporal',75],[9,'Temporal F.',89],[10,'Temporal M.',103],[11,'Borrasca',118],[12,'Huracán',999]
  ];
  for (const s of sc) { if (kmh <= s[2]) return s; }
  return sc[12];
}

export function windColor(v: number): string {
  if (v < 10) return '#7bb8d8';
  if (v < 20) return '#44cc88';
  if (v < 35) return '#ffcc44';
  if (v < 50) return '#ff8c00';
  if (v < 65) return '#ff5533';
  return '#ff3366';
}

export function waveColor(v: number): string {
  if (v < 0.3) return '#7bb8d8';
  if (v < 0.8) return '#44cc88';
  if (v < 1.5) return '#ffcc44';
  if (v < 2.5) return '#ff8c00';
  return '#ff3366';
}

const ARROWS = ['↓','↙','←','↖','↑','↗','→','↘'];
export function dirArrow(deg: number): string {
  const n = ((deg % 360) + 360) % 360;
  return ARROWS[Math.round(n / 45) % 8];
}

export const WX_ICON: Record<number, string> = {
  0:'☀️', 1:'🌤️', 2:'⛅', 3:'☁️',
  45:'🌫️', 48:'🌫️',
  51:'🌦️', 53:'🌦️', 55:'🌧️',
  61:'🌧️', 63:'🌧️', 65:'🌧️',
  71:'🌨️', 73:'🌨️', 75:'❄️',
  80:'🌦️', 81:'🌧️', 82:'⛈️',
  95:'⛈️', 96:'⛈️', 99:'⛈️'
};

export const WX_DESC: Record<number, string> = {
  0:'Despejado', 1:'Casi despejado', 2:'Parcial nublado', 3:'Nublado',
  45:'Niebla', 48:'Niebla helada',
  51:'Llovizna débil', 53:'Llovizna mod.', 55:'Llovizna densa',
  61:'Lluvia débil', 63:'Lluvia mod.', 65:'Lluvia fuerte',
  71:'Nieve débil', 73:'Nieve mod.', 75:'Nieve fuerte',
  80:'Chubascos débiles', 81:'Chubascos mod.', 82:'Chubascos fuertes',
  95:'Tormenta', 96:'Tormenta+granizo', 99:'Tormenta fuerte'
};

export function safeNum(v: number | null | undefined, dec: number): string {
  if (v === null || v === undefined || isNaN(Number(v))) return '—';
  return Number(v).toFixed(dec);
}

export function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function humanDate(s: string): string {
  const d = new Date(s + 'T12:00:00');
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

export interface WeatherData {
  hourly: {
    time: string[];
    temperature_2m: number[];
    wind_speed_10m: number[];
    wind_gusts_10m: number[];
    wind_direction_10m: number[];
    precipitation: number[];
    weathercode: number[];
    cloud_cover: number[];
  };
}

export interface MarineData {
  hourly: {
    time: string[];
    wave_height: (number | null)[];
    wave_direction: (number | null)[];
    swell_wave_height: (number | null)[];
    sea_surface_temperature: (number | null)[];
  };
}

export interface SearchHistoryItem {
  name: string;
  lat: number;
  lon: number;
  timestamp: number;
}

export function getSearchHistory(): SearchHistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem('windradar_history') || '[]');
  } catch { return []; }
}

export function addToSearchHistory(item: Omit<SearchHistoryItem, 'timestamp'>) {
  const history = getSearchHistory().filter(h => !(h.lat === item.lat && h.lon === item.lon));
  history.unshift({ ...item, timestamp: Date.now() });
  localStorage.setItem('windradar_history', JSON.stringify(history.slice(0, 20)));
}

export function clearSearchHistory() {
  localStorage.removeItem('windradar_history');
}

// ===== FAVORITES =====
export interface FavoriteSpot {
  name: string;
  lat: number;
  lon: number;
  addedAt: number;
}

const FAV_KEY = 'windradar_favorites';

export function getFavorites(): FavoriteSpot[] {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
  } catch { return []; }
}

export function isFavorite(lat: number, lon: number): boolean {
  return getFavorites().some(f => Math.abs(f.lat - lat) < 1e-4 && Math.abs(f.lon - lon) < 1e-4);
}

export function toggleFavorite(item: Omit<FavoriteSpot, 'addedAt'>): boolean {
  try {
    const favs = getFavorites();
    const exists = favs.findIndex(f => Math.abs(f.lat - item.lat) < 1e-4 && Math.abs(f.lon - item.lon) < 1e-4);
    if (exists >= 0) {
      favs.splice(exists, 1);
      localStorage.setItem(FAV_KEY, JSON.stringify(favs));
      return false;
    }
    favs.unshift({ ...item, addedAt: Date.now() });
    localStorage.setItem(FAV_KEY, JSON.stringify(favs.slice(0, 30)));
    return true;
  } catch (e) {
    console.error('[favorites] toggle failed', e);
    return false;
  }
}

export function removeFavorite(lat: number, lon: number) {
  try {
    const favs = getFavorites().filter(f => !(Math.abs(f.lat - lat) < 1e-4 && Math.abs(f.lon - lon) < 1e-4));
    localStorage.setItem(FAV_KEY, JSON.stringify(favs));
  } catch (e) {
    console.error('[favorites] remove failed', e);
  }
}

// ===== LAST SEARCH =====
export interface LastSearch {
  name: string;
  lat: number;
  lon: number;
}
const LAST_KEY = 'windradar_last_search';

export function getLastSearch(): LastSearch | null {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setLastSearch(item: LastSearch) {
  localStorage.setItem(LAST_KEY, JSON.stringify(item));
}
