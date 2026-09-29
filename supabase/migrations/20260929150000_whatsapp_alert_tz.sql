-- IANA timezone of the alert spot (e.g. Europe/Madrid). Lets the hourly WhatsApp
-- and push crons skip users whose send time is not now without calling
-- Open-Meteo for each of them. Filled on save and backfilled by the functions.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_alert_tz TEXT
  CHECK (whatsapp_alert_tz IS NULL OR length(whatsapp_alert_tz) <= 64);
