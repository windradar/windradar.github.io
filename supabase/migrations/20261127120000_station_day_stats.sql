-- Highest average wind and highest gust of a station since a given time (the app
-- passes the start of the local day). Done in SQL because the API returns at most
-- 1000 rows per request and a day of 1-minute readings is ~1440.

CREATE OR REPLACE FUNCTION public.station_day_stats(p_station UUID, p_since TIMESTAMPTZ)
RETURNS TABLE (
  max_wind_kn DOUBLE PRECISION,
  max_wind_at TIMESTAMPTZ,
  max_gust_kn DOUBLE PRECISION,
  max_gust_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH r AS (
    SELECT recorded_at, wind_speed_kn, wind_gust_kn
    FROM public.station_readings
    WHERE station_id = p_station
      AND recorded_at >= greatest(p_since, now() - interval '2 days')
  )
  SELECT
    (SELECT wind_speed_kn FROM r WHERE wind_speed_kn IS NOT NULL ORDER BY wind_speed_kn DESC, recorded_at DESC LIMIT 1),
    (SELECT recorded_at   FROM r WHERE wind_speed_kn IS NOT NULL ORDER BY wind_speed_kn DESC, recorded_at DESC LIMIT 1),
    (SELECT wind_gust_kn  FROM r WHERE wind_gust_kn  IS NOT NULL ORDER BY wind_gust_kn  DESC, recorded_at DESC LIMIT 1),
    (SELECT recorded_at   FROM r WHERE wind_gust_kn  IS NOT NULL ORDER BY wind_gust_kn  DESC, recorded_at DESC LIMIT 1);
$$;

GRANT EXECUTE ON FUNCTION public.station_day_stats(UUID, TIMESTAMPTZ) TO anon, authenticated;
