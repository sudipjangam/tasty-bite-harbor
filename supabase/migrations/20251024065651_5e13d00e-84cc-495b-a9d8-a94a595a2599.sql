-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Management can manage revenue stats" ON public.daily_revenue_stats;
DROP POLICY IF EXISTS "Analytics access for restaurant" ON public.daily_revenue_stats;

-- Allow SELECT for analytics roles
CREATE POLICY "Analytics access for restaurant" 
ON public.daily_revenue_stats 
FOR SELECT 
USING (
  (restaurant_id IN (
    SELECT profiles.restaurant_id
    FROM profiles
    WHERE profiles.id = auth.uid()
  )) 
  AND user_has_role_or_permission(ARRAY['owner'::text, 'admin'::text, 'manager'::text])
);

-- Allow INSERT/UPDATE for all operational roles including staff
CREATE POLICY "Operational roles can manage revenue stats" 
ON public.daily_revenue_stats 
FOR ALL
USING (
  (restaurant_id IN (
    SELECT profiles.restaurant_id
    FROM profiles
    WHERE profiles.id = auth.uid()
  )) 
  AND user_has_role_or_permission(ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'chef'::text, 'waiter'::text, 'staff'::text])
);

-- Also check and fix kitchen_orders policies to ensure staff can insert
DROP POLICY IF EXISTS "Operational roles can create kitchen orders" ON public.kitchen_orders;
DROP POLICY IF EXISTS "Operational roles can update kitchen orders" ON public.kitchen_orders;
DROP POLICY IF EXISTS "Users can view kitchen orders for their restaurant" ON public.kitchen_orders;

-- Allow all operational roles to create kitchen orders
CREATE POLICY "Operational roles can create kitchen orders" 
ON public.kitchen_orders 
FOR INSERT
WITH CHECK (
  (restaurant_id IN (
    SELECT profiles.restaurant_id
    FROM profiles
    WHERE profiles.id = auth.uid()
  )) 
  AND user_has_role_or_permission(ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'chef'::text, 'waiter'::text, 'staff'::text])
);

-- Allow all operational roles to update kitchen orders
CREATE POLICY "Operational roles can update kitchen orders" 
ON public.kitchen_orders 
FOR UPDATE
USING (
  (restaurant_id IN (
    SELECT profiles.restaurant_id
    FROM profiles
    WHERE profiles.id = auth.uid()
  )) 
  AND user_has_role_or_permission(ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'chef'::text, 'waiter'::text, 'staff'::text])
);

-- Allow viewing kitchen orders for all authenticated users in restaurant
CREATE POLICY "Users can view kitchen orders for their restaurant" 
ON public.kitchen_orders 
FOR SELECT
USING (
  restaurant_id IN (
    SELECT profiles.restaurant_id
    FROM profiles
    WHERE profiles.id = auth.uid()
  )
);