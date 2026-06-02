
-- WhatsApp automatic alert columns (CallMeBot integration)
-- Phone is stored in existing whatsapp_number column.
-- Threshold reuses existing email_notif_min_wind column.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_alert_enabled    BOOLEAN          NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS callmebot_apikey          TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_alert_time1      TEXT             DEFAULT '07:00',
  ADD COLUMN IF NOT EXISTS whatsapp_alert_time2      TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_alert_range_from TEXT             DEFAULT '06:00',
  ADD COLUMN IF NOT EXISTS whatsapp_alert_range_to   TEXT             DEFAULT '20:00',
  ADD COLUMN IF NOT EXISTS whatsapp_alert_location   TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_alert_lat        DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS whatsapp_alert_lon        DOUBLE PRECISION;
