-- ============================================================================
-- Migration: Fix User Management, Platform Admin, and Franchise Branch Onboarding
-- 1. Updates user_is_admin_or_owner & is_platform_admin helper functions
-- 2. Grants Franchise Owners & Platform Admins INSERT/UPDATE RLS on restaurants
-- 3. Automatically seeds system roles for any newly created restaurant
-- 4. Creates create_franchise_branch RPC for atomic branch onboarding
-- ============================================================================

BEGIN;

-- 1. Extend user_is_admin_or_owner to recognize Platform Admins & service_role
CREATE OR REPLACE FUNCTION public.user_is_admin_or_owner(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role always has access
  IF (auth.jwt() ->> 'role') = 'service_role' THEN
    RETURN TRUE;
  END IF;

  -- Check 0: Platform admin check in profiles
  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = $1
    AND p.role = 'admin'::user_role
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check 1: branch-level role (existing behaviour)
  IF EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = $1
    AND ur.role IN ('admin', 'owner')
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check 2: org-level role (franchise owner/admin)
  IF EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = $1
    AND om.role IN ('owner', 'admin')
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_is_admin_or_owner(UUID) TO authenticated, service_role;

-- 2. Update is_platform_admin to recognize service_role and trusted role
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (auth.jwt() ->> 'role') = 'service_role' THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'::user_role
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;

-- 3. Auto-seed system roles trigger for new restaurants
CREATE OR REPLACE FUNCTION public.handle_new_restaurant_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_system_roles(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_seed_restaurant_roles ON public.restaurants;
CREATE TRIGGER trg_auto_seed_restaurant_roles
AFTER INSERT ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_restaurant_roles();

-- 4. RLS policies on public.restaurants
-- Ensure Platform Admin can manage all restaurants
DROP POLICY IF EXISTS "Platform admin can manage all restaurants" ON public.restaurants;
CREATE POLICY "Platform admin can manage all restaurants"
ON public.restaurants FOR ALL TO authenticated
USING (public.is_platform_admin() = true)
WITH CHECK (public.is_platform_admin() = true);

-- Allow franchise owners and admins to insert branches for their organization
DROP POLICY IF EXISTS "Franchise owners can insert branches" ON public.restaurants;
CREATE POLICY "Franchise owners can insert branches"
ON public.restaurants FOR INSERT TO authenticated
WITH CHECK (
  public.is_platform_admin() = true OR
  (
    organization_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = restaurants.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  )
);

-- Allow franchise owners and admins to update branches for their organization
DROP POLICY IF EXISTS "Franchise owner can update branches" ON public.restaurants;
DROP POLICY IF EXISTS "Franchise owners can update branches" ON public.restaurants;
CREATE POLICY "Franchise owners can update branches"
ON public.restaurants FOR UPDATE TO authenticated
USING (
  public.is_platform_admin() = true OR
  id = ANY(public.get_user_accessible_restaurants(auth.uid())) OR
  (
    organization_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = restaurants.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  )
);

-- 5. Atomic RPC function to create franchise branch
CREATE OR REPLACE FUNCTION public.create_franchise_branch(
  p_organization_id UUID,
  p_name TEXT,
  p_branch_code TEXT,
  p_address TEXT DEFAULT '',
  p_phone TEXT DEFAULT '',
  p_email TEXT DEFAULT '',
  p_manager TEXT DEFAULT '',
  p_manager_phone TEXT DEFAULT '',
  p_color TEXT DEFAULT '#3b82f6',
  p_is_headquarters BOOLEAN DEFAULT false,
  p_rating NUMERIC DEFAULT 5.0,
  p_total_reviews INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_is_platform_admin BOOLEAN;
  v_is_org_admin BOOLEAN;
  v_max_branches INTEGER := 999;
  v_current_branches INTEGER := 0;
  v_new_restaurant_id UUID;
  v_result JSONB;
BEGIN
  v_caller_id := auth.uid();

  -- Verify permissions
  v_is_platform_admin := public.is_platform_admin();

  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id
    AND user_id = v_caller_id
    AND role IN ('owner', 'admin')
  ) INTO v_is_org_admin;

  IF NOT (v_is_platform_admin OR v_is_org_admin) THEN
    RAISE EXCEPTION 'Insufficient permissions to create a branch for this organization';
  END IF;

  -- Check max branch limits from organization_subscriptions
  SELECT max_branches INTO v_max_branches
  FROM public.organization_subscriptions
  WHERE organization_id = p_organization_id;

  IF v_max_branches IS NOT NULL AND v_max_branches > 0 THEN
    SELECT COUNT(*) INTO v_current_branches
    FROM public.restaurants
    WHERE organization_id = p_organization_id;

    IF v_current_branches >= v_max_branches THEN
      RAISE EXCEPTION 'Branch limit reached for current organization subscription plan (% max)', v_max_branches;
    END IF;
  END IF;

  -- Insert the new branch
  INSERT INTO public.restaurants (
    organization_id,
    name,
    branch_code,
    address,
    phone,
    email,
    owner_name,
    owner_phone,
    is_headquarters,
    social_media,
    rating,
    total_reviews,
    is_active
  ) VALUES (
    p_organization_id,
    p_name,
    p_branch_code,
    p_address,
    p_phone,
    p_email,
    p_manager,
    p_manager_phone,
    COALESCE(p_is_headquarters, false),
    jsonb_build_object('theme_color', COALESCE(p_color, '#3b82f6')),
    COALESCE(p_rating, 5.0),
    COALESCE(p_total_reviews, 0),
    true
  )
  RETURNING id INTO v_new_restaurant_id;

  -- Explicitly ensure roles are seeded
  PERFORM public.seed_system_roles(v_new_restaurant_id);

  v_result := jsonb_build_object(
    'success', true,
    'restaurant_id', v_new_restaurant_id,
    'organization_id', p_organization_id,
    'name', p_name,
    'branch_code', p_branch_code
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_franchise_branch TO authenticated;

COMMIT;
