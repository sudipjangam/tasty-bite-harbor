-- Add columns to orders table to support room charges
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'paid';

-- Add order_id to room_food_orders table to link orders
ALTER TABLE public.room_food_orders
ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_reservation_id ON public.orders(reservation_id);
CREATE INDEX IF NOT EXISTS idx_room_food_orders_order_id ON public.room_food_orders(order_id);

-- Add comment to explain payment_status values
COMMENT ON COLUMN public.orders.payment_status IS 'Payment status: paid, pending, Pending - Room Charge';
