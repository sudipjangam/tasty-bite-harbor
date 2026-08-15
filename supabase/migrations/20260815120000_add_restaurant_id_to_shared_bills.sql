-- Add restaurant_id to shared_bills for RLS and multi-tenant scoping
ALTER TABLE shared_bills
  ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id) ON DELETE SET NULL;

-- Index for fast lookups by restaurant
CREATE INDEX IF NOT EXISTS idx_shared_bills_restaurant_id
  ON shared_bills(restaurant_id);
