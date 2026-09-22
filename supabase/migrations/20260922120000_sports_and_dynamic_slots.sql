-- Wrapped in an explicit transaction: if any statement below fails, everything
-- rolls back and no existing session/material/category data is touched.
BEGIN;

-- Sports: user-managed list of disciplines (Windsurf, Kite, Wing Foil, SUP, ...)
CREATE TABLE public.sports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE public.sports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sports" ON public.sports
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sports" ON public.sports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sports" ON public.sports
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own sports" ON public.sports
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- material_categories: allow unlimited slots (was CHECK 1..4), and let each
-- slot optionally belong to one sport (NULL = shared / applies to all sports)
ALTER TABLE public.material_categories DROP CONSTRAINT material_categories_slot_check;
ALTER TABLE public.material_categories ADD CONSTRAINT material_categories_slot_check CHECK (slot >= 1);
ALTER TABLE public.material_categories
  ADD COLUMN sport_id UUID REFERENCES public.sports(id) ON DELETE SET NULL;

-- training_sessions: replace the fixed material_1..material_4 columns with a
-- flexible JSONB list, and add a sport name snapshot (stored as text, like
-- materials already were, so history survives renames/deletes upstream)
ALTER TABLE public.training_sessions ADD COLUMN sport_name TEXT;
ALTER TABLE public.training_sessions ADD COLUMN materials JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.training_sessions ts
SET materials = (
  SELECT COALESCE(jsonb_agg(jsonb_build_object('category_id', mc.id, 'name', v.name)), '[]'::jsonb)
  FROM (VALUES (1, ts.material_1), (2, ts.material_2), (3, ts.material_3), (4, ts.material_4)) AS v(slot, name)
  LEFT JOIN public.material_categories mc ON mc.user_id = ts.user_id AND mc.slot = v.slot
  WHERE v.name IS NOT NULL AND v.name <> ''
);

ALTER TABLE public.training_sessions
  DROP COLUMN material_1,
  DROP COLUMN material_2,
  DROP COLUMN material_3,
  DROP COLUMN material_4;

-- Keep delete_own_account() cascading explicitly, matching the existing
-- defensive-delete pattern for material_categories/material_items.
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  DELETE FROM public.material_items    WHERE user_id = _uid;
  DELETE FROM public.material_categories WHERE user_id = _uid;
  DELETE FROM public.sports WHERE user_id = _uid;
  -- profiles and training_sessions cascade from auth.users ON DELETE CASCADE
  DELETE FROM auth.users WHERE id = _uid;
END;
$$;

COMMIT;
