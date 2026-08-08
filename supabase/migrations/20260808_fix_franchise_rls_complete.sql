-- ==============================================================================
-- MIGRATION: Complete Franchise RLS Fix
-- Date: 2026-08-08
-- Description:
--   1. Fix get_user_accessible_restaurants() to respect accessible_branches
--   2. Fix profiles RLS for franchise admin cross-branch staff management
--   3. Fix all Pattern-1 tables so non-admin branch staff can access their data
--   4. Fix Pattern-2 granular tables (orders_unified, reservations, restaurant_tables)
--   5. Fix staff self-access tables for branch managers
-- ==============================================================================

BEGIN;

-- ============================================================================
-- 1. CORE FIX: get_user_accessible_restaurants — respect accessible_branches
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
  WHERE om.user_id = p_user_id
    AND (
      om.accessible_branches IS NULL
      OR r.id = ANY(om.accessible_branches)
    );

  IF v_result IS NOT NULL AND array_length(v_result, 1) > 0 THEN
    RETURN v_result;
  END IF;

  RETURN ARRAY[(SELECT restaurant_id FROM public.profiles WHERE id = p_user_id)];
END;
$$;

-- ============================================================================
-- 2. FIX PROFILES
-- ============================================================================
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "Franchise-aware profiles select" ON public.profiles;
DROP POLICY IF EXISTS "Franchise-aware profiles insert" ON public.profiles;
DROP POLICY IF EXISTS "Franchise-aware profiles delete" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  OR public.is_platform_admin()
);

CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated
WITH CHECK (
  id = auth.uid()
  OR (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) AND public.user_is_admin_or_owner(auth.uid()))
  OR public.is_platform_admin()
);

CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE TO authenticated
USING (
  (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) AND public.user_is_admin_or_owner(auth.uid()))
  OR public.is_platform_admin()
);

-- ============================================================================
-- 3. PATTERN-1 TABLES — direct franchise-aware ALL policies
-- ============================================================================

DO $$
DECLARE
  t TEXT;
  -- ONLY tables confirmed to have a direct restaurant_id column.
  -- Child/junction tables are handled individually below with JOIN-based EXISTS policies.
  -- Unknown/future tables: if they fail they are skipped safely (see WHEN others handler).
  tables TEXT[] := ARRAY[
    'orders','kitchen_orders','menu_items','expenses','invoices',
    'audit_logs','backup_settings','backups','batch_productions','check_ins',
    'customer_activities','customer_notes','daily_revenue_stats','financial_reports',
    'guest_feedback','guest_preferences','guest_profiles','inventory_alerts',
    'operational_costs','purchase_orders','revenue_metrics',
    'room_amenities','room_billings','room_cleaning_schedules',
    'room_food_orders','room_maintenance_requests','sent_promotions','staff_shifts',
    'supplier_orders','table_reservations','waitlist','restaurant_settings',
    'restaurant_operating_hours','payments',
    'homemade_production_logs','night_audit_logs','split_bills','shared_bills',
    'qr_codes','journal_entries','budgets','monthly_budgets','chart_of_accounts',
    'suppliers','rate_plans','pricing_rules','competitor_pricing','booking_channels',
    'inventory_lots','inventory_transactions','room_amenity_inventory',
    'room_moves','room_waitlist','lost_found_items'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Drop any old policy names (both naming conventions)
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Component-based ' || t || ' access', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Franchise-aware ' || t || ' access', t);
    -- Create fresh franchise-aware ALL policy
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated
         USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) OR public.is_platform_admin())
         WITH CHECK (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) OR public.is_platform_admin())',
        'Franchise-aware ' || t || ' access', t
      );
      RAISE NOTICE 'Updated: %', t;
    EXCEPTION
      WHEN undefined_table THEN
        RAISE NOTICE 'Skipped (table not found): %', t;
      WHEN undefined_column THEN
        -- Table exists but has no restaurant_id column — it is a child table.
        -- Add it to the JOIN-based section below instead.
        RAISE NOTICE 'Skipped (no restaurant_id column — child table): %', t;
      WHEN others THEN
        RAISE NOTICE 'Skipped (unexpected error on %): %', t, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- ============================================================================
-- 3b. CHILD TABLES — no restaurant_id column, use JOIN-based EXISTS policies
-- ============================================================================

