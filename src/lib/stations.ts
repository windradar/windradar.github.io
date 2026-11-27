import type { Database } from '@/integrations/supabase/types';

// Older than this the station is shown as offline
export const STATION_STALE_MIN = 10;

export interface Station {
  id: string;
  name: string;
  lat: number;
  lon: number;
  /** A spot closer than this counts as the station's spot */
  radius_km: number;
  /** The app's home spot: loaded first and pinned first in the favourites panel */
  is_featured: boolean;
  /** Direction of the sea seen from the station, same convention as the vane */
  sea_bearing: number;
}

export type StationReading = Omit<Database['public']['Tables']['station_readings']['Row'], 'raw'>;

export const READING_COLUMNS =
  'id, station_id, recorded_at, wind_speed_kn, wind_gust_kn, wind_dir_deg, temp_c, humidity, rain_rate_mm, uv_index, pressure_hpa';

function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLon = (bLon - aLon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

export function nearestStation(stations: Station[], lat: number, lon: number): Station | null {
  let best: Station | null = null;
  let bestD = Infinity;
  for (const s of stations) {
    const d = distanceKm(lat, lon, s.lat, s.lon);
    if (d <= s.radius_km && d < bestD) { best = s; bestD = d; }
  }
  return best;
}

export const knToKmh = (kn: number): number => kn * 1.852;

export function readingAgeMin(reading: Pick<StationReading, 'recorded_at'>, now: number): number {
  return Math.max(0, (now - new Date(reading.recorded_at).getTime()) / 60000);
}

export function isFresh(reading: StationReading | undefined, now: number): reading is StationReading {
  return !!reading && reading.wind_speed_kn !== null && readingAgeMin(reading, now) <= STATION_STALE_MIN;
}
