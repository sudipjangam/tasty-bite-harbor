-- Fix RLS policies for role-based access to ensure all roles can perform their required operations
-- This addresses issues where owners/managers can't take orders and other permission-related problems

-- First, let's create a helper function to check if user has required role or permission
CREATE OR REPLACE FUNCTION public.user_has_role_or_permission(required_roles text[], required_permissions text[] DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
  user_restaurant_id uuid;
  has_permission boolean := false;
BEGIN
  -- Get current user's role and restaurant_id
  SELECT role, restaurant_id INTO user_role, user_restaurant_id
  FROM profiles 
  WHERE id = auth.uid();
  
  -- If no profile found, deny access
  IF user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user has required role
  IF required_roles IS NOT NULL AND user_role = ANY(required_roles) THEN
    RETURN true;
  END IF;
  
  -- For now, we'll use role-based access. In future, we can expand this to check specific permissions
  RETURN false;
END;
$$;

-- Update orders table RLS policies to allow all operational roles to create/update orders
DROP POLICY IF EXISTS "Restaurant-specific access" ON public.orders;

CREATE POLICY "Users can view orders for their restaurant" 
  ON public.orders FOR SELECT 
  USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Operational roles can create orders" 
  ON public.orders FOR INSERT 
  WITH CHECK (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    AND public.user_has_role_or_permission(ARRAY['owner', 'admin', 'manager', 'chef', 'waiter', 'staff'])
  );

CREATE POLICY "Operational roles can update orders" 
  ON public.orders FOR UPDATE 
  USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    AND public.user_has_role_or_permission(ARRAY['owner', 'admin', 'manager', 'chef', 'waiter', 'staff'])
  );

CREATE POLICY "Management roles can delete orders" 
  ON public.orders FOR DELETE 
  USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    AND public.user_has_role_or_permission(ARRAY['owner', 'admin', 'manager'])
  );

-- Update kitchen_orders table RLS policies
DROP POLICY IF EXISTS "Restaurant staff can insert kitchen orders" ON public.kitchen_orders;
DROP POLICY IF EXISTS "Restaurant staff can update their restaurant's kitchen orders" ON public.kitchen_orders;
DROP POLICY IF EXISTS "Restaurant staff can view their restaurant's kitchen orders" ON public.kitchen_orders;

CREATE POLICY "Users can view kitchen orders for their restaurant" 
  ON public.kitchen_orders FOR SELECT 
  USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Operational roles can create kitchen orders" 
  ON public.kitchen_orders FOR INSERT 
  WITH CHECK (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    AND public.user_has_role_or_permission(ARRAY['owner', 'admin', 'manager', 'chef', 'waiter', 'staff'])
  );

CREATE POLICY "Operational roles can update kitchen orders" 
  ON public.kitchen_orders FOR UPDATE 
  USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    AND public.user_has_role_or_permission(ARRAY['owner', 'admin', 'manager', 'chef', 'waiter', 'staff'])
  );

-- Update menu_items table RLS policies to ensure proper access
DROP POLICY IF EXISTS "Restaurant-specific access" ON public.menu_items;
DROP POLICY IF EXISTS "Check active subscription for access" ON public.menu_items;

CREATE POLICY "Users can view menu items for their restaurant" 
  ON public.menu_items FOR SELECT 
  USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Menu management roles can create menu items" 
  ON public.menu_items FOR INSERT 
  WITH CHECK (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    AND public.user_has_role_or_permission(ARRAY['owner', 'admin', 'manager', 'chef'])
  );

CREATE POLICY "Menu management roles can update menu items" 
  ON public.menu_items FOR UPDATE 
  USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    AND public.user_has_role_or_permission(ARRAY['owner', 'admin', 'manager', 'chef'])
  );

CREATE POLICY "Management roles can delete menu items" 
  ON public.menu_items FOR DELETE 
  USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    AND public.user_has_role_or_permission(ARRAY['owner', 'admin', 'manager'])
  );

-- Update restaurant_tables table RLS policies
DROP POLICY IF EXISTS "restaurant_tables_policy" ON public.restaurant_tables;