-- invoice_line_items → joins through invoices
DROP POLICY IF EXISTS "invoice_line_items_policy" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Component-based invoice_line_items access" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Franchise-aware invoice_line_items access" ON public.invoice_line_items;
CREATE POLICY "Franchise-aware invoice_line_items access"
ON public.invoice_line_items FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_line_items.invoice_id
    AND i.restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  )
  OR public.is_platform_admin()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_line_items.invoice_id
    AND i.restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  )
  OR public.is_platform_admin()
);

-- budget_line_items → joins through budgets
DROP POLICY IF EXISTS "budget_line_items_policy" ON public.budget_line_items;
DROP POLICY IF EXISTS "Component-based budget_line_items access" ON public.budget_line_items;
DROP POLICY IF EXISTS "Franchise-aware budget_line_items access" ON public.budget_line_items;
CREATE POLICY "Franchise-aware budget_line_items access"
ON public.budget_line_items FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_line_items.budget_id
    AND b.restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  )
  OR public.is_platform_admin()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_line_items.budget_id
    AND b.restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  )
  OR public.is_platform_admin()
);

-- journal_entry_lines → joins through journal_entries
DROP POLICY IF EXISTS "journal_entry_lines_policy" ON public.journal_entry_lines;
DROP POLICY IF EXISTS "Component-based journal_entry_lines access" ON public.journal_entry_lines;
DROP POLICY IF EXISTS "Franchise-aware journal_entry_lines access" ON public.journal_entry_lines;
CREATE POLICY "Franchise-aware journal_entry_lines access"
ON public.journal_entry_lines FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_lines.journal_entry_id
    AND je.restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  )
  OR public.is_platform_admin()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_lines.journal_entry_id
    AND je.restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  )
  OR public.is_platform_admin()
);

-- purchase_order_items → joins through purchase_orders
DROP POLICY IF EXISTS "Component-based purchase_order_items access" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Franchise-aware purchase_order_items access" ON public.purchase_order_items;
CREATE POLICY "Franchise-aware purchase_order_items access"
ON public.purchase_order_items FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_items.purchase_order_id
    AND po.restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  )
  OR public.is_platform_admin()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_items.purchase_order_id
    AND po.restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  )
  OR public.is_platform_admin()
);

-- recipe_ingredients → check if it links via recipe_id or has restaurant_id
-- Based on schema: recipe_ingredients has no direct restaurant_id, links via recipe_id to recipes
DROP POLICY IF EXISTS "Component-based recipe_ingredients access" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "Franchise-aware recipe_ingredients access" ON public.recipe_ingredients;
DO $$
BEGIN
  -- Try direct restaurant_id first
  BEGIN
    EXECUTE 'CREATE POLICY "Franchise-aware recipe_ingredients access"
      ON public.recipe_ingredients FOR ALL TO authenticated
      USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) OR public.is_platform_admin())
      WITH CHECK (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) OR public.is_platform_admin())';
    RAISE NOTICE 'recipe_ingredients: used direct restaurant_id';
  EXCEPTION WHEN undefined_column THEN
    -- No restaurant_id, join through recipes table
    EXECUTE 'CREATE POLICY "Franchise-aware recipe_ingredients access"
      ON public.recipe_ingredients FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.recipes r
          WHERE r.id = recipe_ingredients.recipe_id
          AND r.restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
        )
        OR public.is_platform_admin()
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.recipes r
          WHERE r.id = recipe_ingredients.recipe_id
          AND r.restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
        )
        OR public.is_platform_admin()
      )';
    RAISE NOTICE 'recipe_ingredients: used JOIN through recipes';
  END;
END;
$$;

-- supplier_order_items → joins through supplier_orders
DROP POLICY IF EXISTS "Component-based supplier_order_items access" ON public.supplier_order_items;
DROP POLICY IF EXISTS "Franchise-aware supplier_order_items access" ON public.supplier_order_items;
CREATE POLICY "Franchise-aware supplier_order_items access"
ON public.supplier_order_items FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.supplier_orders so
    WHERE so.id = supplier_order_items.order_id
    AND so.restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  )
  OR public.is_platform_admin()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.supplier_orders so
    WHERE so.id = supplier_order_items.order_id
    AND so.restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  )
  OR public.is_platform_admin()
);

