-- Add round_number column for tracking KOT rounds (additions to existing orders)
ALTER TABLE public.kitchen_orders
ADD COLUMN IF NOT EXISTS round_number INTEGER DEFAULT 1;

COMMENT ON COLUMN public.kitchen_orders.round_number IS 'KOT round number - increments when items are added to an existing order';

-- Also update order_type CHECK constraint to allow 'nc' (non-chargeable) orders
ALTER TABLE public.kitchen_orders DROP CONSTRAINT IF EXISTS kitchen_orders_order_type_check;
ALTER TABLE public.kitchen_orders ADD CONSTRAINT kitchen_orders_order_type_check
  CHECK (order_type IN ('dine_in', 'takeaway', 'delivery', 'room_service', 'nc'));
