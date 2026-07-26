-- Migration: Prepaid WhatsApp Marketing Wallets
-- Created at: 2026-07-26 11:10:00

-- 1. Create restaurant_wallets table
CREATE TABLE IF NOT EXISTS public.restaurant_wallets (
    restaurant_id UUID PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
    restaurant_name TEXT,
    balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create wallet_transactions table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    restaurant_name TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'deduction', 'refund')),
    reference_id TEXT, -- e.g., razorpay order/payment ID, or campaign ID
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE public.restaurant_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
-- Restaurant owners can view their own wallet
CREATE POLICY "Owners can view their own wallet" 
ON public.restaurant_wallets
FOR SELECT 
USING (
    restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
);

-- Restaurant owners can view their own transactions
CREATE POLICY "Owners can view their own wallet transactions" 
ON public.wallet_transactions
FOR SELECT 
USING (
    restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
);

-- Note: Inserts/Updates to these tables should only be done via secure Edge Functions 
-- using the service_role key, or database functions with SECURITY DEFINER, 
-- hence no public insert/update/delete policies.

-- 5. Trigger to automatically create a wallet for new restaurants
CREATE OR REPLACE FUNCTION public.create_default_restaurant_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.restaurant_wallets (restaurant_id, restaurant_name, balance)
  VALUES (NEW.id, NEW.name, 0.00);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS on_restaurant_created_create_wallet ON public.restaurants;

CREATE TRIGGER on_restaurant_created_create_wallet
  AFTER INSERT ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.create_default_restaurant_wallet();

-- 6. Insert default wallets for existing restaurants
INSERT INTO public.restaurant_wallets (restaurant_id, restaurant_name, balance)
SELECT id, name, 0.00 FROM public.restaurants
ON CONFLICT (restaurant_id) DO NOTHING;

-- 7. Update notify_expiring_loyalty_points to check platform_config
CREATE OR REPLACE FUNCTION public.notify_expiring_loyalty_points(p_days_before integer DEFAULT 7)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cust_record RECORD;
  payload JSONB;
  request_id bigint;
  marketing_enabled boolean;
BEGIN
  -- Check platform_config to see if automated marketing is enabled
  -- If not found, default to false to prevent accidental deductions
  SELECT COALESCE((value->>'enable_automated_whatsapp_marketing')::boolean, false)
  INTO marketing_enabled
  FROM public.platform_config
  WHERE key = 'whatsapp';

  IF NOT marketing_enabled THEN
    RAISE NOTICE 'Automated WhatsApp marketing is disabled in platform_config. Exiting.';
    RETURN;
  END IF;

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
    INSERT INTO public.customer_activities (customer_id, restaurant_id, activity_type, description)
    VALUES (
      cust_record.id, 
      cust_record.restaurant_id,
      'notification_sent', 
      'Sent points expiry WhatsApp warning (' || cust_record.loyalty_points || ' pts expiring in ' || p_days_before || ' days, promo: ' || cust_record.promo_code || ')'
    );
  END LOOP;
END;
$$;
