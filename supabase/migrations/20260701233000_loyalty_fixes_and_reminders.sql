-- Migration: Loyalty Points Sync, Expiry, and WhatsApp Warnings
-- Created at: 2026-07-01 23:30:00

-- 1. Sync & Recalculate customers' total_spent, visit_count, average_order_value based on actual completed orders
WITH order_stats AS (
  SELECT 
    customer_name, 
    SUM(total::numeric) as actual_total, 
    COUNT(*) as actual_count
  FROM public.orders 
  WHERE restaurant_id = 'ec68fdf9-3f76-4980-8e83-56dfec2951a4' 
    AND status = 'completed' 
  GROUP BY customer_name
)
UPDATE public.customers c SET 
  total_spent = COALESCE(o.actual_total, 0),
  visit_count = COALESCE(o.actual_count, 0),
  average_order_value = CASE 
    WHEN COALESCE(o.actual_count, 0) > 0 THEN COALESCE(o.actual_total, 0) / o.actual_count 
    ELSE 0 
  END
FROM order_stats o
WHERE c.restaurant_id = 'ec68fdf9-3f76-4980-8e83-56dfec2951a4'
  AND o.customer_name = c.name;

-- 2. Recalculate loyalty points (earned points minus redeemed points) for all BrewBites customers
WITH redeemed AS (
  SELECT 
    customer_id, 
    COALESCE(SUM(ABS(points)), 0) as total_redeemed
  FROM public.loyalty_transactions 
  WHERE restaurant_id = 'ec68fdf9-3f76-4980-8e83-56dfec2951a4' 
    AND transaction_type = 'redeemed'
  GROUP BY customer_id
)
UPDATE public.customers c SET 
  loyalty_points = GREATEST(0, FLOOR(c.total_spent::numeric / 10) - COALESCE(r.total_redeemed, 0))::integer
FROM (SELECT 1) dummy
LEFT JOIN redeemed r ON r.customer_id = c.id
WHERE c.restaurant_id = 'ec68fdf9-3f76-4980-8e83-56dfec2951a4';

-- 3. Create the loyalty point auto-expiry function
CREATE OR REPLACE FUNCTION public.expire_loyalty_points()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count integer;
BEGIN
  -- Insert expire transactions for customers past expiry
  INSERT INTO public.loyalty_transactions (customer_id, restaurant_id, transaction_type, points, source, notes)
  SELECT 
    c.id, c.restaurant_id, 'expire', -c.loyalty_points, 'system',
    'Auto-expired: last visit ' || c.last_visit_date::date || ', expiry after ' || lp.points_expiry_days || ' days'
  FROM public.customers c
  JOIN public.loyalty_programs lp ON lp.restaurant_id = c.restaurant_id AND lp.is_enabled = true
  WHERE c.loyalty_points > 0
    AND lp.points_expiry_days IS NOT NULL
    AND c.last_visit_date < NOW() - (lp.points_expiry_days || ' days')::interval;

  -- Zero out points
  UPDATE public.customers c SET loyalty_points = 0
  FROM public.loyalty_programs lp
  WHERE lp.restaurant_id = c.restaurant_id
    AND lp.is_enabled = true
    AND c.loyalty_points > 0
    AND lp.points_expiry_days IS NOT NULL
    AND c.last_visit_date < NOW() - (lp.points_expiry_days || ' days')::interval;

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RAISE NOTICE 'Expired loyalty points for % customers', expired_count;
END;
$$;

-- 4. Create the WhatsApp points expiry warning/marketing notification function
CREATE OR REPLACE FUNCTION public.notify_expiring_loyalty_points(p_days_before integer DEFAULT 7)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cust_record RECORD;
  payload JSONB;
  request_id bigint;
BEGIN
  FOR cust_record IN
    SELECT 
      c.id, 
      c.name as customer_name, 
      c.phone as customer_phone, 
      c.loyalty_points, 
      r.id as restaurant_id, 
      r.name as restaurant_name,
      -- Get first active promo code for the restaurant, fallback to REVISIT10
      COALESCE(
        (SELECT promotion_code FROM public.promotion_campaigns WHERE restaurant_id = c.restaurant_id AND is_active = true LIMIT 1),
        'REVISIT10'
      ) as promo_code,
      lp.points_expiry_days
    FROM public.customers c
    JOIN public.loyalty_programs lp ON lp.restaurant_id = c.restaurant_id AND lp.is_enabled = true
    JOIN public.restaurants r ON r.id = c.restaurant_id
    WHERE c.loyalty_points > 0
      AND lp.points_expiry_days IS NOT NULL
      AND c.phone IS NOT NULL
      AND c.phone != ''
      -- Expiring in exactly p_days_before: last_visit_date was (expiry_days - p_days_before) days ago
      AND DATE(c.last_visit_date) = CURRENT_DATE - (lp.points_expiry_days - p_days_before) * INTERVAL '1 day'
  LOOP
    -- Build payload for send-whatsapp-unified
    payload := jsonb_build_object(
      'restaurantId', cust_record.restaurant_id,
      'phoneNumber', cust_record.customer_phone,
      'customerName', cust_record.customer_name,
      'restaurantName', cust_record.restaurant_name,
      'templateName', 'points_expiry_warning',
      'variables', jsonb_build_object(
        '1', cust_record.customer_name,
        '2', cust_record.restaurant_name,
        '3', cust_record.loyalty_points::text,
        '4', p_days_before::text,
        '5', cust_record.promo_code
      )
    );

    -- Call send-whatsapp-unified Edge Function
    SELECT net.http_post(
      url := 'https://clmsoetktmvhazctlans.supabase.co/functions/v1/send-whatsapp-unified',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbXNvZXRrdG12aGF6Y3RsYW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg1MTE5NTIsImV4cCI6MjA1NDA4Nzk1Mn0.4j8CLdQn9By5XawbdC4LlWhFumIQT6gqCl2lZnQwQWk"}'::jsonb,
      body := payload,
      timeout_milliseconds := 5000
    ) INTO request_id;

    -- Record activity
    INSERT INTO public.customer_activities (customer_id, activity_type, description)
    VALUES (
      cust_record.id, 
      'notification_sent', 
      'Sent points expiry WhatsApp warning (' || cust_record.loyalty_points || ' pts expiring in ' || p_days_before || ' days, promo: ' || cust_record.promo_code || ')'
    );
  END LOOP;
END;
$$;

-- 5. Schedule pg_cron jobs for daily expiry and expiry notifications
-- 2:00 AM IST (20:30 UTC) -> run point expiry check
SELECT cron.schedule('expire-loyalty-points-daily', '30 20 * * *', 'SELECT public.expire_loyalty_points()');

-- 9:30 AM IST (4:00 UTC) -> run 7-day warning reminder
SELECT cron.schedule('notify-loyalty-expiry-7days', '0 4 * * *', 'SELECT public.notify_expiring_loyalty_points(7)');

-- 9:35 AM IST (4:05 UTC) -> run 3-day warning reminder
SELECT cron.schedule('notify-loyalty-expiry-3days', '5 4 * * *', 'SELECT public.notify_expiring_loyalty_points(3)');
