-- Wind of one station over a stretch of time (the app asks for one local day) in
-- 15-minute buckets, aligned to p_from. Done in SQL because a day of 1-minute
-- readings is ~1440 rows and the API returns at most 1000 per request.

CREATE OR REPLACE FUNCTION public.station_day_series(p_station UUID, p_from TIMESTAMPTZ, p_to TIMESTAMPTZ)
RETURNS TABLE (
  bucket TIMESTAMPTZ,
  avg_wind_kn DOUBLE PRECISION,
  max_gust_kn DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    date_bin('15 minutes', recorded_at, p_from) AS bucket,
    avg(wind_speed_kn),
    max(wind_gust_kn)
  FROM public.station_readings
  WHERE station_id = p_station
    AND recorded_at >= greatest(p_from, now() - interval '91 days')
    AND recorded_at <  least(p_to, p_from + interval '2 days')
  GROUP BY 1
  ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION public.station_day_series(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated;
