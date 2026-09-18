-- ============================================================================
-- FIX: Infinite recursion on organization_members relation in RLS
-- Date: 2026-09-18
--
-- Problem:
-- Policy "orgmem_manage" on public.organization_members was defined FOR ALL
-- with a subquery directly selecting from public.organization_members without
-- SECURITY DEFINER, causing PostgreSQL to evaluate the policy inside itself
-- endlessly: "ERROR: infinite recursion detected in policy for relation organization_members".
--
-- Solution:
-- 1. Ensure security definer functions check_user_is_org_admin_or_owner and
--    check_user_is_org_member bypass RLS cleanly and handle organizations.owner_user_id.
-- 2. Replace recursive subqueries on organization_members with the SECURITY DEFINER functions.
-- 3. Separate SELECT from INSERT/UPDATE/DELETE on organization_members.
-- ============================================================================

BEGIN;

-- 1. Ensure security definer functions exist and do not cause recursion
CREATE OR REPLACE FUNCTION public.check_user_is_org_admin_or_owner(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_org_id 
      AND user_id = p_user_id 
      AND role IN ('owner', 'admin')
  ) OR EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = p_org_id
      AND owner_user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.check_user_is_org_member(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_org_id 
      AND user_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = p_org_id
      AND owner_user_id = p_user_id
  );
$$;

-- 2. Drop recursive policies on organization_members
DROP POLICY IF EXISTS "orgmem_manage" ON public.organization_members;
DROP POLICY IF EXISTS "orgmem_select" ON public.organization_members;
DROP POLICY IF EXISTS "orgmem_insert" ON public.organization_members;
DROP POLICY IF EXISTS "orgmem_update" ON public.organization_members;
DROP POLICY IF EXISTS "orgmem_delete" ON public.organization_members;

-- 3. Re-create clean non-recursive policies on organization_members
CREATE POLICY "orgmem_select" ON public.organization_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.check_user_is_org_admin_or_owner(organization_id, auth.uid())
    OR public.is_platform_admin()
  );

CREATE POLICY "orgmem_insert" ON public.organization_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.check_user_is_org_admin_or_owner(organization_id, auth.uid())
    OR public.is_platform_admin()
  );

CREATE POLICY "orgmem_update" ON public.organization_members
  FOR UPDATE TO authenticated
  USING (
    public.check_user_is_org_admin_or_owner(organization_id, auth.uid())
    OR public.is_platform_admin()
  )
  WITH CHECK (
    public.check_user_is_org_admin_or_owner(organization_id, auth.uid())
    OR public.is_platform_admin()
  );

CREATE POLICY "orgmem_delete" ON public.organization_members
  FOR DELETE TO authenticated
  USING (
    public.check_user_is_org_admin_or_owner(organization_id, auth.uid())
    OR public.is_platform_admin()
  );

-- 4. Fix organizations update policy to use security definer
DROP POLICY IF EXISTS "org_update" ON public.organizations;
CREATE POLICY "org_update" ON public.organizations
  FOR UPDATE TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR public.check_user_is_org_admin_or_owner(id, auth.uid())
    OR public.is_platform_admin()
  );

-- 5. Fix organization_subscriptions manage policy
DROP POLICY IF EXISTS "orgsub_manage" ON public.organization_subscriptions;
CREATE POLICY "orgsub_manage" ON public.organization_subscriptions
  FOR ALL TO authenticated
  USING (
    public.check_user_is_org_admin_or_owner(organization_id, auth.uid())
    OR public.is_platform_admin()
  )
  WITH CHECK (
    public.check_user_is_org_admin_or_owner(organization_id, auth.uid())
    OR public.is_platform_admin()
  );

-- 6. Fix approval_requests policies to use security definer functions
DROP POLICY IF EXISTS "approval_requests_select" ON public.approval_requests;
CREATE POLICY "approval_requests_select" ON public.approval_requests
  FOR SELECT TO authenticated
  USING (
    requester_id = auth.uid()
    OR restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
    OR public.check_user_is_org_member(organization_id, auth.uid())
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "approval_requests_update" ON public.approval_requests;
CREATE POLICY "approval_requests_update" ON public.approval_requests
  FOR UPDATE TO authenticated
  USING (
    restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
    OR public.check_user_is_org_admin_or_owner(organization_id, auth.uid())
    OR public.is_platform_admin()
  )
  WITH CHECK (
    restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
    OR public.check_user_is_org_admin_or_owner(organization_id, auth.uid())
    OR public.is_platform_admin()
  );

COMMIT;
