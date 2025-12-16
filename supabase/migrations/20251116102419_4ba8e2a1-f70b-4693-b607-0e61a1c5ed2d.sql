-- Add discount fields to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC DEFAULT 0;

-- Add comment to document the columns
COMMENT ON COLUMN public.orders.discount_amount IS 'The actual discount amount applied to the order';
COMMENT ON COLUMN public.orders.discount_percentage IS 'The discount percentage applied to the order';