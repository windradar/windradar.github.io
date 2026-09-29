export type WindSource = 'arome' | 'global';

export interface WindHour {
  speedKmh: number;
  gustKmh: number;
  dirDeg: number;
  source: WindSource;
}

export interface PointWind {
  lat: number;
  lon: number;
  hours: (WindHour | null)[];
}

export interface WindPointsResult {
  /** Local times of the first point ("YYYY-MM-DDTHH:00"), shared index for every point */
  times: string[];
  points: PointWind[];
}

const AROME = 'meteofrance_arome_france_hd';
const GLOBAL = 'best_match';
const CACHE_TTL = 30 * 60 * 1000;
const cache = new Map<string, { at: number; data: WindPointsResult }>();

type Hourly = Record<string, (number | null)[] | string[]>;

function pick(h: Hourly, variable: string, model: string, i: number): number | null {
  const arr = h[`${variable}_${model}`] as (number | null)[] | undefined;
  const v = arr?.[i];
  return v === undefined || v === null ? null : v;
}

/**
 * Hourly wind for today and tomorrow at each point, in one Open-Meteo request.
 * Both models are requested together: AROME HD (1.3 km) wherever it has data,
 * the global best_match model otherwise (outside its domain or missing hours).
 */
export async function fetchWindPoints(
  points: { lat: number; lon: number }[],
  signal?: AbortSignal,
): Promise<WindPointsResult> {
  if (!points.length) return { times: [], points: [] };
  const lats = points.map(p => p.lat.toFixed(3));
  const lons = points.map(p => p.lon.toFixed(3));
  const key = `${lats.join(',')}|${lons.join(',')}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.data;

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats.join(',')}&longitude=${lons.join(',')}`
    + `&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m&models=${AROME},${GLOBAL}`
    + '&wind_speed_unit=kmh&timezone=auto&forecast_days=2';
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const json = await res.json();
  const list = (Array.isArray(json) ? json : [json]) as { hourly: Hourly }[];

  const times = (list[0]?.hourly.time as string[]) ?? [];
  const result: WindPointsResult = {
    times,
    points: list.map((loc, k) => {
      const h = loc.hourly;
      const n = (h.time as string[]).length;
      const hours: (WindHour | null)[] = [];
      for (let i = 0; i < n; i++) {
        const aromeSpeed = pick(h, 'wind_speed_10m', AROME, i);
        const aromeDir = pick(h, 'wind_direction_10m', AROME, i);
        const model = aromeSpeed !== null && aromeDir !== null ? AROME : GLOBAL;
        const speed = pick(h, 'wind_speed_10m', model, i);
        const dir = pick(h, 'wind_direction_10m', model, i);
        hours.push(speed === null || dir === null ? null : {
          speedKmh: speed,
          gustKmh: pick(h, 'wind_gusts_10m', model, i) ?? speed,
          dirDeg: dir,
          source: model === AROME ? 'arome' : 'global',
        });
      }
      return { lat: points[k].lat, lon: points[k].lon, hours };
    }),
  };
  cache.set(key, { at: Date.now(), data: result });
  return result;
}

export interface Bounds { south: number; west: number; north: number; east: number }

/** Cell-centre points of a rows×cols grid covering the bounds */
export function gridPoints(b: Bounds, rows: number, cols: number): { lat: number; lon: number }[] {
  const pts: { lat: number; lon: number }[] = [];
  const dLat = (b.north - b.south) / rows;
  const dLon = (b.east - b.west) / cols;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Leaflet longitudes grow past ±180 when the world wraps; Open-Meteo wants -180..180
      const lon = ((b.west + (c + 0.5) * dLon + 540) % 360) - 180;
      pts.push({ lat: b.south + (r + 0.5) * dLat, lon });
    }
  }
  return pts;
}
