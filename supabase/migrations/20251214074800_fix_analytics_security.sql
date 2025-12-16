-- Secure version of get_analytics_data
-- Adds a check to ensure the requesting user actually belongs to the requested restaurant_id

CREATE OR REPLACE FUNCTION public.get_analytics_data(
  p_restaurant_id uuid,
  p_start_date text,
  p_end_date text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  total_revenue numeric := 0;
  total_orders integer := 0;
  avg_order_value numeric := 0;
  new_customers integer := 0;
  daily_revenue jsonb;
  sales_by_category jsonb;
  top_products jsonb;
  start_timestamp timestamptz;
  end_timestamp timestamptz;
BEGIN
  -- SECURITY CHECK: Ensure the user belongs to the requested restaurant
  IF NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND restaurant_id = p_restaurant_id
  ) THEN
      RAISE EXCEPTION 'Access Denied: You do not belong to this restaurant';
  END IF;

  -- Convert text dates to timestamptz with proper timezone handling
  start_timestamp := (p_start_date || ' 00:00:00')::timestamptz;
  end_timestamp := (p_end_date || ' 23:59:59')::timestamptz;

  -- Calculate revenue from COMPLETED orders (exclude cancelled and refunded)
  SELECT 
    COALESCE(SUM(total), 0),
    COUNT(*),
    COALESCE(AVG(total), 0)
  INTO total_revenue, total_orders, avg_order_value
  FROM orders
  WHERE restaurant_id = p_restaurant_id
    AND status NOT IN ('cancelled', 'refunded')
    AND created_at BETWEEN start_timestamp AND end_timestamp;

  -- Add hotel revenue from PAID room billings
  SELECT total_revenue + COALESCE(SUM(total_amount), 0)
  INTO total_revenue
  FROM room_billings
  WHERE restaurant_id = p_restaurant_id
    AND payment_status = 'paid'
    AND billing_date BETWEEN start_timestamp AND end_timestamp;

  -- Count new customers in date range
  SELECT COUNT(DISTINCT id)
  INTO new_customers
  FROM customers
  WHERE restaurant_id = p_restaurant_id
    AND created_at BETWEEN start_timestamp AND end_timestamp;

  -- Daily revenue trend (restaurant + hotel combined)
  WITH restaurant_daily AS (
    SELECT 
      created_at::date as date,
      SUM(total) as revenue
    FROM orders
    WHERE restaurant_id = p_restaurant_id
      AND status NOT IN ('cancelled', 'refunded')
      AND created_at BETWEEN start_timestamp AND end_timestamp
    GROUP BY created_at::date
  ),
  hotel_daily AS (
    SELECT 
      billing_date::date as date,
      SUM(total_amount) as revenue
    FROM room_billings
    WHERE restaurant_id = p_restaurant_id
      AND payment_status = 'paid'
      AND billing_date BETWEEN start_timestamp AND end_timestamp
    GROUP BY billing_date::date
  ),
  combined_daily AS (
    SELECT date, SUM(revenue) as revenue
    FROM (
      SELECT * FROM restaurant_daily
      UNION ALL
      SELECT * FROM hotel_daily
    ) all_revenue
    GROUP BY date
    ORDER BY date
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', date::text,
      'revenue', revenue
    )
  )
  INTO daily_revenue
  FROM combined_daily;

  -- Sales by category from order items JSON
  WITH category_sales AS (
    SELECT 
      COALESCE(
        (SELECT category FROM menu_items WHERE name = item->>'name' LIMIT 1),
        'Other'
      ) as category,
      SUM((item->>'price')::numeric * COALESCE((item->>'quantity')::numeric, 1)) as value
    FROM orders,
    LATERAL jsonb_array_elements(
      CASE 
        WHEN jsonb_typeof(items) = 'array' THEN items
        ELSE '[]'::jsonb
      END
    ) as item
    WHERE restaurant_id = p_restaurant_id
      AND status NOT IN ('cancelled', 'refunded')
      AND created_at BETWEEN start_timestamp AND end_timestamp
    GROUP BY category
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', category,
      'value', value
    ) ORDER BY value DESC
  )
  INTO sales_by_category
  FROM category_sales;

  -- Top performing products
  WITH product_sales AS (
    SELECT 
      item->>'name' as product_name,
      SUM((item->>'price')::numeric * COALESCE((item->>'quantity')::numeric, 1)) as total_revenue,
      SUM(COALESCE((item->>'quantity')::numeric, 1)) as total_quantity
    FROM orders,
    LATERAL jsonb_array_elements(
      CASE 
        WHEN jsonb_typeof(items) = 'array' THEN items
        ELSE '[]'::jsonb
      END
    ) as item
    WHERE restaurant_id = p_restaurant_id
      AND status NOT IN ('cancelled', 'refunded')
      AND created_at BETWEEN start_timestamp AND end_timestamp
      AND item->>'name' IS NOT NULL
    GROUP BY item->>'name'
    ORDER BY total_revenue DESC
    LIMIT 10
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', product_name,
      'revenue', total_revenue,
      'quantity', total_quantity
    )
  )
  INTO top_products
  FROM product_sales;

  -- Build final result
  result := jsonb_build_object(
    'kpis', jsonb_build_object(
      'totalRevenue', total_revenue,
      'totalOrders', total_orders,
      'avgOrderValue', avg_order_value,
      'newCustomers', new_customers
    ),
    'charts', jsonb_build_object(
      'dailyRevenue', COALESCE(daily_revenue, '[]'::jsonb),
      'salesByCategory', COALESCE(sales_by_category, '[]'::jsonb),
      'topProducts', COALESCE(top_products, '[]'::jsonb)
    )
  );

  RETURN result;
END;
$$;
