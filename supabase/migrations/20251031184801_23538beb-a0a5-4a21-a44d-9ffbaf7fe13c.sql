-- Create RPC function to get comprehensive analytics data
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
BEGIN
  -- Calculate KPIs from orders (excluding cancelled)
  SELECT 
    COALESCE(SUM(total), 0),
    COUNT(*),
    COALESCE(AVG(total), 0)
  INTO total_revenue, total_orders, avg_order_value
  FROM orders
  WHERE restaurant_id = p_restaurant_id
    AND status != 'cancelled'
    AND created_at::date BETWEEN p_start_date::date AND p_end_date::date;

  -- Add room billings to revenue
  SELECT total_revenue + COALESCE(SUM(total_amount), 0)
  INTO total_revenue
  FROM room_billings
  WHERE restaurant_id = p_restaurant_id
    AND created_at::date BETWEEN p_start_date::date AND p_end_date::date;

  -- Count new customers in the period
  SELECT COUNT(DISTINCT id)
  INTO new_customers
  FROM customers
  WHERE restaurant_id = p_restaurant_id
    AND created_at::date BETWEEN p_start_date::date AND p_end_date::date;

  -- Daily revenue trend
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', day_data.date::text,
      'revenue', day_data.revenue
    ) ORDER BY day_data.date
  )
  INTO daily_revenue
  FROM (
    SELECT 
      created_at::date as date,
      SUM(total) as revenue
    FROM orders
    WHERE restaurant_id = p_restaurant_id
      AND status != 'cancelled'
      AND created_at::date BETWEEN p_start_date::date AND p_end_date::date
    GROUP BY created_at::date
    
    UNION ALL
    
    SELECT 
      created_at::date as date,
      SUM(total_amount) as revenue
    FROM room_billings
    WHERE restaurant_id = p_restaurant_id
      AND created_at::date BETWEEN p_start_date::date AND p_end_date::date
    GROUP BY created_at::date
  ) day_data
  GROUP BY date;

  -- Sales by category (Food vs Rooms)
  WITH food_sales AS (
    SELECT COALESCE(SUM(total), 0) as value
    FROM orders
    WHERE restaurant_id = p_restaurant_id
      AND status != 'cancelled'
      AND created_at::date BETWEEN p_start_date::date AND p_end_date::date
  ),
  room_sales AS (
    SELECT COALESCE(SUM(total_amount), 0) as value
    FROM room_billings
    WHERE restaurant_id = p_restaurant_id
      AND created_at::date BETWEEN p_start_date::date AND p_end_date::date
  )
  SELECT jsonb_agg(category_data)
  INTO sales_by_category
  FROM (
    SELECT jsonb_build_object('name', 'Food & Beverage', 'value', value) as category_data
    FROM food_sales
    UNION ALL
    SELECT jsonb_build_object('name', 'Room Services', 'value', value)
    FROM room_sales
  ) categories;

  -- Top performing products
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', product_name,
      'revenue', total_revenue
    ) ORDER BY total_revenue DESC
  )
  INTO top_products
  FROM (
    SELECT 
      (jsonb_array_elements(items)->>'name') as product_name,
      SUM((jsonb_array_elements(items)->>'price')::numeric * 
          COALESCE((jsonb_array_elements(items)->>'quantity')::numeric, 1)) as total_revenue
    FROM orders
    WHERE restaurant_id = p_restaurant_id
      AND status != 'cancelled'
      AND created_at::date BETWEEN p_start_date::date AND p_end_date::date
    GROUP BY product_name
    ORDER BY total_revenue DESC
    LIMIT 10
  ) products;

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