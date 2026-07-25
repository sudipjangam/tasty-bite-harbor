-- ================================================================
-- EMERGENCY FIX: Simplified profiles RLS (applied 2026-07-25)
-- Replaces complex org-aware profiles policies with simple ones
-- that cannot cause infinite recursion.
-- ================================================================

BEGIN;

-- Helper function for org-aware restaurant lookups (bypass RLS)
CREATE OR REPLACE FUNCTION public.get_restaurant_org_id_bypass_rls(p_rest_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.restaurants WHERE id = p_rest_id;
$$;

-- Drop all profiles policies
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile or admins view all in restaurant" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles in their restaurant" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles in restaurant" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles in restaurant" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles in their restaurant" ON public.profiles;
DROP POLICY IF EXISTS "Platform admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Platform admin can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;

-- SELECT: own profile + same restaurant + platform admin
CREATE POLICY "profiles_select"
ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR restaurant_id = public.get_user_restaurant_id(auth.uid())
  OR public.is_platform_admin()
);

-- UPDATE: own profile only
CREATE POLICY "profiles_update"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- INSERT: self-insert on first login + admin for restaurant
CREATE POLICY "profiles_insert"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (
  id = auth.uid()
  OR (
    restaurant_id = public.get_user_restaurant_id(auth.uid())
    AND public.user_is_admin_or_owner(auth.uid())
  )
  OR public.is_platform_admin()
);

-- DELETE: admin for restaurant
CREATE POLICY "profiles_delete"
ON public.profiles FOR DELETE TO authenticated
USING (
  (
    restaurant_id = public.get_user_restaurant_id(auth.uid())
    AND public.user_is_admin_or_owner(auth.uid())
  )
  OR public.is_platform_admin()
);

COMMIT;
