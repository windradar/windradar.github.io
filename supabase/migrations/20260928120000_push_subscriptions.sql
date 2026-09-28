-- Web Push subscriptions (one row per device and user).
-- Alerts reuse the WhatsApp alert config in profiles (location, times, range)
-- and the email_notif_min_wind threshold.
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT        NOT NULL,
  p256dh      TEXT        NOT NULL,
  auth        TEXT        NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Per user, not global: a shared device with two accounts would otherwise hit
  -- another user's row on upsert and be blocked by RLS
  UNIQUE (user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own push subscriptions" ON public.push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own push subscriptions" ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own push subscriptions" ON public.push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own push subscriptions" ON public.push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Hourly cron at minute 10 (email at :00, WhatsApp at :05). Copies the
-- WhatsApp job's command so the CRON_SECRET never has to be pasted here.
-- Requires the 'windradar-whatsapp-alerts' job to exist.
SELECT cron.schedule(
  'windradar-push-alerts',
  '10 * * * *',
  replace(
    (SELECT command FROM cron.job WHERE jobname = 'windradar-whatsapp-alerts'),
    'send-whatsapp-alerts',
    'send-push-alerts'
  )
);
