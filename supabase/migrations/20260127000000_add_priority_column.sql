-- Add priority column to orders table if it doesn't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'rush', 'vip'));

-- Add priority column to kitchen_orders table if it doesn't exist  
ALTER TABLE kitchen_orders ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'rush', 'vip'));

-- Add comment
COMMENT ON COLUMN orders.priority IS 'Order priority level: normal, rush, or vip';
COMMENT ON COLUMN kitchen_orders.priority IS 'Order priority level: normal, rush, or vip';
