-- Drop all known overloads of the functions to ensure clean slate
DROP FUNCTION IF EXISTS public.update_kitchen_order_status_by_pin(uuid, uuid, text, text, text, text);
DROP FUNCTION IF EXISTS public.update_kitchen_order_status_by_pin(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.update_kitchen_order_status_by_pin(uuid, uuid, text, kitchen_order_status);

DROP FUNCTION IF EXISTS public.update_kitchen_order_priority_by_pin(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.update_kitchen_order_priority_by_pin(uuid, uuid, text, kitchen_order_priority);

-- Recreate update_kitchen_order_status_by_pin with TEXT
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

-- Recreate update_kitchen_order_priority_by_pin with TEXT
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
