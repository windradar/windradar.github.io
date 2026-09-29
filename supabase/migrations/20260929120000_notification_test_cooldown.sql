-- Cooldown for the "send test" buttons (email, WhatsApp, push), so a user
-- cannot drain the Brevo / CallMeBot / Open-Meteo quotas.
-- RLS on with no policies: only the service role (Edge Functions) can touch it.
-- Kept out of profiles because users can UPDATE their own profile row and
-- would be able to reset the timestamp.
CREATE TABLE IF NOT EXISTS public.notification_test_log (
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel     TEXT        NOT NULL CHECK (channel IN ('email', 'whatsapp', 'push')),
  last_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, channel)
);

ALTER TABLE public.notification_test_log ENABLE ROW LEVEL SECURITY;

-- Single statement so two parallel requests cannot both get the slot.
CREATE OR REPLACE FUNCTION public.claim_test_slot(p_user_id UUID, p_channel TEXT, p_cooldown_seconds INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed BOOLEAN;
BEGIN
  INSERT INTO public.notification_test_log AS t (user_id, channel, last_at)
  VALUES (p_user_id, p_channel, now())
  ON CONFLICT (user_id, channel) DO UPDATE
    SET last_at = now()
    WHERE t.last_at < now() - make_interval(secs => p_cooldown_seconds)
  RETURNING true INTO claimed;
  RETURN COALESCE(claimed, false);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_test_slot(UUID, TEXT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_test_slot(UUID, TEXT, INT) TO service_role;