-- split_bill_portions → joins through split_bills
DROP POLICY IF EXISTS "Component-based split_bill_portions access" ON public.split_bill_portions;
DROP POLICY IF EXISTS "Franchise-aware split_bill_portions access" ON public.split_bill_portions;
CREATE POLICY "Franchise-aware split_bill_portions access"
ON public.split_bill_portions FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.split_bills sb
    WHERE sb.id = split_bill_portions.split_bill_id
    AND sb.restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  )
  OR public.is_platform_admin()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.split_bills sb
    WHERE sb.id = split_bill_portions.split_bill_id
    AND sb.restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  )
  OR public.is_platform_admin()
);

-- homemade_production_log_items → joins through homemade_production_logs
DROP POLICY IF EXISTS "Component-based homemade_production_log_items access" ON public.homemade_production_log_items;
DROP POLICY IF EXISTS "Franchise-aware homemade_production_log_items access" ON public.homemade_production_log_items;
CREATE POLICY "Franchise-aware homemade_production_log_items access"
ON public.homemade_production_log_items FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.homemade_production_logs hpl
    WHERE hpl.id = homemade_production_log_items.production_log_id
    AND hpl.restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  )
  OR public.is_platform_admin()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.homemade_production_logs hpl
    WHERE hpl.id = homemade_production_log_items.production_log_id
    AND hpl.restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  )
  OR public.is_platform_admin()
);

-- ============================================================================
-- 4. PATTERN-2 TABLES — granular SELECT/INSERT/UPDATE/DELETE
-- ============================================================================

-- 4a. ORDERS UNIFIED
DROP POLICY IF EXISTS "orders_unified_select" ON public.orders_unified;
DROP POLICY IF EXISTS "orders_unified_insert" ON public.orders_unified;
DROP POLICY IF EXISTS "orders_unified_update" ON public.orders_unified;
DROP POLICY IF EXISTS "orders_unified_delete" ON public.orders_unified;
DROP POLICY IF EXISTS "Franchise-aware orders_unified select" ON public.orders_unified;
DROP POLICY IF EXISTS "Franchise-aware orders_unified insert" ON public.orders_unified;
DROP POLICY IF EXISTS "Franchise-aware orders_unified update" ON public.orders_unified;
DROP POLICY IF EXISTS "Franchise-aware orders_unified delete" ON public.orders_unified;

CREATE POLICY "Franchise-aware orders_unified select" ON public.orders_unified FOR SELECT TO authenticated
  USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) OR public.is_platform_admin());
CREATE POLICY "Franchise-aware orders_unified insert" ON public.orders_unified FOR INSERT TO authenticated
  WITH CHECK (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())));
CREATE POLICY "Franchise-aware orders_unified update" ON public.orders_unified FOR UPDATE TO authenticated
  USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())))
  WITH CHECK (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())));
CREATE POLICY "Franchise-aware orders_unified delete" ON public.orders_unified FOR DELETE TO authenticated
  USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) AND public.user_is_admin_or_owner(auth.uid()));

-- 4b. RESERVATIONS
DROP POLICY IF EXISTS "reservations_select" ON public.reservations;
DROP POLICY IF EXISTS "reservations_insert" ON public.reservations;
DROP POLICY IF EXISTS "reservations_update" ON public.reservations;
DROP POLICY IF EXISTS "reservations_delete" ON public.reservations;
DROP POLICY IF EXISTS "Franchise-aware reservations select" ON public.reservations;
DROP POLICY IF EXISTS "Franchise-aware reservations insert" ON public.reservations;
DROP POLICY IF EXISTS "Franchise-aware reservations update" ON public.reservations;
DROP POLICY IF EXISTS "Franchise-aware reservations delete" ON public.reservations;

CREATE POLICY "Franchise-aware reservations select" ON public.reservations FOR SELECT TO authenticated
  USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) OR public.is_platform_admin());
CREATE POLICY "Franchise-aware reservations insert" ON public.reservations FOR INSERT TO authenticated
  WITH CHECK (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())));
CREATE POLICY "Franchise-aware reservations update" ON public.reservations FOR UPDATE TO authenticated
  USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())))
  WITH CHECK (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())));
CREATE POLICY "Franchise-aware reservations delete" ON public.reservations FOR DELETE TO authenticated
  USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())));

