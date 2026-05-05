-- Platform-wide configuration table (no FK to restaurants)
CREATE TABLE IF NOT EXISTS platform_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- Seed default WhatsApp config
INSERT INTO platform_config (key, value)
VALUES ('whatsapp', '{"provider": "msg91", "meta_config": {}}')
ON CONFLICT (key) DO NOTHING;

-- Allow authenticated users to read, but only admins can write
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read platform_config"
  ON platform_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update platform_config"
  ON platform_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
