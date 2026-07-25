-- ============================================================================
-- ROLLBACK SCRIPT FOR: 20260725160000_fix_franchise_customers_rls.sql
-- Description: Restores check_access, user_has_table_access, and customers
-- RLS policies to their previous states.
-- ============================================================================

BEGIN;

-- 1. Restore check_access function
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

  -- 1. Check if user has access to this restaurant via organization membership
  IF EXISTS (
    SELECT 1 
    FROM public.organization_members om
    JOIN public.restaurants r ON r.organization_id = om.organization_id
    WHERE om.user_id = v_user_id
      AND r.id = _restaurant_id
      AND (
        om.accessible_branches IS NULL 
        OR _restaurant_id = ANY(om.accessible_branches)
      )
  ) THEN
    RETURN TRUE;
  END IF;

  -- 2. Check platform admin status
  IF public.is_platform_admin() THEN
    RETURN TRUE;
  END IF;

  -- 3. Check single-restaurant profile mapping
  SELECT restaurant_id INTO v_user_restaurant_id
  FROM public.profiles
  WHERE id = v_user_id;
  
  -- Must be same restaurant
  IF v_user_restaurant_id IS NULL OR v_user_restaurant_id != _restaurant_id THEN
    RETURN FALSE;
  END IF;
  
  -- Check if admin/owner (full access within single restaurant)
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

-- 2. Restore user_has_table_access function
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
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
    AND ur.role IN ('admin', 'owner')
  ) INTO v_is_admin;
  
  IF v_is_admin THEN
    RETURN TRUE;
  END IF;
  
  SELECT restaurant_id INTO v_user_restaurant_id
  FROM public.profiles
  WHERE id = _user_id;
  
  IF _restaurant_id IS NOT NULL AND v_user_restaurant_id != _restaurant_id THEN
    RETURN FALSE;
  END IF;
  
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

-- 3. Restore customers RLS policy
DROP POLICY IF EXISTS "Franchise-aware customers access" ON public.customers;
DROP POLICY IF EXISTS "Component-based customers access" ON public.customers;

CREATE POLICY "Component-based customers access"
ON public.customers FOR ALL TO authenticated
USING (public.check_access('customers', restaurant_id))
WITH CHECK (public.check_access('customers', restaurant_id));

COMMIT;
