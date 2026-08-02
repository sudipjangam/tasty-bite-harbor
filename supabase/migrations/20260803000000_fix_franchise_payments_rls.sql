-- ==============================================================================
-- MIGRATION: Fix Franchise RLS for Payment Settings and Remaining Tables
-- Description: Updates payment_settings, payment_methods, and any other tables
-- using the inline profile subquery to use get_user_accessible_restaurants.
-- ==============================================================================

BEGIN;

-- 1. FIX PAYMENT SETTINGS
DROP POLICY IF EXISTS "payment_settings_select_own_restaurant" ON public.payment_settings;
DROP POLICY IF EXISTS "payment_settings_insert_own_restaurant" ON public.payment_settings;
DROP POLICY IF EXISTS "payment_settings_update_own_restaurant" ON public.payment_settings;
DROP POLICY IF EXISTS "payment_settings_delete_own_restaurant" ON public.payment_settings;

CREATE POLICY "Franchise-aware payment_settings select" ON public.payment_settings
  FOR SELECT TO authenticated
  USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())));

CREATE POLICY "Franchise-aware payment_settings insert" ON public.payment_settings
  FOR INSERT TO authenticated
  WITH CHECK (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())));

CREATE POLICY "Franchise-aware payment_settings update" ON public.payment_settings
  FOR UPDATE TO authenticated
  USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())))
  WITH CHECK (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())));

CREATE POLICY "Franchise-aware payment_settings delete" ON public.payment_settings
  FOR DELETE TO authenticated
  USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())));


-- 2. FIX PAYMENT METHODS
DROP POLICY IF EXISTS "restaurant_payment_methods_policy" ON public.payment_methods;

CREATE POLICY "Franchise-aware payment_methods policy" ON public.payment_methods
  FOR ALL TO authenticated
  USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())))
  WITH CHECK (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())));


-- 3. FIX SHIFT TYPES
-- (Commented out because public.shift_types does not exist in this environment)
-- DROP POLICY IF EXISTS "restaurant_shift_types_policy" ON public.shift_types;

-- CREATE POLICY "Franchise-aware shift_types policy" ON public.shift_types
--   FOR ALL TO authenticated
--   USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())))
--   WITH CHECK (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())));


-- 4. Catch-all dynamic SQL for ANY remaining tables using the inline profile subquery
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
            qual LIKE '%restaurant_id FROM %profiles WHERE id = %auth.uid()%' OR
            with_check LIKE '%restaurant_id FROM %profiles WHERE id = %auth.uid()%'
        )
        AND tablename NOT IN ('payment_settings', 'payment_methods', 'shift_types', 'profiles', 'user_roles')
    LOOP
        -- We will replace the entire IN (...) subquery with = ANY(...)
        -- Using regex replace to catch formatting variations
        new_qual := regexp_replace(
            pol.qual, 
            'restaurant_id\s+IN\s*\(\s*SELECT\s+restaurant_id\s+FROM\s+(public\.)?profiles\s+WHERE\s+id\s*=\s*(\(SELECT\s+)?auth\.uid\(\)\)?\s*\)', 
            'restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))', 
            'g'
        );
        
        IF pol.with_check IS NOT NULL THEN
            new_with_check := regexp_replace(
                pol.with_check, 
                'restaurant_id\s+IN\s*\(\s*SELECT\s+restaurant_id\s+FROM\s+(public\.)?profiles\s+WHERE\s+id\s*=\s*(\(SELECT\s+)?auth\.uid\(\)\)?\s*\)', 
                'restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))', 
                'g'
            );
        ELSE
            new_with_check := NULL;
        END IF;

        -- If regex didn't change anything, it means the pattern didn't perfectly match our regex. We skip to avoid syntax errors.
        IF new_qual = pol.qual AND (pol.with_check IS NULL OR new_with_check = pol.with_check) THEN
            CONTINUE;
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
