-- ================================================================
-- Paytm Payment Gateway Integration
-- Adds Paytm API credentials to payment_settings
-- Creates payment_transactions table for tracking
-- ================================================================

-- Step 1: Add Paytm gateway columns to existing payment_settings table
ALTER TABLE public.payment_settings
ADD COLUMN IF NOT EXISTS gateway_type TEXT DEFAULT 'static_upi' CHECK (gateway_type IN ('static_upi', 'paytm', 'razorpay')),
ADD COLUMN IF NOT EXISTS paytm_mid TEXT,
ADD COLUMN IF NOT EXISTS paytm_merchant_key TEXT,
ADD COLUMN IF NOT EXISTS paytm_website TEXT DEFAULT 'DEFAULT',
ADD COLUMN IF NOT EXISTS paytm_is_test_mode BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS paytm_webhook_secret TEXT,
ADD COLUMN IF NOT EXISTS soundbox_linked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS voice_announcement_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS voice_announcement_template TEXT DEFAULT 'detailed',
ADD COLUMN IF NOT EXISTS voice_announcement_language TEXT DEFAULT 'en';

-- Step 2: Create payment_transactions table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id TEXT,
  table_number TEXT,
  
  -- Paytm specific fields
  paytm_order_id TEXT UNIQUE NOT NULL,
  paytm_txn_id TEXT,
  paytm_qr_id TEXT,
  gateway_type TEXT DEFAULT 'paytm',
  
  -- Transaction details
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'expired')),
  
  -- QR code data
  qr_code_data TEXT,
  qr_image_base64 TEXT,
  
  -- Webhook response storage
  webhook_payload JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_restaurant 
ON public.payment_transactions(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status 
ON public.payment_transactions(status);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_paytm_order 
ON public.payment_transactions(paytm_order_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id 
ON public.payment_transactions(order_id);

-- Step 4: Enable RLS
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Step 5: RLS policies for payment_transactions
-- Authenticated users can view their restaurant's transactions
CREATE POLICY "payment_transactions_select_own"
ON public.payment_transactions
FOR SELECT
USING (restaurant_id IN (
  SELECT restaurant_id FROM profiles WHERE id = auth.uid()
));

-- Authenticated users can insert for their restaurant
CREATE POLICY "payment_transactions_insert_own"
ON public.payment_transactions
FOR INSERT
WITH CHECK (restaurant_id IN (
  SELECT restaurant_id FROM profiles WHERE id = auth.uid()
));

-- Authenticated users can update their restaurant's transactions
CREATE POLICY "payment_transactions_update_own"
ON public.payment_transactions
FOR UPDATE
USING (restaurant_id IN (
  SELECT restaurant_id FROM profiles WHERE id = auth.uid()
));

-- Service role can do everything (for Edge Functions / webhooks)
CREATE POLICY "payment_transactions_service_role"
ON public.payment_transactions
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Anonymous access for webhook Edge Function
CREATE POLICY "payment_transactions_anon_insert"
ON public.payment_transactions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "payment_transactions_anon_update"
ON public.payment_transactions
FOR UPDATE
USING (true);

-- Step 6: Enable realtime for payment_transactions
-- This allows POS to detect payment changes instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_transactions;

-- Step 7: Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_transaction_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.completed_at = CASE WHEN NEW.status IN ('success', 'failed') THEN now() ELSE NEW.completed_at END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_transaction_status_change
BEFORE UPDATE ON public.payment_transactions
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION update_payment_transaction_timestamp();