-- 4c. RESTAURANT TABLES
DROP POLICY IF EXISTS "restaurant_tables_select" ON public.restaurant_tables;
DROP POLICY IF EXISTS "restaurant_tables_insert" ON public.restaurant_tables;
DROP POLICY IF EXISTS "restaurant_tables_update" ON public.restaurant_tables;
DROP POLICY IF EXISTS "restaurant_tables_delete" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Franchise-aware restaurant_tables select" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Franchise-aware restaurant_tables insert" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Franchise-aware restaurant_tables update" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Franchise-aware restaurant_tables delete" ON public.restaurant_tables;

CREATE POLICY "Franchise-aware restaurant_tables select" ON public.restaurant_tables FOR SELECT TO authenticated
  USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) OR public.is_platform_admin());
CREATE POLICY "Franchise-aware restaurant_tables insert" ON public.restaurant_tables FOR INSERT TO authenticated
  WITH CHECK (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) AND public.user_is_admin_or_owner(auth.uid()));
CREATE POLICY "Franchise-aware restaurant_tables update" ON public.restaurant_tables FOR UPDATE TO authenticated
  USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) AND public.user_is_admin_or_owner(auth.uid()))
  WITH CHECK (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())));
CREATE POLICY "Franchise-aware restaurant_tables delete" ON public.restaurant_tables FOR DELETE TO authenticated
  USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) AND public.user_is_admin_or_owner(auth.uid()));

-- 4d. ROOMS
DROP POLICY IF EXISTS "rooms_select" ON public.rooms;
DROP POLICY IF EXISTS "rooms_insert" ON public.rooms;
DROP POLICY IF EXISTS "rooms_update" ON public.rooms;
DROP POLICY IF EXISTS "rooms_delete" ON public.rooms;
DROP POLICY IF EXISTS "Franchise-aware rooms select" ON public.rooms;
DROP POLICY IF EXISTS "Franchise-aware rooms insert" ON public.rooms;
DROP POLICY IF EXISTS "Franchise-aware rooms update" ON public.rooms;
DROP POLICY IF EXISTS "Franchise-aware rooms delete" ON public.rooms;

CREATE POLICY "Franchise-aware rooms select" ON public.rooms FOR SELECT TO authenticated
  USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) OR public.is_platform_admin());
CREATE POLICY "Franchise-aware rooms insert" ON public.rooms FOR INSERT TO authenticated
  WITH CHECK (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) AND public.user_is_admin_or_owner(auth.uid()));
CREATE POLICY "Franchise-aware rooms update" ON public.rooms FOR UPDATE TO authenticated
  USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())))
  WITH CHECK (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())));
CREATE POLICY "Franchise-aware rooms delete" ON public.rooms FOR DELETE TO authenticated
  USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) AND public.user_is_admin_or_owner(auth.uid()));

-- 4e. PROMOTION CAMPAIGNS
DROP POLICY IF EXISTS "promotion_campaigns_select" ON public.promotion_campaigns;
DROP POLICY IF EXISTS "promotion_campaigns_insert" ON public.promotion_campaigns;
DROP POLICY IF EXISTS "promotion_campaigns_update" ON public.promotion_campaigns;
DROP POLICY IF EXISTS "promotion_campaigns_delete" ON public.promotion_campaigns;
DROP POLICY IF EXISTS "Franchise-aware promotion_campaigns select" ON public.promotion_campaigns;
DROP POLICY IF EXISTS "Franchise-aware promotion_campaigns insert" ON public.promotion_campaigns;
DROP POLICY IF EXISTS "Franchise-aware promotion_campaigns update" ON public.promotion_campaigns;
DROP POLICY IF EXISTS "Franchise-aware promotion_campaigns delete" ON public.promotion_campaigns;

CREATE POLICY "Franchise-aware promotion_campaigns select" ON public.promotion_campaigns FOR SELECT TO authenticated
  USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) OR public.is_platform_admin());
CREATE POLICY "Franchise-aware promotion_campaigns insert" ON public.promotion_campaigns FOR INSERT TO authenticated
  WITH CHECK (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) AND public.user_is_admin_or_owner(auth.uid()));
CREATE POLICY "Franchise-aware promotion_campaigns update" ON public.promotion_campaigns FOR UPDATE TO authenticated
  USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) AND public.user_is_admin_or_owner(auth.uid()))
  WITH CHECK (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())));
CREATE POLICY "Franchise-aware promotion_campaigns delete" ON public.promotion_campaigns FOR DELETE TO authenticated
  USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) AND public.user_is_admin_or_owner(auth.uid()));

