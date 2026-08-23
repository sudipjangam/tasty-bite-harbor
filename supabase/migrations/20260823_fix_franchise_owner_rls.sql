-- ==============================================================================
-- MIGRATION: Fix Franchise Owner RLS Access
-- Date: 2026-08-23
-- Description:
--   1. Extend user_is_admin_or_owner() to check organization_members
--   2. Fix orgmem_manage policy so org owners can manage members
--   3. Extend get_user_restaurant_id() to fall back to HQ for org-owners
--   4. Fix org_insert so org owners can create orgs
--
-- ROOT CAUSE: user_is_admin_or_owner() only checked user_roles (restaurant-scoped).
-- Franchise owners exist in organization_members, not user_roles. This made
-- ~40 RLS policies return false for INSERT/UPDATE/DELETE by franchise owners.
-- ==============================================================================

BEGIN;

-- ============================================================================
-- 1. CORE FIX: user_is_admin_or_owner — now checks org-level roles too
-- ============================================================================
CREATE OR REPLACE FUNCTION public.user_is_admin_or_owner(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check 1: branch-level role (existing behaviour, unchanged)
  IF EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = $1
    AND ur.role IN ('admin', 'owner')
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check 2: org-level role (NEW — franchise owner/admin)
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

-- ============================================================================
-- 2. FIX: get_user_restaurant_id — fall back to HQ for org-owners
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_restaurant_id(_user_id UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id UUID;
BEGIN
  -- First: direct profile restaurant_id (branch staff, single-restaurant owners)
  SELECT restaurant_id INTO v_restaurant_id
  FROM public.profiles
  WHERE id = _user_id;

  IF v_restaurant_id IS NOT NULL THEN
    RETURN v_restaurant_id;
  END IF;

  -- Fallback: org-owner with no branch assignment → return HQ restaurant
  SELECT r.id INTO v_restaurant_id
  FROM public.organization_members om
  JOIN public.restaurants r ON r.organization_id = om.organization_id
  WHERE om.user_id = _user_id
    AND r.is_headquarters = true
  LIMIT 1;

  RETURN v_restaurant_id;
END;
$$;

-- ============================================================================
-- 3. FIX: organization_members — let org owners manage members
--    Was: is_platform_admin() only → franchise owners couldn't add team
-- ============================================================================
DROP POLICY IF EXISTS "orgmem_manage" ON public.organization_members;

CREATE POLICY "orgmem_manage" ON public.organization_members FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR public.is_platform_admin()
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR public.is_platform_admin()
  );

-- ============================================================================
-- 4. FIX: organizations INSERT — let authenticated users create orgs
--    Was: is_platform_admin() only → self-service franchise creation blocked
-- ============================================================================
DROP POLICY IF EXISTS "org_insert" ON public.organizations;

CREATE POLICY "org_insert" ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    OR public.is_platform_admin()
  );

-- Also fix UPDATE to include org admins (not just owner_user_id)
DROP POLICY IF EXISTS "org_update" ON public.organizations;

CREATE POLICY "org_update" ON public.organizations FOR UPDATE TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR public.is_platform_admin()
  );

-- ============================================================================
-- 5. FIX: organization_subscriptions — let org owners view AND manage
-- ============================================================================
DROP POLICY IF EXISTS "orgsub_manage" ON public.organization_subscriptions;

CREATE POLICY "orgsub_manage" ON public.organization_subscriptions FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR public.is_platform_admin()
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR public.is_platform_admin()
  );

-- ============================================================================
-- VERIFICATION QUERIES (run after commit):
--
-- 1. Test user_is_admin_or_owner for a franchise owner:
--    SELECT public.user_is_admin_or_owner('<franchise_owner_uuid>');
--    → Should return TRUE
--
-- 2. Test get_user_restaurant_id for a franchise owner:
--    SELECT public.get_user_restaurant_id('<franchise_owner_uuid>');
--    → Should return their HQ restaurant UUID
--
-- 3. Test org member insert as franchise owner:
--    INSERT INTO organization_members(organization_id, user_id, role)
--    VALUES ('<their_org_id>', '<new_user_id>', 'member');
--    → Should succeed (was failing before)
-- ============================================================================

COMMIT;
