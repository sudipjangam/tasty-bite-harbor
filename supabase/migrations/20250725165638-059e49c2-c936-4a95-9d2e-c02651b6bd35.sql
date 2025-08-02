-- Critical Security Fixes Phase 2: Fix Remaining RLS Issues and Anonymous Access

-- Enable RLS on remaining unprotected tables
ALTER TABLE public.cleaning_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housekeeping_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sent_promotions ENABLE ROW LEVEL SECURITY;

-- Add policies for cleaning_schedules
CREATE POLICY "restaurant_cleaning_schedules_policy"
ON public.cleaning_schedules FOR ALL
TO authenticated
USING (restaurant_id IN (
  SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()
));

-- Add policies for housekeeping_tasks  
CREATE POLICY "restaurant_housekeeping_tasks_policy"
ON public.housekeeping_tasks FOR ALL
TO authenticated
USING (restaurant_id IN (
  SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()
));

-- Add policies for maintenance_requests
CREATE POLICY "restaurant_maintenance_requests_policy" 
ON public.maintenance_requests FOR ALL
TO authenticated
USING (restaurant_id IN (
  SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()
));

-- Add policies for menu_categories
CREATE POLICY "restaurant_menu_categories_policy"
ON public.menu_categories FOR ALL
TO authenticated
USING (restaurant_id IN (
  SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()
));

-- Add policies for notifications
CREATE POLICY "restaurant_notifications_policy"
ON public.notifications FOR ALL
TO authenticated
USING (restaurant_id IN (
  SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()
));

-- Add policies for room_amenities
CREATE POLICY "restaurant_room_amenities_policy"
ON public.room_amenities FOR ALL
TO authenticated
USING (restaurant_id IN (
  SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()
));

-- Add policies for sent_promotions
CREATE POLICY "restaurant_sent_promotions_policy"
ON public.sent_promotions FOR ALL
TO authenticated
USING (restaurant_id IN (
  SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()
));

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

-- Restrict anonymous access by updating policies to require authentication
-- Only allow authenticated users to access data

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