-- 4f. DAILY SUMMARY REPORTS
DROP POLICY IF EXISTS "daily_summary_reports_select" ON public.daily_summary_reports;
DROP POLICY IF EXISTS "daily_summary_reports_insert" ON public.daily_summary_reports;
DROP POLICY IF EXISTS "daily_summary_reports_update" ON public.daily_summary_reports;
DROP POLICY IF EXISTS "Franchise-aware daily_summary_reports select" ON public.daily_summary_reports;
DROP POLICY IF EXISTS "Franchise-aware daily_summary_reports insert" ON public.daily_summary_reports;
DROP POLICY IF EXISTS "Franchise-aware daily_summary_reports update" ON public.daily_summary_reports;

CREATE POLICY "Franchise-aware daily_summary_reports select" ON public.daily_summary_reports FOR SELECT TO authenticated
  USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) OR public.is_platform_admin());
CREATE POLICY "Franchise-aware daily_summary_reports insert" ON public.daily_summary_reports FOR INSERT TO authenticated
  WITH CHECK (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())));
CREATE POLICY "Franchise-aware daily_summary_reports update" ON public.daily_summary_reports FOR UPDATE TO authenticated
  USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())))
  WITH CHECK (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())));

-- ============================================================================
-- 5. STAFF TABLES — Pattern 6: self-access + branch access
-- ============================================================================

-- 5a. STAFF
DROP POLICY IF EXISTS "staff_select" ON public.staff;
DROP POLICY IF EXISTS "staff_insert" ON public.staff;
DROP POLICY IF EXISTS "staff_update" ON public.staff;
DROP POLICY IF EXISTS "staff_delete" ON public.staff;
DROP POLICY IF EXISTS "Franchise-aware staff select" ON public.staff;
DROP POLICY IF EXISTS "Franchise-aware staff insert" ON public.staff;
DROP POLICY IF EXISTS "Franchise-aware staff update" ON public.staff;
DROP POLICY IF EXISTS "Franchise-aware staff delete" ON public.staff;

CREATE POLICY "Franchise-aware staff select" ON public.staff FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) OR public.is_platform_admin());
CREATE POLICY "Franchise-aware staff insert" ON public.staff FOR INSERT TO authenticated
  WITH CHECK (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) AND public.user_is_admin_or_owner(auth.uid()));
CREATE POLICY "Franchise-aware staff update" ON public.staff FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) AND public.user_is_admin_or_owner(auth.uid())))
  WITH CHECK (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())));
CREATE POLICY "Franchise-aware staff delete" ON public.staff FOR DELETE TO authenticated
  USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) AND public.user_is_admin_or_owner(auth.uid()));

-- 5b. STAFF TIME CLOCK
DROP POLICY IF EXISTS "staff_time_clock_select" ON public.staff_time_clock;
DROP POLICY IF EXISTS "staff_time_clock_insert" ON public.staff_time_clock;
DROP POLICY IF EXISTS "staff_time_clock_update" ON public.staff_time_clock;
DROP POLICY IF EXISTS "Franchise-aware staff_time_clock select" ON public.staff_time_clock;
DROP POLICY IF EXISTS "Franchise-aware staff_time_clock insert" ON public.staff_time_clock;
DROP POLICY IF EXISTS "Franchise-aware staff_time_clock update" ON public.staff_time_clock;

CREATE POLICY "Franchise-aware staff_time_clock select" ON public.staff_time_clock FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) OR public.is_platform_admin());
CREATE POLICY "Franchise-aware staff_time_clock insert" ON public.staff_time_clock FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) AND public.user_is_admin_or_owner(auth.uid())));
CREATE POLICY "Franchise-aware staff_time_clock update" ON public.staff_time_clock FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) AND public.user_is_admin_or_owner(auth.uid())))
  WITH CHECK (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())));

-- 5c. STAFF LEAVE REQUESTS
DROP POLICY IF EXISTS "staff_leave_requests_select" ON public.staff_leave_requests;
DROP POLICY IF EXISTS "staff_leave_requests_insert" ON public.staff_leave_requests;
DROP POLICY IF EXISTS "staff_leave_requests_update" ON public.staff_leave_requests;
DROP POLICY IF EXISTS "Franchise-aware staff_leave_requests select" ON public.staff_leave_requests;
DROP POLICY IF EXISTS "Franchise-aware staff_leave_requests insert" ON public.staff_leave_requests;
DROP POLICY IF EXISTS "Franchise-aware staff_leave_requests update" ON public.staff_leave_requests;

