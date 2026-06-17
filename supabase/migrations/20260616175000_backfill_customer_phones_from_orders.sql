-- Backfill: copy customer_phone from orders into customers table
-- where customers.phone is NULL but orders have a phone for that customer_name
-- Skips phones already assigned to another customer (prevents unique constraint violation)

-- Step 1: Update customers who have NULL phone but matching orders have phone
UPDATE public.customers c
SET phone = sub.order_phone
FROM (
    SELECT DISTINCT ON (o.customer_name, o.restaurant_id)
        o.customer_name,
        o.restaurant_id,
        o.customer_phone AS order_phone
    FROM public.orders o
    WHERE o.customer_phone IS NOT NULL
      AND o.customer_phone != ''
      AND o.customer_name IS NOT NULL
      AND o.customer_name != ''
    ORDER BY o.customer_name, o.restaurant_id, o.created_at DESC
) sub
WHERE LOWER(TRIM(c.name)) = LOWER(TRIM(sub.customer_name))
  AND c.restaurant_id = sub.restaurant_id
  AND (c.phone IS NULL OR c.phone = '')
  AND NOT EXISTS (
      SELECT 1 FROM public.customers c2
      WHERE c2.restaurant_id = sub.restaurant_id
        AND c2.phone = sub.order_phone
        AND c2.id != c.id
  );

-- Step 2: Create missing customer records for orders that have 
-- customer_name + customer_phone but no matching customers entry
-- Also skips if phone already belongs to another customer
INSERT INTO public.customers (name, phone, restaurant_id, visit_count, total_spent, loyalty_points, tags, last_visit_date, average_order_value)
SELECT 
    sub.customer_name,
    sub.customer_phone,
    sub.restaurant_id,
    sub.order_count,
    sub.total_spent,
    0,
    ARRAY['auto-synced']::text[],
    sub.last_order_date,
    CASE WHEN sub.order_count > 0 THEN sub.total_spent / sub.order_count ELSE 0 END
FROM (
    SELECT 
        o.customer_name,
        o.customer_phone,
        o.restaurant_id,
        COUNT(*) AS order_count,
        SUM(COALESCE(o.total, 0)) AS total_spent,
        MAX(o.created_at) AS last_order_date
    FROM public.orders o
    WHERE o.customer_name IS NOT NULL
      AND o.customer_name != ''
      AND o.customer_phone IS NOT NULL
      AND o.customer_phone != ''
      AND NOT EXISTS (
          SELECT 1 FROM public.customers c
          WHERE LOWER(TRIM(c.name)) = LOWER(TRIM(o.customer_name))
            AND c.restaurant_id = o.restaurant_id
      )
      AND NOT EXISTS (
          SELECT 1 FROM public.customers c2
          WHERE c2.restaurant_id = o.restaurant_id
            AND c2.phone = o.customer_phone
      )
      AND LOWER(TRIM(o.customer_name)) NOT IN (
          'nc', 'delivery', 'takeaway', 'dine-in', 'dine in',
          'pos order', 'qsr order', 'qsr-order', 'walk-in', 'walk in',
          'walkin', 'walk-in customer', 'walkin customer', 'guest', 'customer'
      )
    GROUP BY o.customer_name, o.customer_phone, o.restaurant_id
) sub;
