-- Phase 1: Critical Security Fixes
-- Part 1: Fix SECURITY DEFINER functions to prevent search_path exploits

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
    INSERT INTO public.profiles (id, role)
    VALUES (new.id, 'manager');
    RETURN new;
END;
$function$;

-- Fix audit_log_changes function
CREATE OR REPLACE FUNCTION public.audit_log_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
    INSERT INTO public.audit_logs (
        restaurant_id,
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values
    )
    VALUES (
        COALESCE(NEW.restaurant_id, OLD.restaurant_id),
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Fix calculate_recipe_cost function
CREATE OR REPLACE FUNCTION public.calculate_recipe_cost()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  UPDATE recipes
  SET 
    total_cost = (
      SELECT COALESCE(SUM(total_cost), 0)
      FROM recipe_ingredients
      WHERE recipe_id = NEW.recipe_id
    ),
    food_cost_percentage = CASE
      WHEN selling_price > 0 THEN 
        ((SELECT COALESCE(SUM(total_cost), 0)
          FROM recipe_ingredients
          WHERE recipe_id = NEW.recipe_id) / selling_price) * 100
      ELSE 0
    END,
    margin_percentage = CASE
      WHEN selling_price > 0 THEN 
        100 - (((SELECT COALESCE(SUM(total_cost), 0)
          FROM recipe_ingredients
          WHERE recipe_id = NEW.recipe_id) / selling_price) * 100)
      ELSE 0
    END,
    updated_at = now()
  WHERE id = NEW.recipe_id;
  
  RETURN NEW;
END;
$function$;

-- Fix sync_ingredient_cost function
CREATE OR REPLACE FUNCTION public.sync_ingredient_cost()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  NEW.cost_per_unit := (
    SELECT cost_per_unit
    FROM inventory_items
    WHERE id = NEW.inventory_item_id
  );
  
  NEW.total_cost := NEW.quantity * NEW.cost_per_unit;
  
  RETURN NEW;
END;
$function$;

-- Fix moddatetime function
CREATE OR REPLACE FUNCTION public.moddatetime()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$function$;

-- Fix get_loyalty_transactions function
CREATE OR REPLACE FUNCTION public.get_loyalty_transactions(customer_id_param uuid)
 RETURNS SETOF loyalty_transactions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.loyalty_transactions
  WHERE customer_id = customer_id_param
  ORDER BY created_at DESC;
END;
$function$;

-- Fix add_loyalty_transaction function
CREATE OR REPLACE FUNCTION public.add_loyalty_transaction(customer_id_param uuid, restaurant_id_param uuid, transaction_type_param text, points_param integer, source_param text, notes_param text, created_by_param uuid)
 RETURNS SETOF loyalty_transactions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  INSERT INTO public.loyalty_transactions (
    customer_id,
    restaurant_id,
    transaction_type,
    points,
    source,
    notes,
    created_by
  )
  VALUES (
    customer_id_param,
    restaurant_id_param,
    transaction_type_param,
    points_param,
    source_param,
    notes_param,
    created_by_param
  )
  RETURNING *;
END;
$function$;

-- Fix add_customer_note function
CREATE OR REPLACE FUNCTION public.add_customer_note(customer_id_param uuid, restaurant_id_param uuid, content_param text, created_by_param text)
 RETURNS SETOF customer_notes
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  INSERT INTO public.customer_notes (
    customer_id,
    restaurant_id,
    content,
    created_by
  )
  VALUES (
    customer_id_param,
    restaurant_id_param,
    content_param,
    created_by_param
  )
  RETURNING *;
END;
$function$;

-- Fix add_customer_activity function
CREATE OR REPLACE FUNCTION public.add_customer_activity(customer_id_param uuid, restaurant_id_param uuid, activity_type_param text, description_param text)
 RETURNS SETOF customer_activities
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  INSERT INTO public.customer_activities (
    customer_id,
    restaurant_id,
    activity_type,
    description
  )
  VALUES (
    customer_id_param,
    restaurant_id_param,
    activity_type_param,
    description_param
  )
  RETURNING *;
END;
$function$;

-- Fix calculate_customer_tier function
CREATE OR REPLACE FUNCTION public.calculate_customer_tier(customer_points integer, restaurant_id_param uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  tier_id UUID;
BEGIN
  SELECT id INTO tier_id
  FROM public.loyalty_tiers
  WHERE restaurant_id = restaurant_id_param
    AND points_required <= customer_points
  ORDER BY points_required DESC
  LIMIT 1;
  
  RETURN tier_id;
END;
$function$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
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

-- Fix sync_orders_status_from_kitchen function
CREATE OR REPLACE FUNCTION public.sync_orders_status_from_kitchen()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF NEW.order_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'preparing' THEN
    UPDATE public.orders SET status = 'preparing', updated_at = now() WHERE id = NEW.order_id;
  ELSIF NEW.status = 'ready' OR NEW.status = 'completed' THEN
    UPDATE public.orders SET status = 'completed', updated_at = now() WHERE id = NEW.order_id;
  ELSIF NEW.status = 'new' THEN
    UPDATE public.orders SET status = 'pending', updated_at = now() WHERE id = NEW.order_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- Fix user_has_role_or_permission function
CREATE OR REPLACE FUNCTION public.user_has_role_or_permission(required_roles text[], required_permissions text[] DEFAULT NULL::text[])
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  user_role text;
  user_restaurant_id uuid;
  has_permission boolean := false;
BEGIN
  SELECT role, restaurant_id INTO user_role, user_restaurant_id
  FROM profiles 
  WHERE id = auth.uid();
  
  IF user_role IS NULL THEN
    RETURN false;
  END IF;
  
  IF required_roles IS NOT NULL AND user_role = ANY(required_roles) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$function$;

-- Fix user_is_admin_or_owner function
CREATE OR REPLACE FUNCTION public.user_is_admin_or_owner(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  user_role TEXT;
  custom_role_name TEXT;
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = user_id;

  IF user_role IN ('admin', 'owner') THEN
    RETURN TRUE;
  END IF;

  SELECT r.name INTO custom_role_name
  FROM profiles p
  JOIN roles r ON p.role_id = r.id
  WHERE p.id = user_id;

  IF LOWER(custom_role_name) IN ('admin', 'owner') THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$function$;

-- Fix get_user_role_name function
CREATE OR REPLACE FUNCTION public.get_user_role_name(user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  custom_role_name TEXT;
  system_role TEXT;
BEGIN
  SELECT r.name INTO custom_role_name
  FROM profiles p
  JOIN roles r ON p.role_id = r.id
  WHERE p.id = user_id;

  IF custom_role_name IS NOT NULL THEN
    RETURN custom_role_name;
  END IF;

  SELECT role INTO system_role
  FROM profiles
  WHERE id = user_id;

  RETURN system_role;
END;
$function$;

-- Fix get_user_components function
CREATE OR REPLACE FUNCTION public.get_user_components(user_id uuid)
 RETURNS TABLE(component_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND role_id IS NOT NULL) THEN
    RETURN QUERY
    SELECT DISTINCT ac.name
    FROM app_components ac
    INNER JOIN role_components rc ON ac.id = rc.component_id
    INNER JOIN roles r ON rc.role_id = r.id
    INNER JOIN profiles p ON r.id = p.role_id
    WHERE p.id = user_id;
  ELSE
    RETURN QUERY
    SELECT DISTINCT ac.name
    FROM app_components ac
    INNER JOIN role_components rc ON ac.id = rc.component_id
    INNER JOIN roles r ON rc.role_id = r.id
    INNER JOIN profiles p ON LOWER(r.name) = LOWER(p.role::text)
    WHERE p.id = user_id
    AND p.role_id IS NULL;
  END IF;
END;
$function$;

-- Fix has_active_subscription function
CREATE OR REPLACE FUNCTION public.has_active_subscription(restaurant_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM restaurant_subscriptions
        WHERE restaurant_subscriptions.restaurant_id = $1
        AND status = 'active'
        AND current_period_end > now()
    );
END;
$function$;

-- Fix generate_purchase_order_number function
CREATE OR REPLACE FUNCTION public.generate_purchase_order_number(restaurant_id_param uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  order_count INTEGER;
  order_number TEXT;
BEGIN
  SELECT COUNT(*) INTO order_count
  FROM purchase_orders
  WHERE restaurant_id = restaurant_id_param
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now());
  
  order_number := 'PO-' || EXTRACT(YEAR FROM now()) || '-' || LPAD((order_count + 1)::TEXT, 4, '0');
  
  RETURN order_number;
END;
$function$;

-- Fix update_table_status_from_reservations function
CREATE OR REPLACE FUNCTION public.update_table_status_from_reservations()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF NEW.status IN ('confirmed', 'seated') THEN
    UPDATE restaurant_tables 
    SET status = 'occupied'
    WHERE id = NEW.table_id;
  ELSIF NEW.status IN ('completed', 'cancelled', 'no_show') THEN
    IF NOT EXISTS (
      SELECT 1 FROM table_reservations 
      WHERE table_id = NEW.table_id 
      AND reservation_date = CURRENT_DATE 
      AND status IN ('confirmed', 'seated')
      AND id != NEW.id
    ) THEN
      UPDATE restaurant_tables 
      SET status = 'available'
      WHERE id = NEW.table_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix update_loyalty_updated_at function
CREATE OR REPLACE FUNCTION public.update_loyalty_updated_at()
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

-- Fix update_customer_loyalty_tier function
CREATE OR REPLACE FUNCTION public.update_customer_loyalty_tier()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF OLD.loyalty_points IS DISTINCT FROM NEW.loyalty_points THEN
    NEW.loyalty_tier_id = public.calculate_customer_tier(NEW.loyalty_points, NEW.restaurant_id);
    NEW.loyalty_points_last_updated = now();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix get_analytics_data function
CREATE OR REPLACE FUNCTION public.get_analytics_data(p_restaurant_id uuid, p_start_date text, p_end_date text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
  SELECT 
    COALESCE(SUM(total), 0),
    COUNT(*),
    COALESCE(AVG(total), 0)
  INTO total_revenue, total_orders, avg_order_value
  FROM orders
  WHERE restaurant_id = p_restaurant_id
    AND status != 'cancelled'
    AND created_at::date BETWEEN p_start_date::date AND p_end_date::date;

  SELECT total_revenue + COALESCE(SUM(total_amount), 0)
  INTO total_revenue
  FROM room_billings
  WHERE restaurant_id = p_restaurant_id
    AND created_at::date BETWEEN p_start_date::date AND p_end_date::date;

  SELECT COUNT(DISTINCT id)
  INTO new_customers
  FROM customers
  WHERE restaurant_id = p_restaurant_id
    AND created_at::date BETWEEN p_start_date::date AND p_end_date::date;

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
$function$;