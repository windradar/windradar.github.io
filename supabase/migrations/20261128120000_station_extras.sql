-- Station extras: sea bearing (offshore warning), hourly data for sessions, and the
-- aggregates behind the spot statistics (wind rose, days with wind).

-- Direction in degrees of the sea seen from the station (160 = south-south-east),
-- the same convention as the vane. Offshore wind blows towards it.
ALTER TABLE public.stations
  ADD COLUMN IF NOT EXISTS sea_bearing DOUBLE PRECISION NOT NULL DEFAULT 160
    CHECK (sea_bearing >= 0 AND sea_bearing < 360);

CREATE OR REPLACE VIEW public.stations_public AS
  SELECT id, name, lat, lon, is_active, radius_km, is_featured, sea_bearing
  FROM public.stations
  WHERE is_active;

-- Hourly wind, gust, temperature and mean direction over a range, aligned to p_from
-- (the app passes local midnight). Used to fill a session with the real wind.
CREATE OR REPLACE FUNCTION public.station_hours(p_station UUID, p_from TIMESTAMPTZ, p_to TIMESTAMPTZ)
RETURNS TABLE (
  bucket TIMESTAMPTZ,
  avg_wind_kn DOUBLE PRECISION,
  max_gust_kn DOUBLE PRECISION,
  avg_temp_c DOUBLE PRECISION,
  dir_deg DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    date_bin('1 hour', recorded_at, p_from) AS bucket,
    avg(wind_speed_kn),
    max(wind_gust_kn),
    avg(temp_c),
    (degrees(atan2(avg(sin(radians(wind_dir_deg))), avg(cos(radians(wind_dir_deg)))))::numeric + 360) % 360
  FROM public.station_readings
  WHERE station_id = p_station
    AND recorded_at >= greatest(p_from, now() - interval '91 days')
    AND recorded_at <  least(p_to, p_from + interval '2 days')
  GROUP BY 1
  ORDER BY 1;
$$;

-- Readings per direction sector (16 of 22.5 degrees, 0 = N) and speed class
-- (0: <5 kn, 1: 5-10, 2: 10-15, 3: 15-20, 4: 20+) over the last p_days days.
CREATE OR REPLACE FUNCTION public.station_wind_rose(p_station UUID, p_days INTEGER DEFAULT 90)
RETURNS TABLE (dir_bin INTEGER, speed_class INTEGER, samples BIGINT)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    (round(wind_dir_deg / 22.5)::int % 16) AS dir_bin,
    CASE
      WHEN wind_speed_kn < 5  THEN 0
      WHEN wind_speed_kn < 10 THEN 1
      WHEN wind_speed_kn < 15 THEN 2
      WHEN wind_speed_kn < 20 THEN 3
      ELSE 4
    END AS speed_class,
    count(*) AS samples
  FROM public.station_readings
  WHERE station_id = p_station
    AND recorded_at >= now() - make_interval(days => least(greatest(p_days, 1), 90))
    AND wind_dir_deg IS NOT NULL
    AND wind_speed_kn IS NOT NULL
    AND wind_speed_kn >= 1
  GROUP BY 1, 2;
$$;

-- One row per day (Europe/Madrid): mean and maximum wind, maximum gust and the
-- minutes with at least p_min_kn of wind. A reading is one minute.
CREATE OR REPLACE FUNCTION public.station_daily_summary(p_station UUID, p_days INTEGER DEFAULT 90, p_min_kn DOUBLE PRECISION DEFAULT 12)
RETURNS TABLE (
  day DATE,
  avg_wind_kn DOUBLE PRECISION,
  max_wind_kn DOUBLE PRECISION,
  max_gust_kn DOUBLE PRECISION,
  minutes_windy BIGINT,
  readings BIGINT
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    (recorded_at AT TIME ZONE 'Europe/Madrid')::date AS day,
    avg(wind_speed_kn),
    max(wind_speed_kn),
    max(wind_gust_kn),
    count(*) FILTER (WHERE wind_speed_kn >= p_min_kn),
    count(*)
  FROM public.station_readings
  WHERE station_id = p_station
    AND recorded_at >= now() - make_interval(days => least(greatest(p_days, 1), 90))
  GROUP BY 1
  ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION public.station_hours(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.station_wind_rose(UUID, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.station_daily_summary(UUID, INTEGER, DOUBLE PRECISION) TO anon, authenticated;
