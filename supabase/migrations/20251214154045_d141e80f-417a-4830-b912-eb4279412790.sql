-- Step 1: Create component_table_mapping to map components to their database tables
CREATE TABLE IF NOT EXISTS public.component_table_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID REFERENCES public.app_components(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(component_id, table_name)
);

-- Enable RLS on the new table
ALTER TABLE public.component_table_mapping ENABLE ROW LEVEL SECURITY;

-- Only admins can manage this table
CREATE POLICY "Admins can manage component_table_mapping"
ON public.component_table_mapping
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('admin', 'owner')
  )
);

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can read component_table_mapping"
ON public.component_table_mapping
FOR SELECT
USING (true);

-- Step 2: Insert component-to-table mappings
INSERT INTO public.component_table_mapping (component_id, table_name) VALUES
-- Dashboard
((SELECT id FROM app_components WHERE name = 'Dashboard'), 'daily_revenue_stats'),

-- Orders
((SELECT id FROM app_components WHERE name = 'Orders'), 'orders'),
((SELECT id FROM app_components WHERE name = 'Orders'), 'payments'),

-- POS
((SELECT id FROM app_components WHERE name = 'POS'), 'orders'),
((SELECT id FROM app_components WHERE name = 'POS'), 'payments'),
((SELECT id FROM app_components WHERE name = 'POS'), 'payment_methods'),
((SELECT id FROM app_components WHERE name = 'POS'), 'payment_settings'),

-- QSR POS
((SELECT id FROM app_components WHERE name = 'QSR POS'), 'orders'),
((SELECT id FROM app_components WHERE name = 'QSR POS'), 'payments'),

-- Kitchen
((SELECT id FROM app_components WHERE name = 'Kitchen'), 'kitchen_orders'),
((SELECT id FROM app_components WHERE name = 'Kitchen'), 'orders'),

-- Menu
((SELECT id FROM app_components WHERE name = 'Menu'), 'menu_items'),
((SELECT id FROM app_components WHERE name = 'Menu'), 'categories'),

-- Inventory
((SELECT id FROM app_components WHERE name = 'Inventory'), 'inventory_items'),
((SELECT id FROM app_components WHERE name = 'Inventory'), 'inventory_transactions'),
((SELECT id FROM app_components WHERE name = 'Inventory'), 'inventory_alerts'),
((SELECT id FROM app_components WHERE name = 'Inventory'), 'purchase_orders'),
((SELECT id FROM app_components WHERE name = 'Inventory'), 'purchase_order_items'),

-- Customers
((SELECT id FROM app_components WHERE name = 'Customers'), 'customers'),
((SELECT id FROM app_components WHERE name = 'Customers'), 'customer_activities'),
((SELECT id FROM app_components WHERE name = 'Customers'), 'customer_notes'),
((SELECT id FROM app_components WHERE name = 'Customers'), 'loyalty_programs'),
((SELECT id FROM app_components WHERE name = 'Customers'), 'loyalty_tiers'),
((SELECT id FROM app_components WHERE name = 'Customers'), 'loyalty_rewards'),
((SELECT id FROM app_components WHERE name = 'Customers'), 'loyalty_transactions'),
((SELECT id FROM app_components WHERE name = 'Customers'), 'loyalty_redemptions'),

-- Staff
((SELECT id FROM app_components WHERE name = 'Staff'), 'staff'),
((SELECT id FROM app_components WHERE name = 'Staff'), 'staff_documents'),
((SELECT id FROM app_components WHERE name = 'Staff'), 'staff_shifts'),
((SELECT id FROM app_components WHERE name = 'Staff'), 'staff_time_clock'),
((SELECT id FROM app_components WHERE name = 'Staff'), 'staff_leaves'),
((SELECT id FROM app_components WHERE name = 'Staff'), 'staff_leave_requests'),
((SELECT id FROM app_components WHERE name = 'Staff'), 'staff_leave_balances'),
((SELECT id FROM app_components WHERE name = 'Staff'), 'staff_leave_types'),
((SELECT id FROM app_components WHERE name = 'Staff'), 'shift_types'),

-- Tables
((SELECT id FROM app_components WHERE name = 'Tables'), 'restaurant_tables'),
((SELECT id FROM app_components WHERE name = 'Tables'), 'table_reservations'),
((SELECT id FROM app_components WHERE name = 'Tables'), 'table_availability_slots'),
((SELECT id FROM app_components WHERE name = 'Tables'), 'table_pacing'),

