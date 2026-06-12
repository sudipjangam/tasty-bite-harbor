-- Migration to create the private "backups" storage bucket for storing restaurant backups
-- and define granular RLS policies for security.

-- 1. Create the bucket if it doesn't already exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Select policy (Checks component-based backups access for the restaurant)
CREATE POLICY "Users can read backups for their restaurant"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'backups' 
  AND split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND public.check_access('backups', (split_part(name, '/', 1))::uuid)
);

-- 3. Insert policy
CREATE POLICY "Users can insert backups for their restaurant"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'backups' 
  AND split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND public.check_access('backups', (split_part(name, '/', 1))::uuid)
);

-- 4. Update policy
CREATE POLICY "Users can update backups for their restaurant"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'backups' 
  AND split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND public.check_access('backups', (split_part(name, '/', 1))::uuid)
);

-- 5. Delete policy
CREATE POLICY "Users can delete backups for their restaurant"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'backups' 
  AND split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND public.check_access('backups', (split_part(name, '/', 1))::uuid)
);
