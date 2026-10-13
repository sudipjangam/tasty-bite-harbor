-- Add barcode column to inventory_items
ALTER TABLE public.inventory_items
ADD COLUMN IF NOT EXISTS barcode TEXT;

-- Drop legacy non-unique index if present
DROP INDEX IF EXISTS public.idx_inventory_items_barcode;

-- Unique partial index on restaurant_id and case-normalized trimmed barcode
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_items_barcode_unique
ON public.inventory_items (restaurant_id, lower(trim(barcode)))
WHERE barcode IS NOT NULL;
