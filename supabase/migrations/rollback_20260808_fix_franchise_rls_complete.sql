-- ==============================================================================
-- ROLLBACK: Revert Complete Franchise RLS Fix
-- Date: 2026-08-08
-- Reverts to: post-20260803 state (pre-franchise RLS overhaul)
--
-- This undoes everything in 20260808_fix_franchise_rls_complete.sql:
--   1. Restores get_user_accessible_restaurants() to old version
--   2. Restores profiles to emergency-fix state
--   3. Restores Pattern-1 tables to Component-based access via user_has_table_access()
--   4. Restores child tables to old JOIN-based policies
--   5. Restores Pattern-2 tables to old granular policies
--   6. Restores staff tables to old Component-based policies
-- ==============================================================================

BEGIN;

-- ============================================================================
-- 1. RESTORE get_user_accessible_restaurants — old version (ignores accessible_branches)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_accessible_restaurants(p_user_id UUID)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_result UUID[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT r.id) INTO v_result
  FROM public.organization_members om
  JOIN public.restaurants r ON r.organization_id = om.organization_id
  WHERE om.user_id = p_user_id;

  IF v_result IS NOT NULL AND array_length(v_result, 1) > 0 THEN
    RETURN v_result;
  END IF;

  RETURN ARRAY[(SELECT restaurant_id FROM public.profiles WHERE id = p_user_id)];
END;
$$;

-- ============================================================================
-- 2. RESTORE PROFILES — emergency-fix state (uses get_user_restaurant_id)
-- ============================================================================
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR restaurant_id = public.get_user_restaurant_id()
  OR public.is_platform_admin()
);

CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated
WITH CHECK (
  id = auth.uid()
  OR (restaurant_id = public.get_user_restaurant_id() AND public.user_is_admin_or_owner(auth.uid()))
  OR public.is_platform_admin()
);

CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE TO authenticated
USING (
  (restaurant_id = public.get_user_restaurant_id() AND public.user_is_admin_or_owner(auth.uid()))
  OR public.is_platform_admin()
);

-- ============================================================================
-- 3. RESTORE PATTERN-1 TABLES — Component-based access via user_has_table_access()
-- ============================================================================
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'orders','kitchen_orders','menu_items','expenses','invoices','payments',
    'audit_logs','backup_settings','backups','batch_productions',
    'inventory_alerts','inventory_lots','inventory_transactions',
    'customer_activities','customer_notes',
    'daily_revenue_stats','financial_reports','revenue_metrics',
    'guest_feedback','guest_preferences','guest_profiles','check_ins',
    'room_amenities','room_amenity_inventory','room_billings','room_cleaning_schedules',
    'room_food_orders','room_maintenance_requests','room_moves','room_waitlist','lost_found_items',
    'operational_costs','purchase_orders','supplier_orders','suppliers',
    'table_reservations','waitlist',
    'staff_shifts','sent_promotions',
    'restaurant_settings','restaurant_operating_hours',
    'journal_entries','budgets','monthly_budgets','chart_of_accounts',
    'split_bills','shared_bills','night_audit_logs',
    'qr_codes','homemade_production_logs',
    'rate_plans','pricing_rules','competitor_pricing','booking_channels'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Franchise-aware ' || t || ' access', t);
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated
         USING (public.user_has_table_access(%L, restaurant_id))
         WITH CHECK (public.user_has_table_access(%L, restaurant_id))',
        'Component-based ' || t || ' access', t, t, t
      );
      RAISE NOTICE 'Restored: %', t;
    EXCEPTION
      WHEN undefined_table THEN RAISE NOTICE 'SKIP (no table): %', t;
      WHEN undefined_column THEN RAISE NOTICE 'SKIP (no restaurant_id): %', t;
      WHEN others THEN RAISE NOTICE 'SKIP (error on %): %', t, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- ============================================================================
-- 3b. RESTORE CHILD TABLES — old JOIN-based policies
-- ============================================================================

-- invoice_line_items
DROP POLICY IF EXISTS "Franchise-aware invoice_line_items access" ON public.invoice_line_items;
CREATE POLICY "invoice_line_items_policy" ON public.invoice_line_items FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_line_items.invoice_id
    AND i.restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- budget_line_items
DROP POLICY IF EXISTS "Franchise-aware budget_line_items access" ON public.budget_line_items;
CREATE POLICY "budget_line_items_policy" ON public.budget_line_items FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_line_items.budget_id
    AND b.restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- journal_entry_lines