CREATE POLICY "Franchise-aware staff_leave_requests select" ON public.staff_leave_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) OR public.is_platform_admin());
CREATE POLICY "Franchise-aware staff_leave_requests insert" ON public.staff_leave_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) AND public.user_is_admin_or_owner(auth.uid())));
CREATE POLICY "Franchise-aware staff_leave_requests update" ON public.staff_leave_requests FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) AND public.user_is_admin_or_owner(auth.uid())))
  WITH CHECK (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())));

-- 5d. STAFF LEAVES
DROP POLICY IF EXISTS "staff_leaves_select" ON public.staff_leaves;
DROP POLICY IF EXISTS "Franchise-aware staff_leaves select" ON public.staff_leaves;

CREATE POLICY "Franchise-aware staff_leaves select" ON public.staff_leaves FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) OR public.is_platform_admin());

-- 5e. STAFF SHIFT ASSIGNMENTS
DROP POLICY IF EXISTS "staff_shift_assignments_select" ON public.staff_shift_assignments;
DROP POLICY IF EXISTS "staff_shift_assignments_insert" ON public.staff_shift_assignments;
DROP POLICY IF EXISTS "staff_shift_assignments_update" ON public.staff_shift_assignments;
DROP POLICY IF EXISTS "Franchise-aware staff_shift_assignments select" ON public.staff_shift_assignments;
DROP POLICY IF EXISTS "Franchise-aware staff_shift_assignments insert" ON public.staff_shift_assignments;
DROP POLICY IF EXISTS "Franchise-aware staff_shift_assignments update" ON public.staff_shift_assignments;

CREATE POLICY "Franchise-aware staff_shift_assignments select" ON public.staff_shift_assignments FOR SELECT TO authenticated
  USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) OR public.is_platform_admin());
CREATE POLICY "Franchise-aware staff_shift_assignments insert" ON public.staff_shift_assignments FOR INSERT TO authenticated
  WITH CHECK (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())));
CREATE POLICY "Franchise-aware staff_shift_assignments update" ON public.staff_shift_assignments FOR UPDATE TO authenticated
  USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())))
  WITH CHECK (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())));

-- 5f. SHIFTS
DROP POLICY IF EXISTS "shifts_select" ON public.shifts;
DROP POLICY IF EXISTS "shifts_insert" ON public.shifts;
DROP POLICY IF EXISTS "shifts_update" ON public.shifts;
DROP POLICY IF EXISTS "shifts_delete" ON public.shifts;
DROP POLICY IF EXISTS "Franchise-aware shifts select" ON public.shifts;
DROP POLICY IF EXISTS "Franchise-aware shifts insert" ON public.shifts;
DROP POLICY IF EXISTS "Franchise-aware shifts update" ON public.shifts;
DROP POLICY IF EXISTS "Franchise-aware shifts delete" ON public.shifts;

CREATE POLICY "Franchise-aware shifts select" ON public.shifts FOR SELECT TO authenticated
  USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) OR public.is_platform_admin());
CREATE POLICY "Franchise-aware shifts insert" ON public.shifts FOR INSERT TO authenticated
  WITH CHECK (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) AND public.user_is_admin_or_owner(auth.uid()));
CREATE POLICY "Franchise-aware shifts update" ON public.shifts FOR UPDATE TO authenticated
  USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) AND public.user_is_admin_or_owner(auth.uid()))
  WITH CHECK (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())));
CREATE POLICY "Franchise-aware shifts delete" ON public.shifts FOR DELETE TO authenticated
  USING (restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) AND public.user_is_admin_or_owner(auth.uid()));

