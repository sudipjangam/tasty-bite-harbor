-- Fix profiles table policies - drop existing and recreate
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles in their restaurant" ON public.profiles;
DROP POLICY IF EXISTS "profiles_policy" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile or admins view all in restaurant" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles in their restaurant" ON public.profiles;

CREATE POLICY "Users can view own profile or admins view all"
ON public.profiles
FOR SELECT
USING (
  id = auth.uid() 
  OR (
    public.get_user_restaurant_id(auth.uid()) = restaurant_id
    AND public.user_is_admin_or_owner(auth.uid())
  )
);

CREATE POLICY "Users can update their own profile only"
ON public.profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can insert profiles in restaurant"
ON public.profiles
FOR INSERT
WITH CHECK (
  public.get_user_restaurant_id(auth.uid()) = restaurant_id
  AND public.user_is_admin_or_owner(auth.uid())
);

CREATE POLICY "Admins can delete profiles in restaurant"
ON public.profiles
FOR DELETE
USING (
  public.get_user_restaurant_id(auth.uid()) = restaurant_id
  AND public.user_is_admin_or_owner(auth.uid())
);

-- Fix USER_ROLES TABLE policies
DROP POLICY IF EXISTS "user_roles_policy" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user_roles in their restaurant" ON public.user_roles;

CREATE POLICY "Users view own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins manage user_roles"
ON public.user_roles
FOR ALL
USING (
  restaurant_id = public.get_user_restaurant_id(auth.uid())
  AND public.user_is_admin_or_owner(auth.uid())
)
WITH CHECK (
  restaurant_id = public.get_user_restaurant_id(auth.uid())
  AND public.user_is_admin_or_owner(auth.uid())
);