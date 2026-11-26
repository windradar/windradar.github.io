-- Live weather stations (Ecowitt). Readings are written only by the
-- 'ecowitt-sync' Edge Function (service role); anyone can read them.
--
-- A station is tied to a spot by proximity (lat/lon), not by id: spots in the
-- app are plain coordinates, there is no spots table.

CREATE TABLE IF NOT EXISTS public.stations (
  id         UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT             NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  lat        DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lon        DOUBLE PRECISION NOT NULL CHECK (lon BETWEEN -180 AND 180),
  mac        TEXT             NOT NULL UNIQUE,
  is_active  BOOLEAN          NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ      NOT NULL DEFAULT now()
);

-- No policies on purpose: the MAC must not be public. The app reads stations
-- through the stations_public view below; the Edge Function uses the service role.
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE VIEW public.stations_public AS
  SELECT id, name, lat, lon, is_active
  FROM public.stations
  WHERE is_active;

GRANT SELECT ON public.stations_public TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.station_readings (
  id            BIGINT           GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station_id    UUID             NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  recorded_at   TIMESTAMPTZ      NOT NULL,
  wind_speed_kn DOUBLE PRECISION,
  wind_gust_kn  DOUBLE PRECISION,
  wind_dir_deg  DOUBLE PRECISION,
  temp_c        DOUBLE PRECISION,
  humidity      DOUBLE PRECISION,
  rain_rate_mm  DOUBLE PRECISION,
  uv_index      DOUBLE PRECISION,
  pressure_hpa  DOUBLE PRECISION,
  raw           JSONB,
  -- One row per station and measurement time: the sync runs every minute and
  -- the station may not have uploaded anything new
  UNIQUE (station_id, recorded_at)
);

-- The unique constraint already creates the (station_id, recorded_at) index

ALTER TABLE public.station_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read station readings" ON public.station_readings
  FOR SELECT USING (true);

-- Realtime: the app updates the live block without reloading
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'station_readings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.station_readings;
  END IF;
END $$;

-- Every minute. Copies the WhatsApp job's command so the CRON_SECRET never has
-- to be pasted here. Requires the 'windradar-whatsapp-alerts' job to exist.
SELECT cron.schedule(
  'windradar-ecowitt-sync',
  '* * * * *',
  replace(
    (SELECT command FROM cron.job WHERE jobname = 'windradar-whatsapp-alerts'),
    'send-whatsapp-alerts',
    'ecowitt-sync'
  )
);

-- Keep 90 days of readings
SELECT cron.schedule(
  'windradar-station-readings-cleanup',
  '17 3 * * *',
  $job$DELETE FROM public.station_readings WHERE recorded_at < now() - interval '90 days'$job$
);
