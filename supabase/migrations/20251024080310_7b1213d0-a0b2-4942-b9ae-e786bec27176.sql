-- Add source and order_type columns to orders table to track order origin
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'dine-in';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_source ON public.orders(source);
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON public.orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- Add comment for documentation
COMMENT ON COLUMN public.orders.source IS 'Order source: pos, table, manual, room_service, qsr';
COMMENT ON COLUMN public.orders.order_type IS 'Order type: dine-in, takeaway, delivery';