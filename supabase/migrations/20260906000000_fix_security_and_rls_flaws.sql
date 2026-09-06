-- ==============================================================================
-- MIGRATION: Fix Critical Security, Multi-Branch, and Access Control Flaws
-- Date: 2026-09-06
-- Description:
--   1. Recreate orgmem_select so all organization members can see fellow team members
--   2. Recreate orgmem_manage so organization owners/admins can manage members
--   3. Add check_user_branch_access() RPC for client-side branch switching validation
--   4. Tighten hotel channel management RLS from public to authenticated tenant-scoped
-- ==============================================================================

BEGIN;

-- 1. Helper: check_user_branch_access
CREATE OR REPLACE FUNCTION public.check_user_branch_access(target_branch_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF public.is_platform_admin() THEN
    RETURN TRUE;
  END IF;

  RETURN target_branch_id = ANY(public.get_user_accessible_restaurants(auth.uid()));
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.check_user_branch_access(UUID) TO authenticated;

-- 2. organization_members RLS Policies
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orgmem_select" ON public.organization_members;
CREATE POLICY "orgmem_select" ON public.organization_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = auth.uid()
    )
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "orgmem_manage" ON public.organization_members;
CREATE POLICY "orgmem_manage" ON public.organization_members FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
    )
    OR public.is_platform_admin()
  )
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
    )
    OR public.is_platform_admin()
  );

-- 3. Hotel Channel Manager RLS Hardening (Revoke public, enforce tenant-authenticated)
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['channel_rate_rules', 'channel_restrictions', 'channel_room_mapping'])
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('DROP POLICY IF EXISTS "public_access" ON %I;', t);
      EXECUTE format('DROP POLICY IF EXISTS "allow_all" ON %I;', t);
      EXECUTE format('DROP POLICY IF EXISTS "allow_anon" ON %I;', t);
      EXECUTE format('DROP POLICY IF EXISTS "%s_tenant_access" ON %I;', t);
      EXECUTE format(
        'CREATE POLICY "%s_tenant_access" ON %I FOR ALL TO authenticated USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) OR public.is_platform_admin()) WITH CHECK (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) OR public.is_platform_admin());',
        t, t
      );
    END IF;
  END LOOP;
END $$;

COMMIT;
