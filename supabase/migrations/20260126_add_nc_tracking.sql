-- Migration: Add NC (Non-Chargeable) Order Tracking
-- Description: Add fields to track NC order reasons and original subtotals for cost analysis

-- Add nc_reason column to track why order was marked as non-chargeable
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS nc_reason TEXT;

-- Add original_subtotal to preserve pre-discount amount for NC orders
-- This allows us to track the "cost" of NC orders even though total is 0
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS original_subtotal NUMERIC;

-- Add index for faster NC order queries
CREATE INDEX IF NOT EXISTS idx_orders_nc_type 
ON orders(order_type) 
WHERE order_type = 'non-chargeable';

-- Add index for NC reason analysis
CREATE INDEX IF NOT EXISTS idx_orders_nc_reason 
ON orders(nc_reason) 
WHERE nc_reason IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN orders.nc_reason IS 'Reason why order was marked as non-chargeable (staff_meal, promotional, vip_guest, complaint, management, event, other)';
COMMENT ON COLUMN orders.original_subtotal IS 'Original subtotal before NC discount was applied, used for cost tracking';
