-- Insert app update configuration if not exists
INSERT INTO platform_config (key, value)
VALUES (
    'app_update_info',
    '{"latest_version": "1.0.31", "required_version": "1.0.30", "download_url": "https://clmsoetktmvhazctlans.supabase.co/storage/v1/object/public/releases/swadeshisolutions.apk"}'
)
ON CONFLICT (key) DO NOTHING;

-- Create the releases bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('releases', 'releases', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to read files in the releases bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'releases' );