DROP POLICY IF EXISTS "Franchise-aware journal_entry_lines access" ON public.journal_entry_lines;
CREATE POLICY "journal_entry_lines_policy" ON public.journal_entry_lines FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_lines.journal_entry_id
    AND je.restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- purchase_order_items
DO $$
BEGIN
  DROP POLICY IF EXISTS "Franchise-aware purchase_order_items access" ON public.purchase_order_items;
  CREATE POLICY "Component-based purchase_order_items access" ON public.purchase_order_items FOR ALL TO authenticated
  USING (
    purchase_order_id IN (
      SELECT id FROM public.purchase_orders
      WHERE restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid())
    )
  );
EXCEPTION WHEN others THEN
  RAISE NOTICE 'SKIP purchase_order_items: %', SQLERRM;
END;
$$;

-- supplier_order_items
DO $$
BEGIN
  DROP POLICY IF EXISTS "Franchise-aware supplier_order_items access" ON public.supplier_order_items;
  CREATE POLICY "Component-based supplier_order_items access" ON public.supplier_order_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.supplier_orders so
      WHERE so.id = supplier_order_items.order_id
      AND so.restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid())
    )
  );
EXCEPTION WHEN others THEN
  RAISE NOTICE 'SKIP supplier_order_items: %', SQLERRM;
END;
$$;

-- recipe_ingredients
DO $$
BEGIN
  DROP POLICY IF EXISTS "Franchise-aware recipe_ingredients access" ON public.recipe_ingredients;
  BEGIN
    EXECUTE 'CREATE POLICY "Component-based recipe_ingredients access"
      ON public.recipe_ingredients FOR ALL TO authenticated
      USING (public.user_has_table_access(''recipe_ingredients'', restaurant_id))
      WITH CHECK (public.user_has_table_access(''recipe_ingredients'', restaurant_id))';
  EXCEPTION WHEN undefined_column THEN
    EXECUTE 'CREATE POLICY "Component-based recipe_ingredients access"
      ON public.recipe_ingredients FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_ingredients.recipe_id
                AND r.restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()))
      )';
  END;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'SKIP recipe_ingredients: %', SQLERRM;
END;
$$;

-- split_bill_portions
DO $$
BEGIN
  DROP POLICY IF EXISTS "Franchise-aware split_bill_portions access" ON public.split_bill_portions;
  CREATE POLICY "Component-based split_bill_portions access" ON public.split_bill_portions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.split_bills sb
      WHERE sb.id = split_bill_portions.split_bill_id
      AND sb.restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid())
    )
  );
EXCEPTION WHEN others THEN
  RAISE NOTICE 'SKIP split_bill_portions: %', SQLERRM;
END;
$$;

-- homemade_production_log_items
DO $$
BEGIN
  DROP POLICY IF EXISTS "Franchise-aware homemade_production_log_items access" ON public.homemade_production_log_items;
  CREATE POLICY "Component-based homemade_production_log_items access" ON public.homemade_production_log_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.homemade_production_logs hpl
      WHERE hpl.id = homemade_production_log_items.production_log_id
      AND hpl.restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid())
    )
  );
EXCEPTION WHEN others THEN
  RAISE NOTICE 'SKIP homemade_production_log_items: %', SQLERRM;
END;
$$;

-- ============================================================================
-- 4. RESTORE PATTERN-2 TABLES — old granular policies
-- ============================================================================

-- 4a. ORDERS UNIFIED
DROP POLICY IF EXISTS "Franchise-aware orders_unified select" ON public.orders_unified;
DROP POLICY IF EXISTS "Franchise-aware orders_unified insert" ON public.orders_unified;
DROP POLICY IF EXISTS "Franchise-aware orders_unified update" ON public.orders_unified;
DROP POLICY IF EXISTS "Franchise-aware orders_unified delete" ON public.orders_unified;

CREATE POLICY "orders_unified_select" ON public.orders_unified FOR SELECT TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id() OR public.is_platform_admin());
CREATE POLICY "orders_unified_insert" ON public.orders_unified FOR INSERT TO authenticated
  WITH CHECK (restaurant_id = public.get_user_restaurant_id());
CREATE POLICY "orders_unified_update" ON public.orders_unified FOR UPDATE TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id())
  WITH CHECK (restaurant_id = public.get_user_restaurant_id());
CREATE POLICY "orders_unified_delete" ON public.orders_unified FOR DELETE TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id() AND public.user_is_admin_or_owner(auth.uid()));

-- 4b. RESERVATIONS
DROP POLICY IF EXISTS "Franchise-aware reservations select" ON public.reservations;
DROP POLICY IF EXISTS "Franchise-aware reservations insert" ON public.reservations;
DROP POLICY IF EXISTS "Franchise-aware reservations update" ON public.reservations;
DROP POLICY IF EXISTS "Franchise-aware reservations delete" ON public.reservations;

