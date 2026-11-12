-- 1. Rider weight, used to size the recommended sail. Optional.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(4, 1)
    CHECK (weight_kg IS NULL OR weight_kg BETWEEN 30 AND 200);

-- 2. Type and size per material item: m2 for a sail, litres for a board.
-- Both stay NULL for anything else (fins, masts, harnesses...).
ALTER TABLE public.material_items
  ADD COLUMN IF NOT EXISTS kind TEXT
    CHECK (kind IS NULL OR kind IN ('sail', 'board')),
  ADD COLUMN IF NOT EXISTS size NUMERIC(5, 1)
    CHECK (size IS NULL OR (size > 0 AND size <= 999));
