-- Add customer details columns to orders table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'orders' 
                   AND column_name = 'customer_name') THEN
        ALTER TABLE public.orders ADD COLUMN customer_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'orders' 
                   AND column_name = 'customer_phone') THEN
        ALTER TABLE public.orders ADD COLUMN customer_phone TEXT;
    END IF;
END $$;

-- Add index for customer phone lookups
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);

-- Add comment to explain the columns
COMMENT ON COLUMN public.orders.customer_name IS 'Customer name for bill sending';
COMMENT ON COLUMN public.orders.customer_phone IS 'Customer phone number for WhatsApp bill sending';