-- ============================================================================
-- 6. CATCH-ALL: Remaining get_user_restaurant_id() policies (dynamic upgrade)
-- ============================================================================
DO $$
DECLARE
    pol RECORD;
    new_qual TEXT;
    new_with_check TEXT;
    drop_stmt TEXT;
    create_stmt TEXT;
    handled_tables TEXT[] := ARRAY[
      'profiles','orders','kitchen_orders','menu_items','expenses','invoices',
      'invoice_line_items','audit_logs','backup_settings','backups','batch_productions',
      'check_ins','customer_activities','customer_notes','daily_revenue_stats',
      'financial_reports','guest_feedback','guest_preferences','guest_profiles',
      'inventory_alerts','operational_costs','purchase_orders','purchase_order_items',
      'revenue_metrics','room_amenities','room_amenity_inventory','room_billings',
      'room_cleaning_schedules','room_food_orders','room_maintenance_requests',
      'sent_promotions','staff_shifts','supplier_orders','table_reservations',
      'waitlist','restaurant_settings','restaurant_operating_hours','recipe_ingredients',
      'payments','orders_unified','reservations','restaurant_tables','rooms',
      'promotion_campaigns','daily_summary_reports','staff','staff_time_clock',
      'staff_leave_requests','staff_leaves','staff_shift_assignments','shifts',
      'payment_settings','payment_methods','categories','pos_transactions','user_roles',
      'scheduled_report_settings','customers','loyalty_programs','loyalty_enrollments',
      'loyalty_transactions','whatsapp_templates','inventory_items','inventory_lots',
      'inventory_transactions','homemade_production_logs','homemade_production_log_items',
      'night_audit_logs','split_bills','split_bill_portions','shared_bills',
      'qr_codes','journal_entries','journal_entry_lines','budgets','budget_line_items',
      'monthly_budgets','chart_of_accounts','supplier_order_items','suppliers',
      'rate_plans','pricing_rules','competitor_pricing','booking_channels'
    ];
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'public'
        AND (qual LIKE '%get_user_restaurant_id%' OR with_check LIKE '%get_user_restaurant_id%')
        AND NOT (tablename = ANY(handled_tables))
    LOOP
        new_qual := REPLACE(REPLACE(pol.qual,
            'restaurant_id = public.get_user_restaurant_id()',
            'restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))'),
            'restaurant_id = public.get_user_restaurant_id(auth.uid())',
            'restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))');

        IF pol.with_check IS NOT NULL THEN
            new_with_check := REPLACE(REPLACE(pol.with_check,
                'restaurant_id = public.get_user_restaurant_id()',
                'restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))'),
                'restaurant_id = public.get_user_restaurant_id(auth.uid())',
                'restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))');
        ELSE
            new_with_check := NULL;
        END IF;

        IF new_qual = pol.qual AND (pol.with_check IS NULL OR new_with_check = pol.with_check) THEN
            CONTINUE;
        END IF;

        drop_stmt := format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
        EXECUTE drop_stmt;

        IF pol.cmd = 'ALL' THEN
            create_stmt := format('CREATE POLICY %I ON %I.%I FOR %s TO %s USING (%s) WITH CHECK (%s);',
                'Franchise-aware ' || pol.policyname, pol.schemaname, pol.tablename,
                pol.cmd, array_to_string(pol.roles, ', '), new_qual, COALESCE(new_with_check, new_qual));
        ELSIF pol.cmd IN ('SELECT', 'DELETE') THEN
            create_stmt := format('CREATE POLICY %I ON %I.%I FOR %s TO %s USING (%s);',
                'Franchise-aware ' || pol.policyname, pol.schemaname, pol.tablename,
                pol.cmd, array_to_string(pol.roles, ', '), new_qual);
        ELSIF pol.cmd = 'INSERT' THEN
            create_stmt := format('CREATE POLICY %I ON %I.%I FOR %s TO %s WITH CHECK (%s);',
                'Franchise-aware ' || pol.policyname, pol.schemaname, pol.tablename,
                pol.cmd, array_to_string(pol.roles, ', '), new_with_check);
        ELSIF pol.cmd = 'UPDATE' THEN
            create_stmt := format('CREATE POLICY %I ON %I.%I FOR %s TO %s USING (%s) WITH CHECK (%s);',
                'Franchise-aware ' || pol.policyname, pol.schemaname, pol.tablename,
                pol.cmd, array_to_string(pol.roles, ', '), new_qual, COALESCE(new_with_check, new_qual));
        END IF;

        EXECUTE create_stmt;
        RAISE NOTICE 'Catch-all upgraded: % on %', pol.policyname, pol.tablename;
    END LOOP;
END;
$$;

-- ============================================================================
-- VERIFICATION (run after commit to confirm):
-- SELECT tablename, policyname FROM pg_policies
-- WHERE schemaname = 'public' AND qual LIKE '%get_user_restaurant_id%'
-- AND tablename != 'profiles';
-- → Should return 0 rows
-- ============================================================================

COMMIT;
