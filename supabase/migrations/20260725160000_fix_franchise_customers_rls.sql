-- ============================================================================
-- MIGRATION: Fix Franchise Cross-Branch RLS for Customers and check_access
-- Description: Ensures franchise owners, admins, and branch staff can create and
-- manage customers across all accessible franchise branches without 42501 RLS errors.
-- ============================================================================

BEGIN;

-- 1. Update check_access function to support franchise branch access array
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
  v_accessible_restaurants UUID[];
  v_is_admin BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Platform admin has super access everywhere
  IF public.is_platform_admin() THEN
    RETURN TRUE;
  END IF;

  -- Get all accessible restaurant IDs for this user (handles single-restaurant + franchise orgs)
  v_accessible_restaurants := public.get_user_accessible_restaurants(v_user_id);

  -- Check if target restaurant is in user's accessible list
  IF _restaurant_id IS NOT NULL AND NOT (_restaurant_id = ANY(v_accessible_restaurants)) THEN
    RETURN FALSE;
  END IF;

  -- Check if user is admin or owner in any of their accessible roles
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = v_user_id
    AND ur.role IN ('admin', 'owner')
  ) INTO v_is_admin;
  
  IF v_is_admin THEN
    RETURN TRUE;
  END IF;

  -- Check organization owner/admin membership
  IF EXISTS (
    SELECT 1 FROM public.organization_members om
    JOIN public.restaurants r ON r.organization_id = om.organization_id
    WHERE om.user_id = v_user_id
      AND r.id = _restaurant_id
      AND om.role IN ('owner', 'admin')
  ) THEN
    RETURN TRUE;
  END IF;

  -- Fallback to component-based access for non-admin staff
  RETURN public.user_has_table_access(v_user_id, _table_name, _restaurant_id);
END;
$$;

-- 2. Update user_has_table_access helper
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
  v_accessible_restaurants UUID[];
  v_has_access BOOLEAN;
BEGIN
  -- Platform admin has full access
  IF public.is_platform_admin() THEN
    RETURN TRUE;
  END IF;

  -- Check if user is admin/owner
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
    AND ur.role IN ('admin', 'owner')
  ) INTO v_is_admin;
  
  IF v_is_admin THEN
    RETURN TRUE;
  END IF;

  -- Check accessible restaurants
  v_accessible_restaurants := public.get_user_accessible_restaurants(_user_id);
  IF _restaurant_id IS NOT NULL AND NOT (_restaurant_id = ANY(v_accessible_restaurants)) THEN
    RETURN FALSE;
  END IF;

  -- Check custom role components
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

  -- Check system roles mapping
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.name = ur.role::TEXT
    JOIN public.role_components rc ON rc.role_id = r.id
    JOIN public.component_table_mapping ctm ON ctm.component_id = rc.component_id
    WHERE ur.user_id = _user_id
    AND ctm.table_name = _table_name
  ) INTO v_has_access;
  
  RETURN COALESCE(v_has_access, FALSE);
END;
$$;

-- 3. Dedicated franchise-aware RLS policy on public.customers
DROP POLICY IF EXISTS "Component-based customers access" ON public.customers;
DROP POLICY IF EXISTS "Users can view customers for their restaurant" ON public.customers;
DROP POLICY IF EXISTS "Franchise-aware customers access" ON public.customers;

CREATE POLICY "Franchise-aware customers access"
ON public.customers FOR ALL TO authenticated
USING (
  restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  OR public.check_access('customers', restaurant_id)
)
WITH CHECK (
  restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  OR public.check_access('customers', restaurant_id)
);

COMMIT;
