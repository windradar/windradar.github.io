-- Tabla de tipos de deporte por usuario
CREATE TABLE IF NOT EXISTS public.sport_types (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        varchar(50) NOT NULL,
  wind_min_kn integer NOT NULL DEFAULT 5,
  wind_max_kn integer NOT NULL DEFAULT 35,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.sport_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sport_types"
  ON public.sport_types FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Asociar categoría de material con un deporte
ALTER TABLE public.material_categories
  ADD COLUMN IF NOT EXISTS sport_type_id uuid REFERENCES public.sport_types(id) ON DELETE SET NULL;

-- Rango de viento por ítem de material
ALTER TABLE public.material_items
  ADD COLUMN IF NOT EXISTS wind_min_kn integer,
  ADD COLUMN IF NOT EXISTS wind_max_kn integer;

-- Actualizar delete_own_account para incluir sport_types
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  DELETE FROM public.material_items      WHERE user_id = _uid;
  DELETE FROM public.material_categories WHERE user_id = _uid;
  DELETE FROM public.sport_types         WHERE user_id = _uid;
  DELETE FROM auth.users WHERE id = _uid;
END;
$$;
