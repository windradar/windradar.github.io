-- 1. Add photo_url to material_items
ALTER TABLE public.material_items
  ADD COLUMN IF NOT EXISTS photo_url text;

-- 2. Create public bucket for material photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('material-photos', 'material-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies: public read, owner write/update/delete
CREATE POLICY "Public can view material photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'material-photos');

CREATE POLICY "Users upload own material photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'material-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users update own material photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'material-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own material photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'material-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );