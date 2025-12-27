-- =====================================================
-- PLATFORM ADMIN RLS BYPASS - Complete Version
-- =====================================================

-- Step 1: Create function to check if user is platform admin
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'::user_role
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- =====================================================
-- RESTAURANTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Platform admin can view all restaurants" ON public.restaurants;
CREATE POLICY "Platform admin can view all restaurants"
ON public.restaurants FOR SELECT TO authenticated
USING (is_platform_admin() = true);

DROP POLICY IF EXISTS "Platform admin can manage all restaurants" ON public.restaurants;
CREATE POLICY "Platform admin can manage all restaurants"
ON public.restaurants FOR ALL TO authenticated
USING (is_platform_admin() = true)
WITH CHECK (is_platform_admin() = true);

-- =====================================================
-- PROFILES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Platform admin can view all profiles" ON public.profiles;
CREATE POLICY "Platform admin can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (is_platform_admin() = true);

DROP POLICY IF EXISTS "Platform admin can manage all profiles" ON public.profiles;
CREATE POLICY "Platform admin can manage all profiles"
ON public.profiles FOR ALL TO authenticated
USING (is_platform_admin() = true)
WITH CHECK (is_platform_admin() = true);

-- =====================================================
-- RESTAURANT_SUBSCRIPTIONS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Platform admin can view all subscriptions" ON public.restaurant_subscriptions;
CREATE POLICY "Platform admin can view all subscriptions"
ON public.restaurant_subscriptions FOR SELECT TO authenticated
USING (is_platform_admin() = true);

DROP POLICY IF EXISTS "Platform admin can manage all subscriptions" ON public.restaurant_subscriptions;
CREATE POLICY "Platform admin can manage all subscriptions"
ON public.restaurant_subscriptions FOR ALL TO authenticated
USING (is_platform_admin() = true)
WITH CHECK (is_platform_admin() = true);

-- =====================================================
-- SUBSCRIPTION_PLANS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Platform admin can manage subscription_plans" ON public.subscription_plans;
CREATE POLICY "Platform admin can manage subscription_plans"
ON public.subscription_plans FOR ALL TO authenticated
USING (is_platform_admin() = true)
WITH CHECK (is_platform_admin() = true);

-- =====================================================
-- Done! Refresh Platform Admin pages to see data.
-- =====================================================
