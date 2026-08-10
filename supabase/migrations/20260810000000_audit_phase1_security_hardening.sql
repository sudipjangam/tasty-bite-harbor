-- =============================================
-- MIGRATION: Phase 1 Security Hardening (Audit Remediation)
-- Date: 2026-08-10
-- Impact: Zero user-visible change. All fixes enforce what frontend already does.
--
-- Fixes:
--   1. delete_franchise_organization → add is_platform_admin() + search_path
--   2. create_franchise_organization → add is_platform_admin() + search_path
--   3. get_org_customers → add org membership check + search_path
--   4. add_loyalty_transaction → add auth.uid() check (dead RPC but still callable)
--   5. adjust_wallet_balance → revoke authenticated grant (edge functions use service_role)
--   6. Batch fix search_path on all SECURITY DEFINER functions missing it
-- =============================================

BEGIN;

-- ============================================================
-- FIX 1: delete_franchise_organization
-- Add is_platform_admin() guard + SET search_path
-- Only callable from /platform/franchise-admin (AdminRoleGuard)
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_franchise_organization(p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_restaurant_ids UUID[];
BEGIN
  -- AUTH: Only platform admins can delete franchises
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized: platform admin required';
  END IF;

  -- 1. Get all restaurant IDs for this organization
  SELECT array_agg(id) INTO v_restaurant_ids
  FROM public.restaurants
  WHERE organization_id = p_org_id;

  IF v_restaurant_ids IS NOT NULL AND array_length(v_restaurant_ids, 1) > 0 THEN

    -- LAYER 1: Third-level deps (leaf tables, deepest in graph)
    DELETE FROM public.inventory_transactions
      WHERE lot_id IN (SELECT id FROM public.inventory_lots WHERE restaurant_id = ANY(v_restaurant_ids));

    -- LAYER 2: Second-level deps
    DELETE FROM public.customer_activities WHERE restaurant_id = ANY(v_restaurant_ids);
    DELETE FROM public.customer_notes WHERE restaurant_id = ANY(v_restaurant_ids);
    DELETE FROM public.loyalty_transactions WHERE restaurant_id = ANY(v_restaurant_ids);
    DELETE FROM public.loyalty_redemptions WHERE restaurant_id = ANY(v_restaurant_ids);
    DELETE FROM public.kitchen_orders WHERE restaurant_id = ANY(v_restaurant_ids);
    DELETE FROM public.lost_found_items
      WHERE found_by IN (SELECT id FROM public.profiles WHERE restaurant_id = ANY(v_restaurant_ids));
    DELETE FROM public.night_audit_logs
      WHERE performed_by IN (SELECT id FROM public.profiles WHERE restaurant_id = ANY(v_restaurant_ids));
    DELETE FROM public.room_moves
      WHERE performed_by IN (SELECT id FROM public.profiles WHERE restaurant_id = ANY(v_restaurant_ids));
    DELETE FROM public.split_bills
      WHERE created_by IN (SELECT id FROM public.profiles WHERE restaurant_id = ANY(v_restaurant_ids));
    DELETE FROM public.staff_shift_assignments
      WHERE created_by IN (SELECT id FROM public.profiles WHERE restaurant_id = ANY(v_restaurant_ids));
    DELETE FROM public.staff_time_clock
      WHERE override_by IN (SELECT id FROM public.profiles WHERE restaurant_id = ANY(v_restaurant_ids));
    DELETE FROM public.loyalty_enrollments
      WHERE approved_by IN (SELECT id FROM public.profiles WHERE restaurant_id = ANY(v_restaurant_ids));
    DELETE FROM public.loyalty_rewards WHERE restaurant_id = ANY(v_restaurant_ids);

    -- LAYER 3: First-level deps
    DELETE FROM public.orders WHERE restaurant_id = ANY(v_restaurant_ids);
    DELETE FROM public.restaurant_tables WHERE restaurant_id = ANY(v_restaurant_ids);
    DELETE FROM public.customers WHERE restaurant_id = ANY(v_restaurant_ids);
    DELETE FROM public.loyalty_tiers WHERE restaurant_id = ANY(v_restaurant_ids);
    DELETE FROM public.loyalty_programs WHERE restaurant_id = ANY(v_restaurant_ids);
    DELETE FROM public.profiles WHERE restaurant_id = ANY(v_restaurant_ids);
    DELETE FROM public.categories WHERE restaurant_id = ANY(v_restaurant_ids);
    DELETE FROM public.daily_revenue_stats WHERE restaurant_id = ANY(v_restaurant_ids);
    DELETE FROM public.guest_feedback WHERE restaurant_id = ANY(v_restaurant_ids);
    DELETE FROM public.guest_preferences WHERE restaurant_id = ANY(v_restaurant_ids);
    DELETE FROM public.inventory_lots WHERE restaurant_id = ANY(v_restaurant_ids);
    DELETE FROM public.menu_item_variants WHERE restaurant_id = ANY(v_restaurant_ids);
    DELETE FROM public.room_amenities WHERE restaurant_id = ANY(v_restaurant_ids);
    DELETE FROM public.room_amenity_inventory WHERE restaurant_id = ANY(v_restaurant_ids);
    DELETE FROM public.room_billings WHERE restaurant_id = ANY(v_restaurant_ids);
    DELETE FROM public.room_cleaning_schedules WHERE restaurant_id = ANY(v_restaurant_ids);
    DELETE FROM public.room_food_orders WHERE restaurant_id = ANY(v_restaurant_ids);
    DELETE FROM public.room_maintenance_requests WHERE restaurant_id = ANY(v_restaurant_ids);
    DELETE FROM public.whatsapp_campaign_sends WHERE restaurant_id = ANY(v_restaurant_ids);
    DELETE FROM public.whatsapp_templates WHERE restaurant_id = ANY(v_restaurant_ids);

    -- LAYER 4: Delete restaurants (auto-cascades ~40 CASCADE tables)
    DELETE FROM public.restaurants WHERE id = ANY(v_restaurant_ids);
  END IF;

  -- 2. Clean up organization-level NO ACTION tables
  DELETE FROM public.menu_items WHERE organization_id = p_org_id;

  -- 3. Delete the organization (auto-cascades: organization_members,
  --    organization_subscriptions, approval_requests)
  DELETE FROM public.organizations WHERE id = p_org_id;
END;
$$;


-- ============================================================
-- FIX 2: create_franchise_organization
-- Add is_platform_admin() guard + SET search_path
-- Only callable from /platform/franchise-admin (AdminRoleGuard)
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_franchise_organization(
  p_org_name TEXT,
  p_org_type TEXT DEFAULT 'franchise',
  p_menu_mode TEXT DEFAULT 'independent',
  p_hq_name TEXT DEFAULT NULL,
  p_hq_branch_code TEXT DEFAULT 'HQ',
  p_plan_type TEXT DEFAULT 'starter',
  p_max_branches INTEGER DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_org_id UUID;
  v_restaurant_id UUID;
  v_sub_id UUID;
BEGIN
  -- AUTH: Only platform admins can create franchises
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized: platform admin required';
  END IF;

  -- Create organization
  INSERT INTO public.organizations (name, type, menu_mode)
  VALUES (p_org_name, p_org_type, p_menu_mode)
  RETURNING id INTO v_org_id;

  -- Create HQ restaurant
  INSERT INTO public.restaurants (name, organization_id, branch_code, is_headquarters)
  VALUES (COALESCE(p_hq_name, p_org_name || ' HQ'), v_org_id, p_hq_branch_code, true)
  RETURNING id INTO v_restaurant_id;

  -- Create subscription
  INSERT INTO public.organization_subscriptions (organization_id, plan_type, max_branches)
  VALUES (v_org_id, p_plan_type, p_max_branches)
  RETURNING id INTO v_sub_id;

  RETURN jsonb_build_object(
    'organization_id', v_org_id,
    'restaurant_id', v_restaurant_id,
    'subscription_id', v_sub_id
  );
END;
$$;


-- ============================================================
-- FIX 3: get_org_customers
-- Add org membership check + SET search_path
-- Called from FranchiseContext.tsx (already has try/catch fallback)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_org_customers(p_org_id UUID)
RETURNS TABLE (
  customer_id    UUID,
  name           TEXT,
  phone          TEXT,
  total_spent    NUMERIC,
  visit_count    INTEGER,
  loyalty_points INTEGER,
  branches_visited TEXT[]
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  -- AUTH: Caller must be authenticated and be a member of this organization
  -- (check via a CTE that raises no exception but returns empty if unauthorized)
  WITH auth_check AS (
    SELECT 1
    WHERE auth.uid() IS NOT NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.organization_members
          WHERE organization_id = p_org_id AND user_id = auth.uid()
        )
        OR public.is_platform_admin()
      )
  )
  SELECT
    c.id                                                AS customer_id,
    c.name,
    c.phone,
    COALESCE(c.total_spent, 0)                         AS total_spent,
    COALESCE(c.visit_count, 0)                         AS visit_count,
    COALESCE(c.loyalty_points, 0)                      AS loyalty_points,
    ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) AS branches_visited
  FROM auth_check
  CROSS JOIN public.customers c
  LEFT JOIN public.orders o   ON o.customer_name = c.name AND o.restaurant_id = c.restaurant_id
  LEFT JOIN public.restaurants r ON r.id = o.restaurant_id
  WHERE c.organization_id = p_org_id
  GROUP BY c.id, c.name, c.phone, c.total_spent, c.visit_count, c.loyalty_points
  ORDER BY c.total_spent DESC NULLS LAST;
