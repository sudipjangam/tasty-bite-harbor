CREATE OR REPLACE FUNCTION public.get_kitchen_orders_by_pin(p_restaurant_id uuid, p_pin text)
 RETURNS TABLE(id uuid, restaurant_id uuid, source text, status text, items jsonb, item_completion_status jsonb, priority text, order_id uuid, station text, order_type text, customer_name text, server_name text, table_number text, created_at timestamp with time zone, started_at timestamp with time zone, completed_at timestamp with time zone, bumped_at timestamp with time zone, estimated_prep_time integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Verify PIN or authenticated owner
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.restaurant_settings rs
      WHERE rs.restaurant_id = p_restaurant_id AND rs.kitchen_pin = p_pin
    ) OR (
      auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.restaurant_id = p_restaurant_id
      )
    )
  ) THEN
    RAISE EXCEPTION 'Invalid kitchen credentials';
  END IF;

  RETURN QUERY
  SELECT 
    ko.id,
    ko.restaurant_id,
    ko.source,
    ko.status::TEXT,
    ko.items,
    ko.item_completion_status,
    ko.priority::TEXT,
    ko.order_id,
    ko.station,
    ko.order_type::TEXT,
    ko.customer_name,
    ko.server_name,
    ko.table_number,
    ko.created_at,
    ko.started_at,
    ko.completed_at,
    ko.bumped_at,
    ko.estimated_prep_time
  FROM public.kitchen_orders ko
  WHERE ko.restaurant_id = p_restaurant_id
    AND ko.bumped_at IS NULL
    AND ko.source NOT ILIKE 'QuickServe%'
  ORDER BY ko.created_at DESC;
END;
$function$;
