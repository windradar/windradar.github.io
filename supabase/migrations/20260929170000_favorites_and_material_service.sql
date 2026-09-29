-- 1. Favourite spots in the account (before: only in the browser's localStorage).
-- Coordinates rounded to 4 decimals (~11 m) by the app, so they can be matched exactly.
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT          NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  lat        NUMERIC(8, 4) NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lon        NUMERIC(8, 4) NOT NULL CHECK (lon BETWEEN -180 AND 180),
  added_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (user_id, lat, lon)
);

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own favorites" ON public.user_favorites
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own favorites" ON public.user_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own favorites" ON public.user_favorites
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own favorites" ON public.user_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- 2. Maintenance reminder per material item: service every N hours of use,
-- counted from the last service date (hours come from training_sessions).
ALTER TABLE public.material_items
  ADD COLUMN IF NOT EXISTS service_interval_h INTEGER
    CHECK (service_interval_h IS NULL OR service_interval_h BETWEEN 1 AND 10000),
  ADD COLUMN IF NOT EXISTS last_service_at DATE;
