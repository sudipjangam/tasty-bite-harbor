-- DB-level guard: prevent duplicate order_number per restaurant per day
-- This catches any edge cases where frontend logic fails to prevent duplicates
-- Uses a partial index (only where order_number IS NOT NULL) to avoid bloating

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_unique_order_number_per_day
  ON public.orders (restaurant_id, order_number, (created_at::date))
  WHERE order_number IS NOT NULL;

-- Also add index to quickly find orphaned orders (for the PaymentDialog fix)
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_customer_status_today
  ON public.orders (restaurant_id, customer_name, status, created_at DESC);
