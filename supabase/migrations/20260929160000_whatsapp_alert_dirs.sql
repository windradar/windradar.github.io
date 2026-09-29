-- Wind directions (where the wind blows FROM) that make the alert spot work,
-- as 16-point sector indices: 0 = N, 1 = NNE ... 15 = NNO (22.5° each).
-- NULL or empty = any direction. Used by send-whatsapp-alerts and send-push-alerts.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_alert_dirs SMALLINT[]
  CHECK (
    whatsapp_alert_dirs IS NULL
    OR (
      whatsapp_alert_dirs <@ ARRAY[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]::SMALLINT[]
      AND cardinality(whatsapp_alert_dirs) <= 16
    )
  );