-- Reservations
((SELECT id FROM app_components WHERE name = 'Reservations'), 'reservations'),
((SELECT id FROM app_components WHERE name = 'Reservations'), 'waitlist'),

-- Rooms
((SELECT id FROM app_components WHERE name = 'Rooms'), 'rooms'),
((SELECT id FROM app_components WHERE name = 'Rooms'), 'room_billings'),
((SELECT id FROM app_components WHERE name = 'Rooms'), 'room_food_orders'),
((SELECT id FROM app_components WHERE name = 'Rooms'), 'check_ins'),
((SELECT id FROM app_components WHERE name = 'Rooms'), 'guest_profiles'),
((SELECT id FROM app_components WHERE name = 'Rooms'), 'guest_documents'),
((SELECT id FROM app_components WHERE name = 'Rooms'), 'guest_preferences'),
((SELECT id FROM app_components WHERE name = 'Rooms'), 'rate_plans'),
((SELECT id FROM app_components WHERE name = 'Rooms'), 'price_history'),
((SELECT id FROM app_components WHERE name = 'Rooms'), 'pricing_rules'),

-- Housekeeping
((SELECT id FROM app_components WHERE name = 'Housekeeping'), 'room_cleaning_schedules'),
((SELECT id FROM app_components WHERE name = 'Housekeeping'), 'room_maintenance_requests'),
((SELECT id FROM app_components WHERE name = 'Housekeeping'), 'room_amenities'),
((SELECT id FROM app_components WHERE name = 'Housekeeping'), 'room_amenities_config'),
((SELECT id FROM app_components WHERE name = 'Housekeeping'), 'room_amenity_inventory'),
((SELECT id FROM app_components WHERE name = 'Housekeeping'), 'guest_feedback'),

-- Financial
((SELECT id FROM app_components WHERE name = 'Financial'), 'expenses'),
((SELECT id FROM app_components WHERE name = 'Financial'), 'expense_categories'),
((SELECT id FROM app_components WHERE name = 'Financial'), 'invoices'),
((SELECT id FROM app_components WHERE name = 'Financial'), 'invoice_line_items'),
((SELECT id FROM app_components WHERE name = 'Financial'), 'chart_of_accounts'),
((SELECT id FROM app_components WHERE name = 'Financial'), 'journal_entries'),
((SELECT id FROM app_components WHERE name = 'Financial'), 'journal_entry_lines'),
((SELECT id FROM app_components WHERE name = 'Financial'), 'financial_reports'),
((SELECT id FROM app_components WHERE name = 'Financial'), 'budgets'),
((SELECT id FROM app_components WHERE name = 'Financial'), 'budget_line_items'),
((SELECT id FROM app_components WHERE name = 'Financial'), 'monthly_budgets'),
((SELECT id FROM app_components WHERE name = 'Financial'), 'tax_configurations'),

-- Expenses (separate component)
((SELECT id FROM app_components WHERE name = 'Expenses'), 'expenses'),
((SELECT id FROM app_components WHERE name = 'Expenses'), 'expense_categories'),

-- Recipes
((SELECT id FROM app_components WHERE name = 'Recipes'), 'recipes'),
((SELECT id FROM app_components WHERE name = 'Recipes'), 'recipe_ingredients'),
((SELECT id FROM app_components WHERE name = 'Recipes'), 'recipe_nutrition'),
((SELECT id FROM app_components WHERE name = 'Recipes'), 'batch_productions'),

-- Marketing
((SELECT id FROM app_components WHERE name = 'Marketing'), 'promotion_campaigns'),
((SELECT id FROM app_components WHERE name = 'Marketing'), 'sent_promotions'),

-- Suppliers
((SELECT id FROM app_components WHERE name = 'Suppliers'), 'suppliers'),
((SELECT id FROM app_components WHERE name = 'Suppliers'), 'supplier_orders'),
((SELECT id FROM app_components WHERE name = 'Suppliers'), 'supplier_order_items'),

-- Channel Management
((SELECT id FROM app_components WHERE name = 'Channel Management'), 'booking_channels'),
((SELECT id FROM app_components WHERE name = 'Channel Management'), 'booking_sources'),
((SELECT id FROM app_components WHERE name = 'Channel Management'), 'channel_inventory'),
((SELECT id FROM app_components WHERE name = 'Channel Management'), 'competitor_pricing'),
((SELECT id FROM app_components WHERE name = 'Channel Management'), 'demand_forecast'),
((SELECT id FROM app_components WHERE name = 'Channel Management'), 'revenue_metrics'),

