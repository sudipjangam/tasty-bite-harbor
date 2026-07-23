-- =============================================
-- FRANCHISE PHASE 2 MIGRATION 2: Franchise Daily Digest Cron
-- Schedules a daily WhatsApp digest for franchise owners + regional managers
-- Requires pg_cron and pg_net extensions
-- =============================================

BEGIN;

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Store digest settings in organizations.settings JSONB
-- Structure: { "digest_enabled": true, "digest_recipients": ["+91...", "+91..."] }
-- This is already supported by the existing organizations.settings JSONB column.
-- No schema change needed — just documenting the shape here.

-- 3. Helper function: get digest recipients for an org
-- Returns array of phone numbers for owner + all admins (regional managers)
CREATE OR REPLACE FUNCTION get_org_digest_recipients(p_org_id UUID)
RETURNS TEXT[] AS $$
  SELECT ARRAY_AGG(DISTINCT p.phone)
  FROM organization_members om
  JOIN profiles p ON p.id = om.user_id
  WHERE om.organization_id = p_org_id
    AND om.role IN ('owner', 'admin')
    AND p.phone IS NOT NULL;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 4. Schedule daily digest at 8:00 AM IST (02:30 UTC)
-- Job name is idempotent — re-running this migration is safe
SELECT cron.unschedule('franchise-daily-digest')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'franchise-daily-digest'
);

SELECT cron.schedule(
  'franchise-daily-digest',
  '30 2 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM app_settings WHERE key = 'supabase_url') || '/functions/v1/franchise-daily-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM app_settings WHERE key = 'service_role_key')
    ),
    body := '{"trigger":"cron"}'::jsonb
  )
  $$
);

COMMIT;
