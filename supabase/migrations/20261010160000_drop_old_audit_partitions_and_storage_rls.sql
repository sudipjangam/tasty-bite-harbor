-- ============================================================================
-- Migration: Drop Old Audit Partitions (Jan-Jun 2026) & Fix Storage RLS
-- Purpose: Free ~77 MB of DB space, bring DB to < 100 MB, prevent future base64 bloat
-- ============================================================================

-- 1. DROP old audit log partitions (Jan - Jun 2026)
-- Keeps July, August, September, October 2026 intact
DROP TABLE IF EXISTS public.audit_logs_2026_01;
DROP TABLE IF EXISTS public.audit_logs_2026_02;
DROP TABLE IF EXISTS public.audit_logs_2026_03;
DROP TABLE IF EXISTS public.audit_logs_2026_04;
DROP TABLE IF EXISTS public.audit_logs_2026_05;
DROP TABLE IF EXISTS public.audit_logs_2026_06;

-- 2. Storage RLS policies for 'images' bucket
-- Allows authenticated users to upload/update/delete and public to read
DROP POLICY IF EXISTS "Public read images" ON storage.objects;
CREATE POLICY "Public read images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'images');

DROP POLICY IF EXISTS "Authenticated upload images" ON storage.objects;
CREATE POLICY "Authenticated upload images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'images');

DROP POLICY IF EXISTS "Authenticated update images" ON storage.objects;
CREATE POLICY "Authenticated update images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'images');

DROP POLICY IF EXISTS "Authenticated delete images" ON storage.objects;
CREATE POLICY "Authenticated delete images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'images');

-- 3. Clear base64 logo from organizations table (Spice Route)
UPDATE public.organizations 
SET logo_url = NULL 
WHERE id = 'a96b5d0d-61d0-4316-8fc3-de8cd252c4ca';
