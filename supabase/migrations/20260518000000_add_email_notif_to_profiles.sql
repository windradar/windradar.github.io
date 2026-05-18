ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_notif_enabled    BOOLEAN       NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_notif_address    TEXT,
  ADD COLUMN IF NOT EXISTS email_notif_location   TEXT,
  ADD COLUMN IF NOT EXISTS email_notif_lat        DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS email_notif_lon        DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS email_notif_time1      TEXT          NOT NULL DEFAULT '07:00',
  ADD COLUMN IF NOT EXISTS email_notif_time2      TEXT,
  ADD COLUMN IF NOT EXISTS email_notif_range_from TEXT          NOT NULL DEFAULT '06:00',
  ADD COLUMN IF NOT EXISTS email_notif_range_to   TEXT          NOT NULL DEFAULT '20:00',
  ADD COLUMN IF NOT EXISTS email_notif_min_wind   INTEGER       NOT NULL DEFAULT 10;
