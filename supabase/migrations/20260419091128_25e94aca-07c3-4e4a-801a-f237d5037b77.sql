-- Categorías personalizadas (4 slots por usuario)
CREATE TABLE public.material_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  slot SMALLINT NOT NULL CHECK (slot BETWEEN 1 AND 4),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, slot)
);

ALTER TABLE public.material_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own categories" ON public.material_categories
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own categories" ON public.material_categories
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own categories" ON public.material_categories
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own categories" ON public.material_categories
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_material_categories_updated
  BEFORE UPDATE ON public.material_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Items dentro de cada categoría
CREATE TABLE public.material_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID NOT NULL REFERENCES public.material_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_material_items_category ON public.material_items(category_id);
CREATE INDEX idx_material_items_user ON public.material_items(user_id);

ALTER TABLE public.material_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own items" ON public.material_items
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own items" ON public.material_items
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own items" ON public.material_items
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own items" ON public.material_items
  FOR DELETE TO authenticated USING (auth.uid() = user_id);