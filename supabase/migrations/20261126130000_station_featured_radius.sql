-- Per-station association radius and a "featured" station: the app's home spot,
-- loaded first for every visitor and pinned first in the favourites panel.

ALTER TABLE public.stations
  ADD COLUMN IF NOT EXISTS radius_km   DOUBLE PRECISION NOT NULL DEFAULT 2 CHECK (radius_km > 0 AND radius_km <= 50),
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN          NOT NULL DEFAULT false;

-- At most one featured station
CREATE UNIQUE INDEX IF NOT EXISTS stations_one_featured
  ON public.stations (is_featured) WHERE is_featured;

CREATE OR REPLACE VIEW public.stations_public AS
  SELECT id, name, lat, lon, is_active, radius_km, is_featured
  FROM public.stations
  WHERE is_active;

-- Flow Gavà: the first station registered
UPDATE public.stations
SET name = 'Flow Gavà', radius_km = 5, is_featured = true
WHERE name = 'Flow_Gava';
