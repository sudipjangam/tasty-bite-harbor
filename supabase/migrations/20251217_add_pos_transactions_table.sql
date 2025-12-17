-- Create pos_transactions table for payment transaction logging
-- This migration adds transaction logging for POS payments

CREATE TABLE IF NOT EXISTS pos_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  kitchen_order_id UUID REFERENCES kitchen_orders(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'upi', 'room')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  customer_name TEXT,
  customer_phone TEXT,
  staff_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  promotion_id UUID REFERENCES promotion_campaigns(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pos_transactions_restaurant_id ON pos_transactions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_order_id ON pos_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_created_at ON pos_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_payment_method ON pos_transactions(payment_method);

-- Enable Row Level Security
ALTER TABLE pos_transactions ENABLE ROW LEVEL SECURITY;

-- Policy for restaurant members to manage transactions
CREATE POLICY "Restaurant members can view transactions"
  ON pos_transactions
  FOR SELECT
  USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Restaurant members can insert transactions"
  ON pos_transactions
  FOR INSERT
  WITH CHECK (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  ));

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_pos_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pos_transactions_updated_at
  BEFORE UPDATE ON pos_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_pos_transactions_updated_at();

-- Add comment for documentation
COMMENT ON TABLE pos_transactions IS 'Stores all POS payment transactions for audit and reporting purposes';
