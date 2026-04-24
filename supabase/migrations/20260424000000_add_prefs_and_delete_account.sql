-- Add preference columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS wind_units TEXT NOT NULL DEFAULT 'kn'
    CHECK (wind_units IN ('kn', 'kmh', 'ms'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_format TEXT NOT NULL DEFAULT 'dmy'
    CHECK (date_format IN ('dmy', 'mdy', 'iso'));

-- RPC to delete own auth account (SECURITY DEFINER allows deleting from auth.users)
-- Cascades to profiles and training_sessions; caller must delete material data first.
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