$$;


-- ============================================================
-- FIX 4: add_loyalty_transaction
-- Add auth.uid() check + restaurant ownership verification
-- Not directly called from frontend, but callable via API
-- ============================================================
CREATE OR REPLACE FUNCTION public.add_loyalty_transaction(
  customer_id_param uuid,
  restaurant_id_param uuid,
  transaction_type_param text,
  points_param integer,
  source_param text,
  notes_param text,
  created_by_param uuid
)
RETURNS SETOF loyalty_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- AUTH: Must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- AUTH: Must have access to this restaurant
  IF NOT public.user_has_table_access('loyalty_transactions', restaurant_id_param) THEN
    RAISE EXCEPTION 'Access denied: no permission for this restaurant';
  END IF;

  RETURN QUERY
  INSERT INTO public.loyalty_transactions (
    customer_id,
    restaurant_id,
    transaction_type,
    points,
    source,
    notes,
    created_by
  )
  VALUES (
    customer_id_param,
    restaurant_id_param,
    transaction_type_param,
    points_param,
    source_param,
    notes_param,
    created_by_param
  )
  RETURNING *;
END;
$$;


-- ============================================================
-- FIX 5: adjust_wallet_balance
-- Revoke authenticated grant — only edge functions (service_role) use this
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.adjust_wallet_balance FROM authenticated;


-- ============================================================
-- FIX 6: Batch search_path fix
-- ALTER FUNCTION is non-destructive — just sets the attribute
-- without replacing the function body
-- ============================================================

DO $$
DECLARE 
    fn_record RECORD;
BEGIN 
    FOR fn_record IN 
        SELECT p.oid::regprocedure AS fn_sig
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
          AND p.prosecdef = true
    LOOP
        EXECUTE 'ALTER FUNCTION ' || fn_record.fn_sig || ' SET search_path = public';
    END LOOP;
END $$;

COMMIT;
