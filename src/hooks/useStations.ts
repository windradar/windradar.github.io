import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { READING_COLUMNS, type Station, type StationReading } from '@/lib/stations';
import { startOfLocalDay, type DayStats } from '@/lib/station-stats';

export interface LiveStations {
  stations: Station[];
  latest: Record<string, StationReading>;
  /** True once the station list has been fetched (even if empty or failed) */
  loaded: boolean;
}

const EMPTY: LiveStations = { stations: [], latest: {}, loaded: false };
const POLL_MS = 60000;

// Re-render every so often so "updated X min ago" and the offline state stay true
// between readings
export function useNow(intervalMs = 30000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function newer(a: StationReading | undefined, b: StationReading): StationReading {
  return !a || new Date(b.recorded_at) > new Date(a.recorded_at) ? b : a;
}

/** Active stations plus the latest reading of each, kept current through Realtime */
export function useLiveStations(): LiveStations {
  const [state, setState] = useState<LiveStations>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const { data: rows, error } = await supabase
          .from('stations_public').select('id, name, lat, lon, radius_km, is_featured');
        if (cancelled) return;
        const stations = (error || !rows ? [] : rows).filter(
          r => r.id && r.name && r.lat !== null && r.lon !== null && r.radius_km !== null,
        ) as Station[];
        // Spots load only once this is known, so it has to be set even with no stations
        setState({ stations, latest: {}, loaded: true });
        if (!stations.length) return;

        const fetchLatest = async () => {
          const out: Record<string, StationReading> = {};
          await Promise.all(stations.map(async s => {
            const { data } = await supabase
              .from('station_readings').select(READING_COLUMNS)
              .eq('station_id', s.id).order('recorded_at', { ascending: false }).limit(1);
            if (data?.[0]) out[s.id] = data[0];
          }));
          return out;
        };
        const latest = await fetchLatest();
        if (cancelled) return;
        setState({ stations, latest, loaded: true });

        // Fallback in case Realtime does not deliver: the station uploads every minute
        const poll = setInterval(async () => {
          try {
            const fresh = await fetchLatest();
            if (cancelled) return;
            setState(prev => {
              const merged = { ...prev.latest };
              for (const [id, r] of Object.entries(fresh)) merged[id] = newer(merged[id], r);
              return { ...prev, latest: merged };
            });
          } catch { /* next tick */ }
        }, POLL_MS);

        const ids = new Set(stations.map(s => s.id));
        const channel = supabase
          .channel('station-latest')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'station_readings' }, payload => {
            const r = payload.new as StationReading;
            if (!ids.has(r.station_id)) return;
            setState(prev => ({ ...prev, latest: { ...prev.latest, [r.station_id]: newer(prev.latest[r.station_id], r) } }));
          })
          .subscribe();
        cleanup = () => { clearInterval(poll); supabase.removeChannel(channel); };
      } catch {
        // Offline or the station tables are not there yet: the app just shows nothing new
        if (!cancelled) setState(prev => (prev.loaded ? prev : { ...prev, loaded: true }));
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return state;
}

const HISTORY_MS = 6 * 3600 * 1000;

/** Readings of the last 6 hours for one station, oldest first, appended live through Realtime */
export function useStationHistory(stationId: string | null): StationReading[] {
  const [readings, setReadings] = useState<StationReading[]>([]);

  useEffect(() => {
    setReadings([]);
    if (!stationId) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const since = new Date(Date.now() - HISTORY_MS).toISOString();
        const { data } = await supabase
          .from('station_readings').select(READING_COLUMNS)
          .eq('station_id', stationId).gte('recorded_at', since)
          .order('recorded_at', { ascending: true }).limit(1000);
        if (cancelled) return;
        setReadings(data ?? []);

        const channel = supabase
          .channel(`station-history-${stationId}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'station_readings', filter: `station_id=eq.${stationId}` },
            payload => {
              const r = payload.new as StationReading;
              const cutoff = Date.now() - HISTORY_MS;
              setReadings(prev => {
                if (prev.some(p => p.id === r.id)) return prev;
                return [...prev, r].filter(p => new Date(p.recorded_at).getTime() >= cutoff);
              });
            },
          )
          .subscribe();

        // Fallback in case Realtime does not deliver
        const poll = setInterval(async () => {
          try {
            const from = new Date(Date.now() - 15 * 60 * 1000).toISOString();
            const { data: fresh } = await supabase
              .from('station_readings').select(READING_COLUMNS)
              .eq('station_id', stationId).gte('recorded_at', from)
              .order('recorded_at', { ascending: true });
            if (cancelled || !fresh?.length) return;
            setReadings(prev => {
              const have = new Set(prev.map(p => p.id));
              const add = fresh.filter(f => !have.has(f.id));
              if (!add.length) return prev;
              const cutoff = Date.now() - HISTORY_MS;
              return [...prev, ...add]
                .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
                .filter(p => new Date(p.recorded_at).getTime() >= cutoff);
            });
          } catch { /* next tick */ }
        }, POLL_MS);
        cleanup = () => { clearInterval(poll); supabase.removeChannel(channel); };
      } catch {
        // Same as above: nothing new is shown
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [stationId]);

  return readings;
}

/** Highest wind and gust since local midnight (SQL function), refreshed every 5 min */
export function useStationDayStats(stationId: string | null): DayStats | null {
  const [stats, setStats] = useState<DayStats | null>(null);

  useEffect(() => {
    setStats(null);
    if (!stationId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await supabase.rpc('station_day_stats', {
          p_station: stationId,
          p_since: new Date(startOfLocalDay()).toISOString(),
        });
        const r = data?.[0];
        if (!cancelled && r) {
          setStats({ windKn: r.max_wind_kn, windAt: r.max_wind_at, gustKn: r.max_gust_kn, gustAt: r.max_gust_at });
        }
      } catch {
        // Without the function the 6 h of readings in memory still give a partial maximum
      }
    };
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [stationId]);

  return stats;
}
