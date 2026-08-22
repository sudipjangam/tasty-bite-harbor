-- Migration: Unify WhatsApp Master Logging Table
-- Created at: 2026-08-22 10:10:00

-- 1. Add extra metadata & restaurant_name columns to whatsapp_campaign_sends
ALTER TABLE public.whatsapp_campaign_sends
  ADD COLUMN IF NOT EXISTS restaurant_name TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'meta_cloud',
  ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'transactional',
  ADD COLUMN IF NOT EXISTS message_id TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Backfill message_id from msg91_request_id if null
UPDATE public.whatsapp_campaign_sends
SET message_id = msg91_request_id
WHERE message_id IS NULL AND msg91_request_id IS NOT NULL;

-- 3. Backfill restaurant_name from restaurants table if null
UPDATE public.whatsapp_campaign_sends w
SET restaurant_name = r.name
FROM public.restaurants r
WHERE w.restaurant_id = r.id AND w.restaurant_name IS NULL;

-- 4. Enhance RLS for Franchise & Multi-branch Access
DROP POLICY IF EXISTS "Users can view own restaurant wa sends" ON public.whatsapp_campaign_sends;
CREATE POLICY "Users can view own restaurant wa sends"
  ON public.whatsapp_campaign_sends FOR SELECT
  USING (
    restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can insert own restaurant wa sends" ON public.whatsapp_campaign_sends;
CREATE POLICY "Users can insert own restaurant wa sends"
  ON public.whatsapp_campaign_sends FOR INSERT
  WITH CHECK (
    restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can update own restaurant wa sends" ON public.whatsapp_campaign_sends;
CREATE POLICY "Users can update own restaurant wa sends"
  ON public.whatsapp_campaign_sends FOR UPDATE
  USING (
    restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  );

-- 5. Create Indexes for High-Performance Queries
CREATE INDEX IF NOT EXISTS idx_wa_sends_rest_created ON public.whatsapp_campaign_sends(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_sends_phone ON public.whatsapp_campaign_sends(customer_phone);
CREATE INDEX IF NOT EXISTS idx_wa_sends_type ON public.whatsapp_campaign_sends(message_type);
CREATE INDEX IF NOT EXISTS idx_wa_sends_provider ON public.whatsapp_campaign_sends(provider);
CREATE INDEX IF NOT EXISTS idx_wa_sends_rest_name ON public.whatsapp_campaign_sends(restaurant_name);
