-- Migration: Add scalability columns to kitchen_orders
-- Description: Adds priority, station, time tracking, and item completion persistence

-- Add priority column with enum-like constraint
ALTER TABLE public.kitchen_orders
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'rush', 'vip'));

-- Add station column for multi-station filtering
ALTER TABLE public.kitchen_orders
ADD COLUMN IF NOT EXISTS station TEXT;

-- Add time tracking columns
ALTER TABLE public.kitchen_orders
ADD COLUMN IF NOT EXISTS estimated_prep_time INTEGER; -- in minutes

ALTER TABLE public.kitchen_orders
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

ALTER TABLE public.kitchen_orders
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE public.kitchen_orders
ADD COLUMN IF NOT EXISTS bumped_at TIMESTAMPTZ;

-- Add item completion status for persistence across devices
ALTER TABLE public.kitchen_orders
ADD COLUMN IF NOT EXISTS item_completion_status JSONB DEFAULT '[]'::jsonb;

-- Add enhanced order information columns
ALTER TABLE public.kitchen_orders
ADD COLUMN IF NOT EXISTS customer_name TEXT;

ALTER TABLE public.kitchen_orders
ADD COLUMN IF NOT EXISTS server_name TEXT;

ALTER TABLE public.kitchen_orders
ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'dine_in' CHECK (order_type IN ('dine_in', 'takeaway', 'delivery', 'room_service'));

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_kitchen_orders_status_created
ON public.kitchen_orders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kitchen_orders_priority
ON public.kitchen_orders (priority);

CREATE INDEX IF NOT EXISTS idx_kitchen_orders_station
ON public.kitchen_orders (station);

CREATE INDEX IF NOT EXISTS idx_kitchen_orders_restaurant_status
ON public.kitchen_orders (restaurant_id, status);

CREATE INDEX IF NOT EXISTS idx_kitchen_orders_bumped
ON public.kitchen_orders (bumped_at) WHERE bumped_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.kitchen_orders.priority IS 'Order priority: normal (default), rush (expedited), vip (VIP customer)';
COMMENT ON COLUMN public.kitchen_orders.station IS 'Kitchen station assignment: grill, fryer, salad, drinks, dessert, etc.';
COMMENT ON COLUMN public.kitchen_orders.estimated_prep_time IS 'Estimated preparation time in minutes';
COMMENT ON COLUMN public.kitchen_orders.started_at IS 'Timestamp when order moved to preparing status';
COMMENT ON COLUMN public.kitchen_orders.completed_at IS 'Timestamp when order marked as ready';
COMMENT ON COLUMN public.kitchen_orders.bumped_at IS 'Timestamp when order was bumped/archived from display';
COMMENT ON COLUMN public.kitchen_orders.item_completion_status IS 'JSON array tracking completion status of individual items';
COMMENT ON COLUMN public.kitchen_orders.order_type IS 'Type of order: dine_in, takeaway, delivery, room_service';
