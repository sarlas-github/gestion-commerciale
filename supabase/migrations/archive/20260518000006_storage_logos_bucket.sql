-- Bucket public pour les logos entreprise (max 2 Mo, PNG/JPG/WebP)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos', 'logos', true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "logos_read"   ON storage.objects;
DROP POLICY IF EXISTS "logos_upload" ON storage.objects;
DROP POLICY IF EXISTS "logos_update" ON storage.objects;
DROP POLICY IF EXISTS "logos_delete" ON storage.objects;

CREATE POLICY "logos_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');

CREATE POLICY "logos_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "logos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "logos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);
