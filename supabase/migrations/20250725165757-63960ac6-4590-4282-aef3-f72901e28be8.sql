-- Critical Security Fixes Phase 2: Fix RLS Issues and Anonymous Access (Corrected)

-- Only enable RLS on tables that actually exist
-- Note: Some tables referenced don't exist, so we'll skip those

-- Fix function security by adding search_path to remaining functions
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
  -- Get count of existing purchase orders for this restaurant this year
  SELECT COUNT(*) INTO order_count
  FROM purchase_orders
  WHERE restaurant_id = restaurant_id_param
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now());
  
  -- Generate order number: PO-YYYY-NNNN
  order_number := 'PO-' || EXTRACT(YEAR FROM now()) || '-' || LPAD((order_count + 1)::TEXT, 4, '0');
  
  RETURN order_number;
END;
$function$;

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

CREATE OR REPLACE FUNCTION public.calculate_customer_tier(customer_points integer, restaurant_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  tier_id UUID;
BEGIN
  -- Find the highest tier the customer qualifies for
  SELECT id INTO tier_id
  FROM public.loyalty_tiers
  WHERE restaurant_id = restaurant_id_param
    AND points_required <= customer_points
  ORDER BY points_required DESC
  LIMIT 1;
  
  RETURN tier_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_table_status_from_reservations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- If reservation is confirmed or seated, mark table as occupied
  IF NEW.status IN ('confirmed', 'seated') THEN
    UPDATE restaurant_tables 
    SET status = 'occupied'
    WHERE id = NEW.table_id;
  -- If reservation is completed, cancelled, or no_show, check if table should be available
  ELSIF NEW.status IN ('completed', 'cancelled', 'no_show') THEN
    -- Only set to available if no other active reservations for this table today
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

-- Fix remaining functions with search_path
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

CREATE OR REPLACE FUNCTION public.update_customer_loyalty_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- If points changed, recalculate tier
  IF OLD.loyalty_points IS DISTINCT FROM NEW.loyalty_points THEN
    NEW.loyalty_tier_id = public.calculate_customer_tier(NEW.loyalty_points, NEW.restaurant_id);
    NEW.loyalty_points_last_updated = now();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Restrict anonymous access by updating policies to require authentication
-- Update currencies table policy to allow view for authenticated users only
DROP POLICY IF EXISTS "Anyone can view currencies" ON public.currencies;
CREATE POLICY "Authenticated users can view currencies"
ON public.currencies FOR SELECT
TO authenticated
USING (true);

-- Update subscription_plans to require authentication for viewing
DROP POLICY IF EXISTS "Allow read access to subscription_plans for all users" ON public.subscription_plans;
CREATE POLICY "Authenticated users can view subscription plans"
ON public.subscription_plans FOR SELECT
TO authenticated
USING (true);