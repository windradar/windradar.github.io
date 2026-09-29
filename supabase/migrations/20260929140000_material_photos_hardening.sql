-- The bucket is public, so photos are served through their public URL without
-- going through RLS. The previous SELECT policy (any path with a folder) only
-- enabled the list API, and let anyone enumerate every user's photos.
DROP POLICY IF EXISTS "Public read material photo objects" ON storage.objects;

CREATE POLICY "Users read own material photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'material-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Server-side limits; the client resizes photos before uploading them
UPDATE storage.buckets
SET file_size_limit   = 3 * 1024 * 1024,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'material-photos';