CREATE POLICY "Users can view tables for their restaurant" 
  ON public.restaurant_tables FOR SELECT 
  USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Operational roles can create tables" 
  ON public.restaurant_tables FOR INSERT 
  WITH CHECK (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    AND public.user_has_role_or_permission(ARRAY['owner', 'admin', 'manager'])
  );

CREATE POLICY "Operational roles can update tables" 
  ON public.restaurant_tables FOR UPDATE 
  USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    AND public.user_has_role_or_permission(ARRAY['owner', 'admin', 'manager', 'waiter', 'staff'])
  );

CREATE POLICY "Management roles can delete tables" 
  ON public.restaurant_tables FOR DELETE 
  USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    AND public.user_has_role_or_permission(ARRAY['owner', 'admin', 'manager'])
  );

-- Update inventory_items table RLS policies to be more permissive for operational roles
DROP POLICY IF EXISTS "Restaurant-specific access" ON public.inventory_items;

CREATE POLICY "Users can view inventory for their restaurant" 
  ON public.inventory_items FOR SELECT 
  USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Inventory management roles can create items" 
  ON public.inventory_items FOR INSERT 
  WITH CHECK (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    AND public.user_has_role_or_permission(ARRAY['owner', 'admin', 'manager', 'chef'])
  );

CREATE POLICY "Inventory management roles can update items" 
  ON public.inventory_items FOR UPDATE 
  USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    AND public.user_has_role_or_permission(ARRAY['owner', 'admin', 'manager', 'chef'])
  );

CREATE POLICY "Management roles can delete inventory items" 
  ON public.inventory_items FOR DELETE 
  USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    AND public.user_has_role_or_permission(ARRAY['owner', 'admin', 'manager'])
  );

-- Update daily_revenue_stats table to allow broader access for analytics
DROP POLICY IF EXISTS "Restaurant-specific access" ON public.daily_revenue_stats;

CREATE POLICY "Analytics access for restaurant" 
  ON public.daily_revenue_stats FOR SELECT 
  USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  ) AND public.user_has_role_or_permission(ARRAY['owner', 'admin']));

CREATE POLICY "Management can manage revenue stats" 
  ON public.daily_revenue_stats FOR ALL 
  USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  ) AND public.user_has_role_or_permission(ARRAY['owner', 'admin', 'manager']));

-- Update staff table RLS policies to be more permissive for management
DROP POLICY IF EXISTS "Restaurant-specific access" ON public.staff;

CREATE POLICY "Users can view staff for their restaurant" 
  ON public.staff FOR SELECT 
  USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Management roles can create staff" 
  ON public.staff FOR INSERT 
  WITH CHECK (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    AND public.user_has_role_or_permission(ARRAY['owner', 'admin', 'manager'])
  );

CREATE POLICY "Management roles can update staff" 
  ON public.staff FOR UPDATE 
  USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    AND public.user_has_role_or_permission(ARRAY['owner', 'admin', 'manager'])
  );

CREATE POLICY "Senior management can delete staff" 
  ON public.staff FOR DELETE 
  USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    AND public.user_has_role_or_permission(ARRAY['owner', 'admin'])
  );

-- Update reservations table RLS policies
DROP POLICY IF EXISTS "Restaurant-specific access" ON public.reservations;

CREATE POLICY "Users can view reservations for their restaurant" 
  ON public.reservations FOR SELECT 
  USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Operational roles can create reservations" 
  ON public.reservations FOR INSERT 
  WITH CHECK (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    AND public.user_has_role_or_permission(ARRAY['owner', 'admin', 'manager', 'waiter', 'staff'])
  );

CREATE POLICY "Operational roles can update reservations" 
  ON public.reservations FOR UPDATE 
  USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    AND public.user_has_role_or_permission(ARRAY['owner', 'admin', 'manager', 'waiter', 'staff'])
  );

CREATE POLICY "Management roles can delete reservations" 
  ON public.reservations FOR DELETE 
  USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    AND public.user_has_role_or_permission(ARRAY['owner', 'admin', 'manager'])
  );