CREATE POLICY "reservations_select" ON public.reservations FOR SELECT TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id() OR public.is_platform_admin());
CREATE POLICY "reservations_insert" ON public.reservations FOR INSERT TO authenticated
  WITH CHECK (restaurant_id = public.get_user_restaurant_id());
CREATE POLICY "reservations_update" ON public.reservations FOR UPDATE TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id())
  WITH CHECK (restaurant_id = public.get_user_restaurant_id());
CREATE POLICY "reservations_delete" ON public.reservations FOR DELETE TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id());

-- 4c. RESTAURANT TABLES
DROP POLICY IF EXISTS "Franchise-aware restaurant_tables select" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Franchise-aware restaurant_tables insert" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Franchise-aware restaurant_tables update" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Franchise-aware restaurant_tables delete" ON public.restaurant_tables;

CREATE POLICY "restaurant_tables_select" ON public.restaurant_tables FOR SELECT TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id() OR public.is_platform_admin());
CREATE POLICY "restaurant_tables_insert" ON public.restaurant_tables FOR INSERT TO authenticated
  WITH CHECK (restaurant_id = public.get_user_restaurant_id() AND public.user_is_admin_or_owner(auth.uid()));
CREATE POLICY "restaurant_tables_update" ON public.restaurant_tables FOR UPDATE TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id() AND public.user_is_admin_or_owner(auth.uid()))
  WITH CHECK (restaurant_id = public.get_user_restaurant_id());
CREATE POLICY "restaurant_tables_delete" ON public.restaurant_tables FOR DELETE TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id() AND public.user_is_admin_or_owner(auth.uid()));

-- 4d. ROOMS
DROP POLICY IF EXISTS "Franchise-aware rooms select" ON public.rooms;
DROP POLICY IF EXISTS "Franchise-aware rooms insert" ON public.rooms;
DROP POLICY IF EXISTS "Franchise-aware rooms update" ON public.rooms;
DROP POLICY IF EXISTS "Franchise-aware rooms delete" ON public.rooms;

CREATE POLICY "rooms_select" ON public.rooms FOR SELECT TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id() OR public.is_platform_admin());
CREATE POLICY "rooms_insert" ON public.rooms FOR INSERT TO authenticated
  WITH CHECK (restaurant_id = public.get_user_restaurant_id() AND public.user_is_admin_or_owner(auth.uid()));
CREATE POLICY "rooms_update" ON public.rooms FOR UPDATE TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id())
  WITH CHECK (restaurant_id = public.get_user_restaurant_id());
CREATE POLICY "rooms_delete" ON public.rooms FOR DELETE TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id() AND public.user_is_admin_or_owner(auth.uid()));

-- 4e. PROMOTION CAMPAIGNS
DROP POLICY IF EXISTS "Franchise-aware promotion_campaigns select" ON public.promotion_campaigns;
DROP POLICY IF EXISTS "Franchise-aware promotion_campaigns insert" ON public.promotion_campaigns;
DROP POLICY IF EXISTS "Franchise-aware promotion_campaigns update" ON public.promotion_campaigns;
DROP POLICY IF EXISTS "Franchise-aware promotion_campaigns delete" ON public.promotion_campaigns;

CREATE POLICY "promotion_campaigns_select" ON public.promotion_campaigns FOR SELECT TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id() OR public.is_platform_admin());
CREATE POLICY "promotion_campaigns_insert" ON public.promotion_campaigns FOR INSERT TO authenticated
  WITH CHECK (restaurant_id = public.get_user_restaurant_id() AND public.user_is_admin_or_owner(auth.uid()));
CREATE POLICY "promotion_campaigns_update" ON public.promotion_campaigns FOR UPDATE TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id() AND public.user_is_admin_or_owner(auth.uid()))
  WITH CHECK (restaurant_id = public.get_user_restaurant_id());
CREATE POLICY "promotion_campaigns_delete" ON public.promotion_campaigns FOR DELETE TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id() AND public.user_is_admin_or_owner(auth.uid()));

-- 4f. DAILY SUMMARY REPORTS
DROP POLICY IF EXISTS "Franchise-aware daily_summary_reports select" ON public.daily_summary_reports;
DROP POLICY IF EXISTS "Franchise-aware daily_summary_reports insert" ON public.daily_summary_reports;
DROP POLICY IF EXISTS "Franchise-aware daily_summary_reports update" ON public.daily_summary_reports;

