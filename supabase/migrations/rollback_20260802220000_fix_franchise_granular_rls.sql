-- ==============================================================================
-- ROLLBACK MIGRATION: Revert Franchise Granular RLS Policies
-- Description: Restores Pattern 2 (granular) tables to use get_user_restaurant_id
-- or profile subqueries, removing the franchise-aware accessible branches check.
-- ==============================================================================

BEGIN;

-- 1. ROLLBACK CATEGORIES
DROP POLICY IF EXISTS "Franchise-aware categories select" ON public.categories;
DROP POLICY IF EXISTS "Franchise-aware categories insert" ON public.categories;
DROP POLICY IF EXISTS "Franchise-aware categories update" ON public.categories;
DROP POLICY IF EXISTS "Franchise-aware categories delete" ON public.categories;

CREATE POLICY "categories_select_for_restaurant" ON public.categories
  FOR SELECT TO authenticated
  USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = (SELECT auth.uid())
  ));

CREATE POLICY "categories_insert_by_managers" ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = (SELECT auth.uid()))
    AND EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY(ARRAY['owner'::user_role, 'admin'::user_role, 'manager'::user_role, 'chef'::user_role])
    )
  );

CREATE POLICY "categories_update_by_managers" ON public.categories
  FOR UPDATE TO authenticated
  USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = (SELECT auth.uid()))
    AND EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY(ARRAY['owner'::user_role, 'admin'::user_role, 'manager'::user_role, 'chef'::user_role])
    )
  )
  WITH CHECK (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "categories_delete_by_managers" ON public.categories
  FOR DELETE TO authenticated
  USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = (SELECT auth.uid()))
    AND EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY(ARRAY['owner'::user_role, 'admin'::user_role, 'manager'::user_role, 'chef'::user_role])
    )
  );


-- 2. ROLLBACK POS TRANSACTIONS
DROP POLICY IF EXISTS "Franchise-aware pos_transactions select" ON public.pos_transactions;
DROP POLICY IF EXISTS "Franchise-aware pos_transactions insert" ON public.pos_transactions;
DROP POLICY IF EXISTS "Franchise-aware pos_transactions update" ON public.pos_transactions;
DROP POLICY IF EXISTS "Franchise-aware pos_transactions delete" ON public.pos_transactions;

CREATE POLICY "Restaurant members can view transactions" ON public.pos_transactions
  FOR SELECT TO authenticated
  USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Restaurant members can insert transactions" ON public.pos_transactions
  FOR INSERT TO authenticated
  WITH CHECK (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  ));


-- 3. ROLLBACK PROFILES
DROP POLICY IF EXISTS "Franchise-aware profiles select" ON public.profiles;
DROP POLICY IF EXISTS "Franchise-aware profiles insert" ON public.profiles;
DROP POLICY IF EXISTS "Franchise-aware profiles delete" ON public.profiles;

CREATE POLICY "Users can view own profile or admins view all"
ON public.profiles FOR SELECT USING (
  id = auth.uid() 
  OR (
    public.get_user_restaurant_id(auth.uid()) = restaurant_id
    AND public.user_is_admin_or_owner(auth.uid())
  )
);

CREATE POLICY "Admins can insert profiles in restaurant"
ON public.profiles FOR INSERT WITH CHECK (
  public.get_user_restaurant_id(auth.uid()) = restaurant_id
  AND public.user_is_admin_or_owner(auth.uid())
);

CREATE POLICY "Admins can delete profiles in restaurant"
ON public.profiles FOR DELETE USING (
  public.get_user_restaurant_id(auth.uid()) = restaurant_id
  AND public.user_is_admin_or_owner(auth.uid())
);


-- 4. ROLLBACK USER ROLES
DROP POLICY IF EXISTS "Franchise-aware user_roles manage" ON public.user_roles;

CREATE POLICY "Admins manage user_roles"
ON public.user_roles FOR ALL USING (
  restaurant_id = public.get_user_restaurant_id(auth.uid())
  AND public.user_is_admin_or_owner(auth.uid())
)
WITH CHECK (
  restaurant_id = public.get_user_restaurant_id(auth.uid())
  AND public.user_is_admin_or_owner(auth.uid())
);


