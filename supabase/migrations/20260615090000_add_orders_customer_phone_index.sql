-- Composite index for fast lookup of a customer's last order
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_customer_phone
  ON public.orders (restaurant_id, customer_phone, created_at DESC);