CREATE POLICY "daily_summary_reports_select" ON public.daily_summary_reports FOR SELECT TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id() OR public.is_platform_admin());
CREATE POLICY "daily_summary_reports_insert" ON public.daily_summary_reports FOR INSERT TO authenticated
  WITH CHECK (restaurant_id = public.get_user_restaurant_id());
CREATE POLICY "daily_summary_reports_update" ON public.daily_summary_reports FOR UPDATE TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id())
  WITH CHECK (restaurant_id = public.get_user_restaurant_id());

-- ============================================================================
-- 5. RESTORE STAFF TABLES — Component-based restaurant_id policies
-- ============================================================================

-- 5a. STAFF
DROP POLICY IF EXISTS "Franchise-aware staff select" ON public.staff;
DROP POLICY IF EXISTS "Franchise-aware staff insert" ON public.staff;
DROP POLICY IF EXISTS "Franchise-aware staff update" ON public.staff;
DROP POLICY IF EXISTS "Franchise-aware staff delete" ON public.staff;

CREATE POLICY "staff_select" ON public.staff FOR SELECT TO authenticated
  USING (public.user_has_table_access('staff', restaurant_id) OR public.is_platform_admin());
CREATE POLICY "staff_insert" ON public.staff FOR INSERT TO authenticated
  WITH CHECK (public.user_has_table_access('staff', restaurant_id) AND public.user_is_admin_or_owner(auth.uid()));
CREATE POLICY "staff_update" ON public.staff FOR UPDATE TO authenticated
  USING (public.user_has_table_access('staff', restaurant_id))
  WITH CHECK (public.user_has_table_access('staff', restaurant_id));
CREATE POLICY "staff_delete" ON public.staff FOR DELETE TO authenticated
  USING (public.user_has_table_access('staff', restaurant_id) AND public.user_is_admin_or_owner(auth.uid()));

-- 5b. STAFF TIME CLOCK
DROP POLICY IF EXISTS "Franchise-aware staff_time_clock select" ON public.staff_time_clock;
DROP POLICY IF EXISTS "Franchise-aware staff_time_clock insert" ON public.staff_time_clock;
DROP POLICY IF EXISTS "Franchise-aware staff_time_clock update" ON public.staff_time_clock;

CREATE POLICY "staff_time_clock_select" ON public.staff_time_clock FOR SELECT TO authenticated
  USING (public.user_has_table_access('staff_time_clock', restaurant_id) OR public.is_platform_admin());
CREATE POLICY "staff_time_clock_insert" ON public.staff_time_clock FOR INSERT TO authenticated
  WITH CHECK (public.user_has_table_access('staff_time_clock', restaurant_id));
CREATE POLICY "staff_time_clock_update" ON public.staff_time_clock FOR UPDATE TO authenticated
  USING (public.user_has_table_access('staff_time_clock', restaurant_id))
  WITH CHECK (public.user_has_table_access('staff_time_clock', restaurant_id));

-- 5c. STAFF LEAVE REQUESTS
DROP POLICY IF EXISTS "Franchise-aware staff_leave_requests select" ON public.staff_leave_requests;
DROP POLICY IF EXISTS "Franchise-aware staff_leave_requests insert" ON public.staff_leave_requests;
DROP POLICY IF EXISTS "Franchise-aware staff_leave_requests update" ON public.staff_leave_requests;

CREATE POLICY "staff_leave_requests_select" ON public.staff_leave_requests FOR SELECT TO authenticated
  USING (public.user_has_table_access('staff_leave_requests', restaurant_id) OR public.is_platform_admin());
CREATE POLICY "staff_leave_requests_insert" ON public.staff_leave_requests FOR INSERT TO authenticated
  WITH CHECK (public.user_has_table_access('staff_leave_requests', restaurant_id));
CREATE POLICY "staff_leave_requests_update" ON public.staff_leave_requests FOR UPDATE TO authenticated
  USING (public.user_has_table_access('staff_leave_requests', restaurant_id))
  WITH CHECK (public.user_has_table_access('staff_leave_requests', restaurant_id));

-- 5d. STAFF LEAVES
DROP POLICY IF EXISTS "Franchise-aware staff_leaves select" ON public.staff_leaves;

CREATE POLICY "staff_leaves_select" ON public.staff_leaves FOR SELECT TO authenticated
  USING (public.user_has_table_access('staff_leaves', restaurant_id) OR public.is_platform_admin());

-- 5e. STAFF SHIFT ASSIGNMENTS
DROP POLICY IF EXISTS "Franchise-aware staff_shift_assignments select" ON public.staff_shift_assignments;
DROP POLICY IF EXISTS "Franchise-aware staff_shift_assignments insert" ON public.staff_shift_assignments;
DROP POLICY IF EXISTS "Franchise-aware staff_shift_assignments update" ON public.staff_shift_assignments;

