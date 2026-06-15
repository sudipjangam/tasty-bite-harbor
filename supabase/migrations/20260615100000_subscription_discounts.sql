CREATE TABLE IF NOT EXISTS subscription_discounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  restaurant_name TEXT NOT NULL,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'cash', 'fixed_price')),
  discount_value NUMERIC NOT NULL,
  original_price NUMERIC NOT NULL,
  discounted_price NUMERIC NOT NULL,
  discount_amount NUMERIC NOT NULL,
  discount_percentage NUMERIC,
  razorpay_payment_link_id TEXT,
  razorpay_payment_link_url TEXT,
  razorpay_payment_link_status TEXT DEFAULT 'created',
  whatsapp_sent BOOLEAN DEFAULT false,
  whatsapp_sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subscription_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins manage discounts" ON subscription_discounts
  FOR ALL USING (public.is_platform_admin());

CREATE POLICY "Owners can view their discounts" ON subscription_discounts
  FOR SELECT USING (restaurant_id = public.get_user_restaurant_id());
