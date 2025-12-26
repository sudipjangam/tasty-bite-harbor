-- Migration: Create component_permissions table for dynamic permission management
-- This table maps app_components to granular permissions (e.g., 'orders.create')

-- Step 1: Create component_permissions table
CREATE TABLE IF NOT EXISTS public.component_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL REFERENCES public.app_components(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(component_id, permission)
);

-- Enable RLS
ALTER TABLE public.component_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read permissions
CREATE POLICY "Authenticated users can view component_permissions"
ON public.component_permissions FOR SELECT TO authenticated USING (true);

-- Policy: Only admins/owners can manage permissions
CREATE POLICY "Admins can manage component_permissions"
ON public.component_permissions FOR ALL
USING (public.user_is_admin_or_owner());

-- Step 2: Seed initial component→permission mappings based on existing componentToPermissions
INSERT INTO public.component_permissions (component_id, permission, description)
SELECT ac.id, perm.permission, perm.description
FROM public.app_components ac
CROSS JOIN (VALUES
  -- Dashboard permissions
  ('Dashboard', 'dashboard.view', 'Access to main dashboard and overview'),
  ('Dashboard', 'dashboard.analytics', 'View dashboard analytics and insights'),
  
  -- Orders permissions
  ('Orders', 'orders.view', 'View order history and details'),
  ('Orders', 'orders.create', 'Create new orders'),
  ('Orders', 'orders.update', 'Update existing orders'),
  ('Orders', 'orders.delete', 'Delete orders'),
  
  -- POS permissions
  ('POS', 'pos.access', 'Access point-of-sale system'),
  
  -- QSR POS permissions (same as POS)
  ('QSR POS', 'pos.access', 'Access quick service POS'),
  
  -- Menu permissions
  ('Menu', 'menu.view', 'View menu items'),
  ('Menu', 'menu.create', 'Create new menu items'),
  ('Menu', 'menu.update', 'Edit menu items'),
  ('Menu', 'menu.delete', 'Delete menu items'),
  
  -- Inventory permissions
  ('Inventory', 'inventory.view', 'View inventory levels and items'),
  ('Inventory', 'inventory.create', 'Add new inventory items'),
  ('Inventory', 'inventory.update', 'Update inventory quantities and details'),
  ('Inventory', 'inventory.delete', 'Remove inventory items'),
  
  -- Staff permissions
  ('Staff', 'staff.view', 'View staff list and basic information'),
  ('Staff', 'staff.create', 'Add new staff members'),
  ('Staff', 'staff.update', 'Edit staff information'),
  ('Staff', 'staff.delete', 'Remove staff members'),
  ('Staff', 'staff.manage_roles', 'Assign and modify staff roles'),
  
  -- Customers permissions
  ('Customers', 'customers.view', 'View customer information and history'),
  ('Customers', 'customers.create', 'Add new customers'),
  ('Customers', 'customers.update', 'Edit customer profiles'),
  ('Customers', 'customers.delete', 'Remove customer records'),
  
  -- CRM permissions (same as customers)
  ('CRM', 'customers.view', 'View customer information'),
  ('CRM', 'customers.create', 'Add new customers'),
  ('CRM', 'customers.update', 'Edit customer profiles'),
  ('CRM', 'customers.delete', 'Remove customer records'),
  
  -- Rooms permissions
  ('Rooms', 'rooms.view', 'View room information and status'),
  ('Rooms', 'rooms.create', 'Add new rooms'),
  ('Rooms', 'rooms.update', 'Update room details'),
  ('Rooms', 'rooms.delete', 'Remove rooms'),
  ('Rooms', 'rooms.checkout', 'Process room checkouts'),
  
  -- Reservations permissions
  ('Reservations', 'reservations.view', 'View reservations'),
  ('Reservations', 'reservations.create', 'Create new reservations'),
  ('Reservations', 'reservations.update', 'Modify reservations'),
  ('Reservations', 'reservations.delete', 'Cancel reservations'),
  
  -- Analytics permissions
  ('Analytics', 'analytics.view', 'Access to analytics and reports'),
  ('Analytics', 'analytics.export', 'Export analytics data'),
  
  -- Financial permissions
  ('Financial', 'financial.view', 'View financial data'),
  ('Financial', 'financial.create', 'Create financial records'),
  ('Financial', 'financial.update', 'Update financial information'),
  ('Financial', 'financial.delete', 'Delete financial records'),
  ('Financial', 'financial.reports', 'Generate financial reports'),
  
  -- Expenses permissions
  ('Expenses', 'financial.view', 'View expense data'),
  ('Expenses', 'financial.create', 'Create expense records'),
  ('Expenses', 'financial.update', 'Update expense information'),
  ('Expenses', 'financial.delete', 'Delete expense records'),
  
  -- Settings permissions
  ('Settings', 'settings.view', 'View system settings'),
  ('Settings', 'settings.update', 'Modify system settings'),
  ('Settings', 'settings.manage_users', 'Manage user accounts'),
  ('Settings', 'users.manage', 'Full user management privileges'),
  
  -- Kitchen permissions
  ('Kitchen', 'kitchen.view', 'View kitchen orders and status'),
  ('Kitchen', 'kitchen.update', 'Update order status in kitchen'),
  
  -- Tables permissions
  ('Tables', 'tables.view', 'View table information'),
  ('Tables', 'tables.create', 'Add new tables'),
  ('Tables', 'tables.update', 'Update table details'),
  ('Tables', 'tables.delete', 'Remove tables'),
  
  -- Housekeeping permissions
  ('Housekeeping', 'housekeeping.view', 'View housekeeping tasks'),
  ('Housekeeping', 'housekeeping.create', 'Create housekeeping tasks'),
  ('Housekeeping', 'housekeeping.update', 'Update housekeeping status'),
  ('Housekeeping', 'housekeeping.delete', 'Remove housekeeping tasks'),
  ('Housekeeping', 'housekeeping.assign', 'Assign housekeeping tasks'),
  
  -- Security permissions
  ('Security', 'audit.view', 'View audit logs and trails'),
  ('Security', 'backup.view', 'View backup history'),
  ('Security', 'gdpr.view', 'View GDPR compliance data'),
  
  -- Audit permissions (separate)
  ('Security', 'audit.export', 'Export audit data'),
  
  -- Backup permissions
  ('Security', 'backup.create', 'Create system backups'),
  ('Security', 'backup.restore', 'Restore from backups'),
  
  -- GDPR permissions
  ('Security', 'gdpr.export', 'Export user data for GDPR requests'),
  ('Security', 'gdpr.delete', 'Delete user data for GDPR compliance'),
  
  -- Reports permissions
  ('Reports', 'analytics.view', 'Access reports'),
  ('Reports', 'analytics.export', 'Export reports'),
  ('Reports', 'financial.reports', 'Generate financial reports'),
  
  -- Marketing permissions
  ('Marketing', 'customers.view', 'View customer data for marketing'),
  ('Marketing', 'customers.create', 'Create marketing campaigns'),
  ('Marketing', 'customers.update', 'Update marketing data'),
  
  -- Recipes permissions
  ('Recipes', 'menu.view', 'View recipes'),
  ('Recipes', 'menu.create', 'Create recipes'),
  ('Recipes', 'menu.update', 'Update recipes'),
  ('Recipes', 'inventory.view', 'View ingredient inventory'),
  
  -- Suppliers permissions
  ('Suppliers', 'inventory.view', 'View supplier information'),
  ('Suppliers', 'inventory.create', 'Add supplier orders'),
  ('Suppliers', 'inventory.update', 'Update supplier information'),
  
  -- Channel Management permissions
  ('Channel Management', 'rooms.view', 'View channel data'),
  ('Channel Management', 'rooms.update', 'Update channel settings'),
  ('Channel Management', 'reservations.view', 'View channel reservations'),
  
  -- User Management permissions
  ('User Management', 'settings.manage_users', 'Manage user accounts'),
  ('User Management', 'users.manage', 'Full user management'),
  
  -- Role Management permissions
  ('Role Management', 'settings.manage_users', 'Manage roles'),
  ('Role Management', 'staff.manage_roles', 'Modify role permissions'),
  
  -- AI Assistant permissions
  ('AI Assistant', 'dashboard.view', 'Access AI features')
  
) AS perm(component_name, permission, description)
WHERE ac.name = perm.component_name
ON CONFLICT (component_id, permission) DO NOTHING;

