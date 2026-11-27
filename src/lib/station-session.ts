import { supabase } from '@/integrations/supabase/client';
import { nearestStation } from '@/lib/stations';
import { windInfo } from '@/lib/weather-helpers';
import type { Snapshot } from '@/lib/session-stats';

export interface StationFill {
  snapshot: Snapshot[];
  stationName: string | null;
  /** Hours of the snapshot replaced with real station data */
  applied: number;
}

/**
 * Replaces, hour by hour, the forecast values of a session snapshot with what the
 * station measured, when the session spot has a station nearby. Waves stay as they
 * are (the station does not measure them). Any failure leaves the snapshot untouched.
 */
export async function fillSnapshotFromStation(
  snapshot: Snapshot[],
  lat: number,
  lon: number,
  date: string,
): Promise<StationFill> {
  const untouched: StationFill = { snapshot, stationName: null, applied: 0 };
  try {
    const { data: rows, error } = await supabase
      .from('stations_public').select('id, name, lat, lon, radius_km, is_featured, sea_bearing');
    if (error || !rows?.length) return untouched;
    const stations = rows.filter(
      r => r.id && r.name && r.lat !== null && r.lon !== null && r.radius_km !== null,
    ) as { id: string; name: string; lat: number; lon: number; radius_km: number; is_featured: boolean; sea_bearing: number }[];
    const station = nearestStation(stations, lat, lon);
    if (!station) return untouched;

    const from = new Date(`${date}T00:00:00`);
    const to = new Date(from);
    to.setDate(to.getDate() + 1);
    const { data, error: rpcError } = await supabase.rpc('station_hours', {
      p_station: station.id, p_from: from.toISOString(), p_to: to.toISOString(),
    });
    if (rpcError || !data?.length) return { ...untouched, stationName: station.name };

    const byHour = new Map<string, (typeof data)[number]>();
    for (const row of data) {
      byHour.set(new Date(row.bucket).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), row);
    }

    let applied = 0;
    const filled = snapshot.map(s => {
      const real = byHour.get(s.hour);
      if (!real || real.avg_wind_kn === null) return s;
      applied++;
      const dir = real.dir_deg ?? s.dir_deg;
      return {
        ...s,
        wind_kn: Math.round(real.avg_wind_kn),
        gust_kn: Math.round(real.max_gust_kn ?? real.avg_wind_kn),
        dir_deg: Math.round(dir),
        dir_short: windInfo(dir).short,
        temp: real.avg_temp_c ?? s.temp,
        real: true,
      };
    });
    return { snapshot: filled, stationName: station.name, applied };
  } catch {
    return untouched;
  }
}