-- 5. ROLLBACK SCHEDULED REPORT SETTINGS
DROP POLICY IF EXISTS "Franchise-aware scheduled_report_settings select" ON public.scheduled_report_settings;
DROP POLICY IF EXISTS "Franchise-aware scheduled_report_settings insert" ON public.scheduled_report_settings;
DROP POLICY IF EXISTS "Franchise-aware scheduled_report_settings update" ON public.scheduled_report_settings;
DROP POLICY IF EXISTS "Franchise-aware scheduled_report_settings delete" ON public.scheduled_report_settings;

CREATE POLICY "Users can view scheduled_report_settings for their restaurant" ON public.scheduled_report_settings
  FOR SELECT TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "Admins can insert scheduled_report_settings" ON public.scheduled_report_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    restaurant_id = public.get_user_restaurant_id()
  );

CREATE POLICY "Admins can update scheduled_report_settings" ON public.scheduled_report_settings
  FOR UPDATE TO authenticated
  USING (
    restaurant_id = public.get_user_restaurant_id()
  )
  WITH CHECK (
    restaurant_id = public.get_user_restaurant_id()
  );

CREATE POLICY "Admins can delete scheduled_report_settings" ON public.scheduled_report_settings
  FOR DELETE TO authenticated
  USING (
    restaurant_id = public.get_user_restaurant_id()
  );


-- 6. Revert dynamic policies.
-- Note: Reverting the dynamic policies generated in step 6 of the forward migration is 
-- complex because we would need to know the original policy names and structures. 
-- However, we can use a similar dynamic block to revert policies that were prefixed with "Franchise-aware ".
DO $$
DECLARE
    pol RECORD;
    new_qual TEXT;
    new_with_check TEXT;
    drop_stmt TEXT;
    create_stmt TEXT;
    orig_name TEXT;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND policyname LIKE 'Franchise-aware %'
        AND tablename NOT IN ('profiles', 'user_roles', 'scheduled_report_settings', 'pos_transactions', 'categories')
    LOOP
        orig_name := REPLACE(pol.policyname, 'Franchise-aware ', '');
        
        new_qual := REPLACE(pol.qual, 'restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))', 'public.get_user_restaurant_id(auth.uid()) = restaurant_id');
        
        IF pol.with_check IS NOT NULL THEN
            new_with_check := REPLACE(pol.with_check, 'restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))', 'public.get_user_restaurant_id(auth.uid()) = restaurant_id');
        ELSE
            new_with_check := NULL;
        END IF;

        drop_stmt := format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
        EXECUTE drop_stmt;

        IF pol.cmd = 'ALL' THEN
            create_stmt := format('CREATE POLICY %I ON %I.%I FOR %s TO %s USING (%s) WITH CHECK (%s);', 
                                   orig_name, pol.schemaname, pol.tablename, pol.cmd, array_to_string(pol.roles, ', '), new_qual, COALESCE(new_with_check, new_qual));
        ELSIF pol.cmd = 'SELECT' OR pol.cmd = 'DELETE' THEN
            create_stmt := format('CREATE POLICY %I ON %I.%I FOR %s TO %s USING (%s);', 
                                   orig_name, pol.schemaname, pol.tablename, pol.cmd, array_to_string(pol.roles, ', '), new_qual);
        ELSIF pol.cmd = 'INSERT' THEN
            create_stmt := format('CREATE POLICY %I ON %I.%I FOR %s TO %s WITH CHECK (%s);', 
                                   orig_name, pol.schemaname, pol.tablename, pol.cmd, array_to_string(pol.roles, ', '), new_with_check);
        ELSIF pol.cmd = 'UPDATE' THEN
            create_stmt := format('CREATE POLICY %I ON %I.%I FOR %s TO %s USING (%s) WITH CHECK (%s);', 
                                   orig_name, pol.schemaname, pol.tablename, pol.cmd, array_to_string(pol.roles, ', '), new_qual, COALESCE(new_with_check, new_qual));
        END IF;

        EXECUTE create_stmt;
    END LOOP;
END;
$$;

COMMIT;
