-- ==============================================================================
-- MIGRATION: Fix Franchise Granular RLS Policies
-- Description: Updates Pattern 2 (granular) tables to use get_user_accessible_restaurants
-- instead of restricting access to the single primary profile restaurant_id.
-- ==============================================================================

BEGIN;

-- 1. FIX CATEGORIES
DROP POLICY IF EXISTS "categories_select_for_restaurant" ON public.categories;
DROP POLICY IF EXISTS "categories_insert_by_managers" ON public.categories;
DROP POLICY IF EXISTS "categories_update_by_managers" ON public.categories;
DROP POLICY IF EXISTS "categories_delete_by_managers" ON public.categories;
DROP POLICY IF EXISTS "Users can view categories for their restaurant" ON public.categories;

CREATE POLICY "Franchise-aware categories select" ON public.categories
  FOR SELECT TO authenticated
  USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())));

CREATE POLICY "Franchise-aware categories insert" ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK (
    restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
        AND profiles.role = ANY(ARRAY['owner'::user_role, 'admin'::user_role, 'manager'::user_role, 'chef'::user_role])
    )
  );

CREATE POLICY "Franchise-aware categories update" ON public.categories
  FOR UPDATE TO authenticated
  USING (
    restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
        AND profiles.role = ANY(ARRAY['owner'::user_role, 'admin'::user_role, 'manager'::user_role, 'chef'::user_role])
    )
  )
  WITH CHECK (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())));

CREATE POLICY "Franchise-aware categories delete" ON public.categories
  FOR DELETE TO authenticated
  USING (
    restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
        AND profiles.role = ANY(ARRAY['owner'::user_role, 'admin'::user_role, 'manager'::user_role, 'chef'::user_role])
    )
  );


-- 2. FIX POS TRANSACTIONS
DROP POLICY IF EXISTS "Restaurant members can view transactions" ON public.pos_transactions;
DROP POLICY IF EXISTS "Restaurant members can insert transactions" ON public.pos_transactions;
DROP POLICY IF EXISTS "Restaurant members can update transactions" ON public.pos_transactions;
DROP POLICY IF EXISTS "Restaurant members can delete transactions" ON public.pos_transactions;
DROP POLICY IF EXISTS "Management roles can delete pos transactions" ON public.pos_transactions;

CREATE POLICY "Franchise-aware pos_transactions select" ON public.pos_transactions
  FOR SELECT TO authenticated
  USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())));

CREATE POLICY "Franchise-aware pos_transactions insert" ON public.pos_transactions
  FOR INSERT TO authenticated
  WITH CHECK (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())));

CREATE POLICY "Franchise-aware pos_transactions update" ON public.pos_transactions
  FOR UPDATE TO authenticated
  USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())))
  WITH CHECK (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())));

CREATE POLICY "Franchise-aware pos_transactions delete" ON public.pos_transactions
  FOR DELETE TO authenticated
  USING (
    restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'owner')
    )
  );


-- 3. FIX PROFILES
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles in restaurant" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles in restaurant" ON public.profiles;

CREATE POLICY "Franchise-aware profiles select"
ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid() 
  OR (
    restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
    AND public.user_is_admin_or_owner(auth.uid())
  )
);

CREATE POLICY "Franchise-aware profiles insert"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (
  restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  AND public.user_is_admin_or_owner(auth.uid())
);

CREATE POLICY "Franchise-aware profiles delete"
ON public.profiles FOR DELETE TO authenticated
USING (
  restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  AND public.user_is_admin_or_owner(auth.uid())
);


-- 4. FIX USER ROLES
DROP POLICY IF EXISTS "Admins manage user_roles" ON public.user_roles;

CREATE POLICY "Franchise-aware user_roles manage"
ON public.user_roles FOR ALL TO authenticated
USING (
  restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  AND public.user_is_admin_or_owner(auth.uid())
)
WITH CHECK (
  restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  AND public.user_is_admin_or_owner(auth.uid())
);


-- 5. FIX SCHEDULED REPORT SETTINGS
DROP POLICY IF EXISTS "Users can view scheduled_report_settings for their restaurant" ON public.scheduled_report_settings;
DROP POLICY IF EXISTS "Admins can insert scheduled_report_settings" ON public.scheduled_report_settings;
DROP POLICY IF EXISTS "Admins can update scheduled_report_settings" ON public.scheduled_report_settings;
DROP POLICY IF EXISTS "Admins can delete scheduled_report_settings" ON public.scheduled_report_settings;

CREATE POLICY "Franchise-aware scheduled_report_settings select" ON public.scheduled_report_settings
  FOR SELECT TO authenticated
  USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())));

