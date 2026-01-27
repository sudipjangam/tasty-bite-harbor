-- Phase 1: Database Performance and Constraints
-- Add priority indexes and description character limit

-- 1. Add indexes for priority columns (improve query performance)
-- Using partial indexes to only index non-default values
CREATE INDEX IF NOT EXISTS idx_orders_priority 
ON orders(priority) 
WHERE priority IN ('rush', 'vip');

CREATE INDEX IF NOT EXISTS idx_kitchen_orders_priority 
ON kitchen_orders(priority) 
WHERE priority IN ('rush', 'vip');

-- 2. Add character limit to menu item descriptions (prevent UI breakage)
ALTER TABLE menu_items 
ADD CONSTRAINT description_length_check 
CHECK (char_length(description) <= 200);

-- 3. Verify indexes created
SELECT 
  schemaname, 
  tablename, 
  indexname, 
  indexdef
FROM pg_indexes
WHERE tablename IN ('orders', 'kitchen_orders')
AND indexname LIKE '%priority%'
ORDER BY tablename, indexname;

-- 4. Verify constraint created
SELECT 
  conname, 
  contype,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'menu_items'::regclass
AND conname = 'description_length_check';

-- 5. Check current menu item descriptions don't violate constraint
SELECT 
  id, 
  name, 
  char_length(description) as description_length
FROM menu_items
WHERE char_length(description) > 200
ORDER BY char_length(description) DESC;

-- Expected: No rows (all descriptions should be under 200 chars)

-- 6. Test query performance with new index
EXPLAIN ANALYZE 
SELECT id, source, items, status, priority, created_at
FROM kitchen_orders 
WHERE priority = 'rush' 
ORDER BY created_at DESC
LIMIT 20;

-- Should show "Index Scan using idx_kitchen_orders_priority"
