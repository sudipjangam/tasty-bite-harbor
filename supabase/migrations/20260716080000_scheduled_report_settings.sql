-- ============================================================================
-- Migration: Auto Daily Report — scheduled_report_settings + daily_summary columns
-- ============================================================================

-- 1. Create scheduled_report_settings table
CREATE TABLE IF NOT EXISTS public.scheduled_report_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  is_enabled boolean DEFAULT false,
  report_time time NOT NULL DEFAULT '23:00',
  timezone text DEFAULT 'Asia/Kolkata',
  -- Delivery channels
  send_whatsapp boolean DEFAULT true,
  send_email boolean DEFAULT true,
  whatsapp_numbers text[] DEFAULT '{}',
  email_addresses text[] DEFAULT '{}',
  -- Tracking
  last_sent_date date,
  last_delivery_status jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(restaurant_id)
);

-- 2. RLS (Pattern 2: restaurant-scoped CRUD)
ALTER TABLE public.scheduled_report_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scheduled_report_settings_select"
  ON public.scheduled_report_settings FOR SELECT TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "scheduled_report_settings_insert"
  ON public.scheduled_report_settings FOR INSERT TO authenticated
  WITH CHECK (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "scheduled_report_settings_update"
  ON public.scheduled_report_settings FOR UPDATE TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "scheduled_report_settings_delete"
  ON public.scheduled_report_settings FOR DELETE TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id());

-- Platform admin override
CREATE POLICY "scheduled_report_settings_platform_admin"
  ON public.scheduled_report_settings FOR ALL TO authenticated
  USING (public.is_platform_admin());

-- 3. Add columns to daily_summary_reports for P&L tracking + delivery status
ALTER TABLE public.daily_summary_reports
  ADD COLUMN IF NOT EXISTS delivery_status jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS total_expenses numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expense_breakdown jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS net_profit numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS inventory_cost numeric DEFAULT 0;

-- 4. Index for cron lookups (find due restaurants fast)
CREATE INDEX IF NOT EXISTS idx_scheduled_report_settings_enabled_date
  ON public.scheduled_report_settings (is_enabled, last_sent_date)
  WHERE is_enabled = true;

-- 5. Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_scheduled_report_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scheduled_report_settings_updated_at ON public.scheduled_report_settings;
CREATE TRIGGER trg_scheduled_report_settings_updated_at
  BEFORE UPDATE ON public.scheduled_report_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_scheduled_report_settings_updated_at();

-- 6. pg_cron job: check every 15 minutes for due daily reports
-- NOTE: Replace <SUPABASE_URL> and <SERVICE_ROLE_KEY> with actual values before running
-- SELECT cron.schedule(
--   'send-daily-reports',
--   '*/15 * * * *',
--   $$SELECT net.http_post(
--     url := '<SUPABASE_URL>/functions/v1/send-daily-report',
--     headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
--     body := '{}'::jsonb,
--     timeout_milliseconds := 30000
--   )$$
-- );
