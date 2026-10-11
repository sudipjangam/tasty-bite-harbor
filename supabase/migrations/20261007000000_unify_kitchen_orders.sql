-- Migration to unify kitchen_orders and orders

-- 1. Add kitchen columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS kitchen_status text DEFAULT 'new',
ADD COLUMN IF NOT EXISTS kitchen_items jsonb,
ADD COLUMN IF NOT EXISTS bumped_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS round_number integer,
ADD COLUMN IF NOT EXISTS server_name text,
ADD COLUMN IF NOT EXISTS station text,
ADD COLUMN IF NOT EXISTS estimated_prep_time integer;

-- 2. Migrate existing data from kitchen_orders to orders
UPDATE public.orders o
SET 
  kitchen_status = k.status,
  kitchen_items = k.items,
  bumped_at = k.bumped_at,
  completed_at = k.completed_at,
  round_number = k.round_number,
  server_name = k.server_name,
  station = k.station,
  estimated_prep_time = k.estimated_prep_time
FROM public.kitchen_orders k
WHERE k.order_id = o.id;
