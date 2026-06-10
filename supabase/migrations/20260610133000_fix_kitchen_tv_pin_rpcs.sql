-- Fix get_kitchen_orders_by_pin return type
DROP FUNCTION IF EXISTS public.get_kitchen_orders_by_pin(uuid, text);

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

-- Fix update_kitchen_order_status_by_pin type cast
CREATE OR REPLACE FUNCTION public.update_kitchen_order_status_by_pin(p_order_id uuid, p_restaurant_id uuid, p_pin text, p_status text, p_started_at text DEFAULT NULL::text, p_completed_at text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_order_id UUID;
  v_status TEXT;
BEGIN
  -- Verify PIN or authenticated owner
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.restaurant_settings 
      WHERE restaurant_id = p_restaurant_id AND kitchen_pin = p_pin
    ) OR (
      auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND restaurant_id = p_restaurant_id
      )
    )
  ) THEN
    RAISE EXCEPTION 'Invalid kitchen credentials';
  END IF;

  -- Update kitchen order status
  UPDATE public.kitchen_orders
  SET 
    status = p_status,
    started_at = CASE WHEN p_started_at IS NOT NULL THEN p_started_at::TIMESTAMPTZ ELSE started_at END,
    completed_at = CASE WHEN p_completed_at IS NOT NULL THEN p_completed_at::TIMESTAMPTZ ELSE completed_at END
  WHERE id = p_order_id AND restaurant_id = p_restaurant_id;

  -- Sync corresponding order in orders table
  SELECT order_id INTO v_order_id FROM public.kitchen_orders WHERE id = p_order_id;
  IF v_order_id IS NOT NULL THEN
    v_status := 'pending';
    IF p_status = 'preparing' THEN v_status := 'preparing'; END IF;
    IF p_status = 'ready' THEN v_status := 'completed'; END IF;
    
    UPDATE public.orders SET status = v_status WHERE id = v_order_id;
  END IF;
END;
$function$;

-- Fix update_kitchen_order_priority_by_pin type cast
CREATE OR REPLACE FUNCTION public.update_kitchen_order_priority_by_pin(p_order_id uuid, p_restaurant_id uuid, p_pin text, p_priority text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Verify PIN or authenticated owner
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.restaurant_settings 
      WHERE restaurant_id = p_restaurant_id AND kitchen_pin = p_pin
    ) OR (
      auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND restaurant_id = p_restaurant_id
      )
    )
  ) THEN
    RAISE EXCEPTION 'Invalid kitchen credentials';
  END IF;

  UPDATE public.kitchen_orders
  SET priority = p_priority
  WHERE id = p_order_id AND restaurant_id = p_restaurant_id;
END;
$function$;

-- Drop ambiguous boolean[] overload
DROP FUNCTION IF EXISTS public.update_kitchen_item_complete_by_pin(uuid, uuid, text, boolean[]);
