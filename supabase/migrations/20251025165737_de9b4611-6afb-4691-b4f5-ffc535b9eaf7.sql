-- Add customer_phone to kitchen_orders to allow saving/fetching mobile number before final order creation
ALTER TABLE public.kitchen_orders
ADD COLUMN IF NOT EXISTS customer_phone text;

-- Optional: basic index for lookups by phone if needed later (safe no-op if already exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_kitchen_orders_customer_phone'
  ) THEN
    CREATE INDEX idx_kitchen_orders_customer_phone ON public.kitchen_orders (customer_phone);
  END IF;
END $$;
