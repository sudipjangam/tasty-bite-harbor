-- Auto-expire promotion campaigns that have passed their end_date
-- Uses pg_cron to run daily at midnight UTC

-- 1. Enable pg_cron extension (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Drop the old status check constraint and recreate with 'expired' included
ALTER TABLE promotion_campaigns DROP CONSTRAINT IF EXISTS promotion_campaigns_status_check;
ALTER TABLE promotion_campaigns ADD CONSTRAINT promotion_campaigns_status_check 
  CHECK (status IN ('active', 'paused', 'draft', 'expired', 'scheduled', 'completed'));

-- 3. Create the function that expires campaigns
CREATE OR REPLACE FUNCTION public.auto_expire_promotion_campaigns()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count integer;
BEGIN
  UPDATE promotion_campaigns
  SET 
    status = 'expired',
    is_active = false,
    updated_at = now()
  WHERE 
    status = 'active'
    AND is_active = true
    AND end_date < CURRENT_DATE;

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  IF expired_count > 0 THEN
    RAISE LOG 'auto_expire_promotion_campaigns: expired % campaigns', expired_count;
  END IF;
END;
$$;

-- 4. Schedule the cron job — runs every day at 00:05 UTC
SELECT cron.schedule(
  'auto-expire-campaigns',
  '5 0 * * *',
  $$SELECT public.auto_expire_promotion_campaigns()$$
);

-- 5. Run once now to clean up stale campaigns
SELECT public.auto_expire_promotion_campaigns();
