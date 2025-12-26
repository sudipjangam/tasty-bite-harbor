-- ROLLBACK: Super Admin System
-- Run this to remove all super admin database objects

-- Drop policies first (they depend on the function)
DROP POLICY IF EXISTS "Users can check their own super_admin status" ON public.super_admins;
DROP POLICY IF EXISTS "Super admins can manage super_admins" ON public.super_admins;
DROP POLICY IF EXISTS "Super admins can view super_admins" ON public.super_admins;
DROP POLICY IF EXISTS "Super admins can view all restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Super admins can manage all restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Super admins can view all subscription_plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Super admins can manage subscription_plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Super admins can view all restaurant_subscriptions" ON public.restaurant_subscriptions;
DROP POLICY IF EXISTS "Super admins can manage all restaurant_subscriptions" ON public.restaurant_subscriptions;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.profiles;

-- Drop functions
DROP FUNCTION IF EXISTS public.is_super_admin(UUID);
DROP FUNCTION IF EXISTS public.get_platform_stats();
DROP FUNCTION IF EXISTS public.create_restaurant_with_owner(TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, BOOLEAN);

-- Drop table
DROP TABLE IF EXISTS public.super_admins;

-- Done!
SELECT 'Super Admin rollback complete' as status;