-- Step 3: Create RPC function to get user permissions from database
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id UUID)
RETURNS TABLE (permission TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admin/Owner has full access - return all unique permissions
  IF public.user_is_admin_or_owner(p_user_id) THEN
    RETURN QUERY 
    SELECT DISTINCT cp.permission 
    FROM component_permissions cp;
    RETURN;
  END IF;

  -- Get permissions via user's role → role_components → component_permissions
  -- First try with role_id (custom roles)
  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND role_id IS NOT NULL) THEN
    RETURN QUERY
    SELECT DISTINCT cp.permission
    FROM profiles p
    JOIN role_components rc ON rc.role_id = p.role_id
    JOIN component_permissions cp ON cp.component_id = rc.component_id
    WHERE p.id = p_user_id;
  ELSE
    -- Fallback to system role (profiles.role column)
    RETURN QUERY
    SELECT DISTINCT cp.permission
    FROM profiles p
    JOIN roles r ON LOWER(r.name) = LOWER(p.role::TEXT)
    JOIN role_components rc ON rc.role_id = r.id
    JOIN component_permissions cp ON cp.component_id = rc.component_id
    WHERE p.id = p_user_id;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_permissions(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_user_permissions(UUID) IS 
'Returns all granular permissions for a user based on their role''s assigned components. 
Admins/Owners get all permissions. Uses role_id if set, falls back to system role.';

COMMENT ON TABLE public.component_permissions IS 
'Maps app components to granular permissions (e.g., Dashboard → dashboard.view). 
This enables dynamic permission management without code changes.';