-- Analytics
((SELECT id FROM app_components WHERE name = 'Analytics'), 'daily_revenue_stats'),
((SELECT id FROM app_components WHERE name = 'Analytics'), 'operational_costs'),

-- Security
((SELECT id FROM app_components WHERE name = 'Security'), 'audit_logs'),
((SELECT id FROM app_components WHERE name = 'Security'), 'backups'),
((SELECT id FROM app_components WHERE name = 'Security'), 'backup_settings'),

-- Settings
((SELECT id FROM app_components WHERE name = 'Settings'), 'restaurant_settings'),
((SELECT id FROM app_components WHERE name = 'Settings'), 'restaurant_operating_hours'),
((SELECT id FROM app_components WHERE name = 'Settings'), 'notification_preferences'),
((SELECT id FROM app_components WHERE name = 'Settings'), 'payment_settings'),
((SELECT id FROM app_components WHERE name = 'Settings'), 'payment_methods'),

-- Role Management
((SELECT id FROM app_components WHERE name = 'Role Management'), 'roles'),
((SELECT id FROM app_components WHERE name = 'Role Management'), 'role_components'),

-- User Management
((SELECT id FROM app_components WHERE name = 'User Management'), 'profiles'),
((SELECT id FROM app_components WHERE name = 'User Management'), 'user_roles')
ON CONFLICT (component_id, table_name) DO NOTHING;

-- Step 3: Create security definer function to check if user is admin or owner
CREATE OR REPLACE FUNCTION public.user_is_admin_or_owner(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = $1
    AND ur.role IN ('admin', 'owner')
  );
$$;

-- Step 4: Create security definer function to check component-based table access
CREATE OR REPLACE FUNCTION public.user_has_table_access(
  _user_id UUID,
  _table_name TEXT,
  _restaurant_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_user_restaurant_id UUID;
  v_has_access BOOLEAN;
BEGIN
  -- Check if user is admin/owner (they have full access)
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
    AND ur.role IN ('admin', 'owner')
  ) INTO v_is_admin;
  
  IF v_is_admin THEN
    RETURN TRUE;
  END IF;
  
  -- Get user's restaurant_id from profile
  SELECT restaurant_id INTO v_user_restaurant_id
  FROM public.profiles
  WHERE id = _user_id;
  
  -- If restaurant_id is provided, check it matches
  IF _restaurant_id IS NOT NULL AND v_user_restaurant_id != _restaurant_id THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user has component access for this table via their custom role
  -- First get user's role_id from profile
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles p
    JOIN public.role_components rc ON rc.role_id = p.role_id
    JOIN public.component_table_mapping ctm ON ctm.component_id = rc.component_id
    WHERE p.id = _user_id
    AND ctm.table_name = _table_name
  ) INTO v_has_access;
  
  IF v_has_access THEN
    RETURN TRUE;
  END IF;
  
  -- Also check system role-based access through user_roles table
  -- Map system roles to component access
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.name = ur.role::TEXT AND r.restaurant_id = ur.restaurant_id
    JOIN public.role_components rc ON rc.role_id = r.id
    JOIN public.component_table_mapping ctm ON ctm.component_id = rc.component_id
    WHERE ur.user_id = _user_id
    AND ctm.table_name = _table_name
  ) INTO v_has_access;
  
  RETURN v_has_access;
END;
$$;

-- Step 5: Create helper function to get user's restaurant_id securely
CREATE OR REPLACE FUNCTION public.get_user_restaurant_id(_user_id UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT restaurant_id FROM public.profiles WHERE id = _user_id;
$$;

-- Step 6: Create comprehensive access check function combining restaurant + component access
CREATE OR REPLACE FUNCTION public.check_access(
  _table_name TEXT,
  _restaurant_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_restaurant_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get user's restaurant_id
  SELECT restaurant_id INTO v_user_restaurant_id
  FROM public.profiles
  WHERE id = v_user_id;
  
  -- Must be same restaurant
  IF v_user_restaurant_id IS NULL OR v_user_restaurant_id != _restaurant_id THEN
    RETURN FALSE;
  END IF;
  
  -- Check if admin/owner (full access)
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = v_user_id
    AND ur.role IN ('admin', 'owner')
  ) INTO v_is_admin;
  
  IF v_is_admin THEN
    RETURN TRUE;
  END IF;
  
  -- Check component-based table access
  RETURN public.user_has_table_access(v_user_id, _table_name, _restaurant_id);
END;
$$;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.user_is_admin_or_owner TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_table_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_restaurant_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_access TO authenticated;