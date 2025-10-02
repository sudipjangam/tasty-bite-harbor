-- Add source column to orders table to track order origin (QSR, POS, etc.)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source text DEFAULT 'pos';

-- Add index for better filtering performance
CREATE INDEX IF NOT EXISTS idx_orders_source ON orders(source);

-- Add comment to explain the column
COMMENT ON COLUMN orders.source IS 'Order source: qsr, pos, room_service, etc.';