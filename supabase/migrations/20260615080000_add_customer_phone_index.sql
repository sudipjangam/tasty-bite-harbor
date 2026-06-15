-- Composite index for fast customer phone lookup in QuickServe POS
-- Covers: SELECT ... FROM customers WHERE restaurant_id = ? AND phone = ?
-- With 10K+ rows, this turns a seq scan into an index scan (~0.1ms vs ~50ms)

CREATE INDEX IF NOT EXISTS idx_customers_restaurant_phone 
  ON public.customers (restaurant_id, phone);

-- Also add index on phone alone for cross-restaurant lookups if ever needed
CREATE INDEX IF NOT EXISTS idx_customers_phone 
  ON public.customers (phone);
