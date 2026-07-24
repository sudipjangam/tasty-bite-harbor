-- ============================================================================
-- MIGRATION: Fix Franchise Cross-Branch RLS for check_access Function
-- Description: Updates public.check_access to allow organization owners/members
-- to view data (orders, inventory, staff, etc.) across ALL branches in their franchise.
-- ============================================================================

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