CREATE POLICY "staff_shift_assignments_select" ON public.staff_shift_assignments FOR SELECT TO authenticated
  USING (public.user_has_table_access('staff_shift_assignments', restaurant_id) OR public.is_platform_admin());
CREATE POLICY "staff_shift_assignments_insert" ON public.staff_shift_assignments FOR INSERT TO authenticated
  WITH CHECK (public.user_has_table_access('staff_shift_assignments', restaurant_id));
CREATE POLICY "staff_shift_assignments_update" ON public.staff_shift_assignments FOR UPDATE TO authenticated
  USING (public.user_has_table_access('staff_shift_assignments', restaurant_id))
  WITH CHECK (public.user_has_table_access('staff_shift_assignments', restaurant_id));

-- 5f. SHIFTS
DROP POLICY IF EXISTS "Franchise-aware shifts select" ON public.shifts;
DROP POLICY IF EXISTS "Franchise-aware shifts insert" ON public.shifts;
DROP POLICY IF EXISTS "Franchise-aware shifts update" ON public.shifts;
DROP POLICY IF EXISTS "Franchise-aware shifts delete" ON public.shifts;

CREATE POLICY "shifts_select" ON public.shifts FOR SELECT TO authenticated
  USING (public.user_has_table_access('shifts', restaurant_id) OR public.is_platform_admin());
CREATE POLICY "shifts_insert" ON public.shifts FOR INSERT TO authenticated
  WITH CHECK (public.user_has_table_access('shifts', restaurant_id) AND public.user_is_admin_or_owner(auth.uid()));
CREATE POLICY "shifts_update" ON public.shifts FOR UPDATE TO authenticated
  USING (public.user_has_table_access('shifts', restaurant_id) AND public.user_is_admin_or_owner(auth.uid()))
  WITH CHECK (public.user_has_table_access('shifts', restaurant_id));
CREATE POLICY "shifts_delete" ON public.shifts FOR DELETE TO authenticated
  USING (public.user_has_table_access('shifts', restaurant_id) AND public.user_is_admin_or_owner(auth.uid()));

-- ============================================================================
-- 6. CATCH-ALL: Revert any remaining Franchise-aware policies
-- ============================================================================
DO $$
DECLARE
    pol RECORD;
    restored_tables TEXT[] := ARRAY[
      'profiles','orders','kitchen_orders','menu_items','expenses','invoices',
      'invoice_line_items','audit_logs','backup_settings','backups','batch_productions',
      'check_ins','customer_activities','customer_notes','daily_revenue_stats',
      'financial_reports','guest_feedback','guest_preferences','guest_profiles',
      'inventory_alerts','operational_costs','purchase_orders','purchase_order_items',
      'revenue_metrics','room_amenities','room_amenity_inventory','room_billings',
      'room_cleaning_schedules','room_food_orders','room_maintenance_requests',
      'sent_promotions','staff_shifts','supplier_orders','supplier_order_items',
      'table_reservations','waitlist','restaurant_settings','restaurant_operating_hours',
      'recipe_ingredients','payments','orders_unified','reservations','restaurant_tables',
      'rooms','promotion_campaigns','daily_summary_reports','staff','staff_time_clock',
      'staff_leave_requests','staff_leaves','staff_shift_assignments','shifts',
      'payment_settings','payment_methods','categories','pos_transactions','user_roles',
      'scheduled_report_settings','customers','loyalty_programs','loyalty_enrollments',
      'loyalty_transactions','whatsapp_templates','inventory_items','inventory_lots',
      'inventory_transactions','homemade_production_logs','homemade_production_log_items',
      'night_audit_logs','split_bills','split_bill_portions','shared_bills',
      'qr_codes','journal_entries','journal_entry_lines','budgets','budget_line_items',
      'monthly_budgets','chart_of_accounts','suppliers',
      'rate_plans','pricing_rules','competitor_pricing','booking_channels',
      'room_moves','room_waitlist','lost_found_items'
    ];
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND policyname LIKE 'Franchise-aware%'
        AND NOT (tablename = ANY(restored_tables))
    LOOP
        BEGIN
          EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
          RAISE NOTICE 'Catch-all dropped: % on %', pol.policyname, pol.tablename;
        EXCEPTION WHEN others THEN
          RAISE NOTICE 'Catch-all SKIP: %', SQLERRM;
        END;
    END LOOP;
END;
$$;

COMMIT;
