-- FK constraints on material_categories.user_id
ALTER TABLE public.material_categories
  ADD CONSTRAINT fk_mat_cat_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- FK constraints on material_items.user_id
ALTER TABLE public.material_items
  ADD CONSTRAINT fk_mat_items_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Replace delete_own_account so it cascades everything in order
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- material_items and material_categories now cascade via FK,
  -- but we delete explicitly to be safe before removing the user.
  DELETE FROM public.material_items    WHERE user_id = _uid;
  DELETE FROM public.material_categories WHERE user_id = _uid;
  -- profiles and training_sessions cascade from auth.users ON DELETE CASCADE
  DELETE FROM auth.users WHERE id = _uid;
END;
$$;
