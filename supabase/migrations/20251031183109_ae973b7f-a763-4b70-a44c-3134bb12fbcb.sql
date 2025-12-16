-- Update the daily revenue stats trigger function to exclude cancelled orders

CREATE OR REPLACE FUNCTION public.update_daily_revenue_stats()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Insert or update daily stats - ONLY count completed orders, exclude cancelled
  INSERT INTO daily_revenue_stats (
    restaurant_id,
    date,
    total_revenue,
    order_count,
    average_order_value
  )
  SELECT
    restaurant_id,
    DATE(created_at) as date,
    SUM(total) as total_revenue,
    COUNT(*) as order_count,
    AVG(total) as average_order_value
  FROM orders
  WHERE restaurant_id = COALESCE(NEW.restaurant_id, OLD.restaurant_id)
    AND DATE(created_at) = DATE(COALESCE(NEW.created_at, OLD.created_at))
    AND status != 'cancelled' -- Exclude cancelled orders
  GROUP BY restaurant_id, DATE(created_at)
  ON CONFLICT (restaurant_id, date)
  DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    order_count = EXCLUDED.order_count,
    average_order_value = EXCLUDED.average_order_value,
    updated_at = NOW();
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;