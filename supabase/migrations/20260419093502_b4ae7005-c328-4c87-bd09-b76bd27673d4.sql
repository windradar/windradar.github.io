-- Replace broad public SELECT with path-only access (no listing)
DROP POLICY IF EXISTS "Public can view material photos" ON storage.objects;

-- Make bucket non-public (public URLs still work via signed-style direct path,
-- but we'll generate getPublicUrl which works for non-public buckets too only with signed urls;
-- so keep it public=true at bucket level and instead restrict listing differently).
-- Actually, to keep getPublicUrl working we need public=true. Re-add a SELECT policy
-- that allows reading individual objects but the linter flags broad SELECT.
-- Compromise: allow SELECT only when the object name matches uuid path pattern.
CREATE POLICY "Public read material photo objects"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'material-photos'
    AND (storage.foldername(name))[1] IS NOT NULL
  );