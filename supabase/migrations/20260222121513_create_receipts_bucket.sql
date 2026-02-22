-- Migration to create the "receipts" storage bucket for storing generated bill PDFs

-- 1. Create the bucket if it doesn't already exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public access to read files in the receipts bucket
CREATE POLICY "Public Access for Receipts" 
ON storage.objects FOR SELECT 
TO public
USING (bucket_id = 'receipts');

-- 3. Allow authenticated users to upload to the receipts bucket
CREATE POLICY "Authenticated Uploads to Receipts" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'receipts');

-- 4. Allow authenticated users to update their uploads in the receipts bucket
CREATE POLICY "Authenticated Updates to Receipts" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'receipts');

-- 5. Allow authenticated users to delete from the receipts bucket
CREATE POLICY "Authenticated Deletes from Receipts" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'receipts');