CREATE POLICY "Franchise-aware scheduled_report_settings insert" ON public.scheduled_report_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
    AND public.user_is_admin_or_owner(auth.uid())
  );

CREATE POLICY "Franchise-aware scheduled_report_settings update" ON public.scheduled_report_settings
  FOR UPDATE TO authenticated
  USING (
    restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
    AND public.user_is_admin_or_owner(auth.uid())
  )
  WITH CHECK (
    restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
    AND public.user_is_admin_or_owner(auth.uid())
  );

CREATE POLICY "Franchise-aware scheduled_report_settings delete" ON public.scheduled_report_settings
  FOR DELETE TO authenticated
  USING (
    restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
    AND public.user_is_admin_or_owner(auth.uid())
  );


-- 6. Replace ANY generic policies that might still use get_user_restaurant_id via dynamic SQL
-- This block automatically finds and replaces remaining get_user_restaurant_id() policies with get_user_accessible_restaurants() for safety.
DO $$
DECLARE
    pol RECORD;
    new_qual TEXT;
    new_with_check TEXT;
    drop_stmt TEXT;
    create_stmt TEXT;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND (
            qual LIKE '%public.get_user_restaurant_id(auth.uid()) = restaurant_id%' OR
            qual LIKE '%restaurant_id = public.get_user_restaurant_id(auth.uid())%' OR
            qual LIKE '%restaurant_id = public.get_user_restaurant_id()%' OR
            with_check LIKE '%public.get_user_restaurant_id(auth.uid()) = restaurant_id%' OR
            with_check LIKE '%restaurant_id = public.get_user_restaurant_id(auth.uid())%' OR
            with_check LIKE '%restaurant_id = public.get_user_restaurant_id()%'
        )
        AND tablename NOT IN ('profiles', 'user_roles', 'scheduled_report_settings', 'pos_transactions', 'categories')
    LOOP
        -- Generate new expressions
        new_qual := REPLACE(pol.qual, 'public.get_user_restaurant_id(auth.uid()) = restaurant_id', 'restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))');
        new_qual := REPLACE(new_qual, 'restaurant_id = public.get_user_restaurant_id(auth.uid())', 'restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))');
        new_qual := REPLACE(new_qual, 'restaurant_id = public.get_user_restaurant_id()', 'restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))');
        
        IF pol.with_check IS NOT NULL THEN
            new_with_check := REPLACE(pol.with_check, 'public.get_user_restaurant_id(auth.uid()) = restaurant_id', 'restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))');
            new_with_check := REPLACE(new_with_check, 'restaurant_id = public.get_user_restaurant_id(auth.uid())', 'restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))');
            new_with_check := REPLACE(new_with_check, 'restaurant_id = public.get_user_restaurant_id()', 'restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))');
        ELSE
            new_with_check := NULL;
        END IF;

        -- Drop existing policy
        drop_stmt := format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
        EXECUTE drop_stmt;

        -- Create new policy
        IF pol.cmd = 'ALL' THEN
            create_stmt := format('CREATE POLICY %I ON %I.%I FOR %s TO %s USING (%s) WITH CHECK (%s);', 
                                   'Franchise-aware ' || pol.policyname, pol.schemaname, pol.tablename, pol.cmd, array_to_string(pol.roles, ', '), new_qual, COALESCE(new_with_check, new_qual));
        ELSIF pol.cmd = 'SELECT' OR pol.cmd = 'DELETE' THEN
            create_stmt := format('CREATE POLICY %I ON %I.%I FOR %s TO %s USING (%s);', 
                                   'Franchise-aware ' || pol.policyname, pol.schemaname, pol.tablename, pol.cmd, array_to_string(pol.roles, ', '), new_qual);
        ELSIF pol.cmd = 'INSERT' THEN
            create_stmt := format('CREATE POLICY %I ON %I.%I FOR %s TO %s WITH CHECK (%s);', 
                                   'Franchise-aware ' || pol.policyname, pol.schemaname, pol.tablename, pol.cmd, array_to_string(pol.roles, ', '), new_with_check);
        ELSIF pol.cmd = 'UPDATE' THEN
            create_stmt := format('CREATE POLICY %I ON %I.%I FOR %s TO %s USING (%s) WITH CHECK (%s);', 
                                   'Franchise-aware ' || pol.policyname, pol.schemaname, pol.tablename, pol.cmd, array_to_string(pol.roles, ', '), new_qual, COALESCE(new_with_check, new_qual));
        END IF;

        EXECUTE create_stmt;
    END LOOP;
END;
$$;

COMMIT;
