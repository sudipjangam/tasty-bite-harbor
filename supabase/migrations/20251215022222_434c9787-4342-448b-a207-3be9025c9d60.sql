
-- Fix 1: Enable RLS on tables with policies but RLS disabled
ALTER TABLE public.kitchen_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sent_promotions ENABLE ROW LEVEL SECURITY;

-- Fix 2: Add search_path to functions that are missing it
-- update_room_status
CREATE OR REPLACE FUNCTION public.update_room_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    UPDATE rooms 
    SET status = 'occupied'
    WHERE id = NEW.room_id
    AND status = 'available';
    RETURN NEW;
END;
$function$;

-- reset_notification_sent
CREATE OR REPLACE FUNCTION public.reset_notification_sent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    IF (NEW.quantity > COALESCE(NEW.reorder_level, 0) AND NEW.notification_sent = true) THEN
        NEW.notification_sent := false;
    END IF;
    
    IF (OLD.quantity > COALESCE(NEW.reorder_level, 0) AND NEW.quantity <= COALESCE(NEW.reorder_level, 0)) THEN
        INSERT INTO inventory_alerts (
            restaurant_id,
            inventory_item_id,
            alert_type,
            message
        ) VALUES (
            NEW.restaurant_id,
            NEW.id,
            'low_stock',
            'Item "' || NEW.name || '" is running low. Current quantity: ' || NEW.quantity || ' ' || NEW.unit || ', Reorder level: ' || COALESCE(NEW.reorder_level, 0) || ' ' || NEW.unit
        );
    END IF;
    
    RETURN NEW;
END;
$function$;

-- generate_time_slots_for_date
CREATE OR REPLACE FUNCTION public.generate_time_slots_for_date(p_restaurant_id uuid, p_date date, p_slot_duration_minutes integer DEFAULT 30)
RETURNS TABLE(time_slot time without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  opening_time TIME;
  closing_time TIME;
  current_slot TIME;
  day_of_week INTEGER;
BEGIN
  day_of_week := EXTRACT(DOW FROM p_date);
  
  SELECT roh.opening_time, roh.closing_time
  INTO opening_time, closing_time
  FROM restaurant_operating_hours roh
  WHERE roh.restaurant_id = p_restaurant_id
  AND roh.day_of_week = day_of_week
  AND roh.is_closed = false;
  
  IF opening_time IS NULL THEN
    RETURN;
  END IF;
  
  current_slot := opening_time;
  WHILE current_slot < closing_time LOOP
    time_slot := current_slot;
    RETURN NEXT;
    current_slot := current_slot + (p_slot_duration_minutes || ' minutes')::INTERVAL;
  END LOOP;
END;
$function$;

-- get_customer_activities
CREATE OR REPLACE FUNCTION public.get_customer_activities(customer_id_param uuid)
RETURNS SETOF customer_activities
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.customer_activities
  WHERE customer_id = customer_id_param
  ORDER BY created_at DESC;
END;
$function$;

-- get_customer_notes
CREATE OR REPLACE FUNCTION public.get_customer_notes(customer_id_param uuid)
RETURNS SETOF customer_notes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.customer_notes
  WHERE customer_id = customer_id_param
  ORDER BY created_at DESC;
END;
$function$;

-- update_daily_revenue_stats
CREATE OR REPLACE FUNCTION public.update_daily_revenue_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
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
    AND status != 'cancelled'
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

-- suggest_purchase_orders
CREATE OR REPLACE FUNCTION public.suggest_purchase_orders(restaurant_id_param uuid)
RETURNS TABLE(supplier_id uuid, supplier_name text, items_count integer, estimated_total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  WITH low_stock_items AS (
    SELECT 
      ii.*,
      s.id as supplier_id,
      s.name as supplier_name,
      (ii.reorder_level * 2 - ii.quantity) as suggested_quantity,
      COALESCE(ii.cost_per_unit, 0) as unit_cost
    FROM inventory_items ii
    CROSS JOIN suppliers s
    WHERE ii.restaurant_id = restaurant_id_param
      AND s.restaurant_id = restaurant_id_param
      AND s.is_active = true
      AND ii.reorder_level IS NOT NULL
      AND ii.quantity <= ii.reorder_level
  )
  SELECT 
    lsi.supplier_id,
    lsi.supplier_name,
    COUNT(*)::INTEGER as items_count,
    SUM(lsi.suggested_quantity * lsi.unit_cost) as estimated_total
  FROM low_stock_items lsi
  GROUP BY lsi.supplier_id, lsi.supplier_name
  ORDER BY estimated_total DESC;
END;
$function$;

-- update_inventory_from_purchase_order
CREATE OR REPLACE FUNCTION public.update_inventory_from_purchase_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF OLD.received_quantity IS DISTINCT FROM NEW.received_quantity THEN
    UPDATE inventory_items 
    SET quantity = quantity + (NEW.received_quantity - OLD.received_quantity),
        updated_at = now()
    WHERE id = NEW.inventory_item_id;
    
    INSERT INTO inventory_transactions (
      restaurant_id,
      inventory_item_id,
      transaction_type,
      quantity_change,
      reference_type,
      reference_id,
      notes,
      created_by
    )
    SELECT 
      po.restaurant_id,
      NEW.inventory_item_id,
      'purchase',
      (NEW.received_quantity - OLD.received_quantity),
      'purchase_order_id',
      NEW.purchase_order_id,
      'Received from purchase order: ' || po.order_number,
      po.created_by
    FROM purchase_orders po
    WHERE po.id = NEW.purchase_order_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- update_roles_updated_at
CREATE OR REPLACE FUNCTION public.update_roles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
