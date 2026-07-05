-- =============================================
-- MIGRATION: Safe Franchise Deletion Function
-- Description: PL/pgSQL function that cascades deletion across all
-- non-cascading FK tables before removing restaurants and organization.
-- Uses topological ordering to respect FK dependency graph.
-- =============================================

CREATE OR REPLACE FUNCTION delete_franchise_organization(p_org_id UUID)
RETURNS VOID AS $$
DECLARE
  v_restaurant_ids UUID[];
BEGIN
  -- 1. Get all restaurant IDs for this organization
  SELECT array_agg(id) INTO v_restaurant_ids
  FROM public.restaurants
  WHERE organization_id = p_org_id;

  IF v_restaurant_ids IS NOT NULL AND array_length(v_restaurant_ids, 1) > 0 THEN

    -- ============================================================
    -- LAYER 1: Third-level deps (leaf tables, deepest in graph)
    -- ============================================================
    -- inventory_transactions → inventory_lots (NO ACTION on lot_id)
    DELETE FROM public.inventory_transactions
      WHERE lot_id IN (SELECT id FROM public.inventory_lots WHERE restaurant_id = ANY(v_restaurant_ids));

    -- ============================================================
    -- LAYER 2: Second-level deps (reference other NO ACTION tables)
    -- ============================================================

    -- These reference customers (NO ACTION on customer_id):
    DELETE FROM public.customer_activities WHERE restaurant_id = ANY(v_restaurant_ids);
    DELETE FROM public.customer_notes WHERE restaurant_id = ANY(v_restaurant_ids);
    DELETE FROM public.loyalty_transactions WHERE restaurant_id = ANY(v_restaurant_ids);

    -- loyalty_redemptions refs orders, customers, AND loyalty_rewards (all NO ACTION)
    DELETE FROM public.loyalty_redemptions WHERE restaurant_id = ANY(v_restaurant_ids);

    -- kitchen_orders refs orders (NO ACTION on order_id)
    DELETE FROM public.kitchen_orders WHERE restaurant_id = ANY(v_restaurant_ids);

    -- These reference profiles (NO ACTION on found_by/performed_by/created_by):
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

    -- loyalty_rewards refs loyalty_tiers (NO ACTION on tier_id)
    DELETE FROM public.loyalty_rewards WHERE restaurant_id = ANY(v_restaurant_ids);

    -- ============================================================
    -- LAYER 3: First-level deps (directly ref restaurants, NO ACTION)
    -- ============================================================
    -- orders refs restaurant_tables (NO ACTION on table_id) — delete orders first
    DELETE FROM public.orders WHERE restaurant_id = ANY(v_restaurant_ids);

    -- Now safe to delete restaurant_tables
    DELETE FROM public.restaurant_tables WHERE restaurant_id = ANY(v_restaurant_ids);

    -- customers refs loyalty_tiers (NO ACTION on loyalty_tier_id) — delete customers first
    DELETE FROM public.customers WHERE restaurant_id = ANY(v_restaurant_ids);

    -- Now safe to delete loyalty tables
    DELETE FROM public.loyalty_tiers WHERE restaurant_id = ANY(v_restaurant_ids);
    DELETE FROM public.loyalty_programs WHERE restaurant_id = ANY(v_restaurant_ids);

    -- Remaining first-level NO ACTION tables (no children blocking them)
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

    -- ============================================================
    -- LAYER 4: Delete restaurants (auto-cascades ~40 CASCADE tables)
    -- ============================================================
    DELETE FROM public.restaurants WHERE id = ANY(v_restaurant_ids);
  END IF;

  -- 2. Clean up organization-level NO ACTION tables
  DELETE FROM public.menu_items WHERE organization_id = p_org_id;

  -- 3. Delete the organization (auto-cascades: organization_members,
  --    organization_subscriptions, approval_requests)
  DELETE FROM public.organizations WHERE id = p_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
