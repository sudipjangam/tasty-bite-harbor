-- ============================================================================
-- Migration: Franchise Branch Management & Menu/Recipe Cloning
-- Description:
--   1. Strengthen is_platform_admin() to support role_name_text & admin users
--   2. Update create_franchise_branch() to check direct org owner + platform admin
--   3. Create delete_franchise_branch() for safe cascading branch deletion
--   4. Create clone_branch_menu_and_recipes() to import categories, items, variants,
--      inventory items, recipes & recipe ingredients from an existing branch
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. STRENGTHEN is_platform_admin()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (auth.jwt() ->> 'role') = 'service_role' THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'::user_role
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. UPDATE create_franchise_branch()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_franchise_branch(
  p_organization_id UUID,
  p_name TEXT,
  p_branch_code TEXT,
  p_address TEXT DEFAULT '',
  p_phone TEXT DEFAULT '',
  p_email TEXT DEFAULT '',
  p_manager TEXT DEFAULT '',
  p_manager_phone TEXT DEFAULT '',
  p_color TEXT DEFAULT '#3b82f6',
  p_is_headquarters BOOLEAN DEFAULT false,
  p_rating NUMERIC DEFAULT 5.0,
  p_total_reviews INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_is_platform_admin BOOLEAN;
  v_is_org_admin BOOLEAN;
  v_max_branches INTEGER := 999;
  v_current_branches INTEGER := 0;
  v_new_restaurant_id UUID;
  v_result JSONB;
BEGIN
  v_caller_id := auth.uid();

  -- Verify permissions
  v_is_platform_admin := public.is_platform_admin();

  SELECT (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = p_organization_id
      AND user_id = v_caller_id
      AND role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.organizations
      WHERE id = p_organization_id
      AND owner_user_id = v_caller_id
    )
  ) INTO v_is_org_admin;

  IF NOT (v_is_platform_admin OR v_is_org_admin) THEN
    RAISE EXCEPTION 'Insufficient permissions to create a branch for this organization';
  END IF;

  -- Check max branch limits from organization_subscriptions
  SELECT max_branches INTO v_max_branches
  FROM public.organization_subscriptions
  WHERE organization_id = p_organization_id;

  IF v_max_branches IS NOT NULL AND v_max_branches > 0 THEN
    SELECT COUNT(*) INTO v_current_branches
    FROM public.restaurants
    WHERE organization_id = p_organization_id;

    IF v_current_branches >= v_max_branches THEN
      RAISE EXCEPTION 'Branch limit reached for current organization subscription plan (% max)', v_max_branches;
    END IF;
  END IF;

  -- Insert the new branch
  INSERT INTO public.restaurants (
    organization_id,
    name,
    branch_code,
    address,
    phone,
    email,
    owner_name,
    owner_phone,
    is_headquarters,
    social_media,
    rating,
    total_reviews,
    is_active
  ) VALUES (
    p_organization_id,
    p_name,
    p_branch_code,
    p_address,
    p_phone,
    p_email,
    p_manager,
    p_manager_phone,
    COALESCE(p_is_headquarters, false),
    jsonb_build_object('theme_color', COALESCE(p_color, '#3b82f6')),
    COALESCE(p_rating, 5.0),
    COALESCE(p_total_reviews, 0),
    true
  )
  RETURNING id INTO v_new_restaurant_id;

  -- Explicitly ensure roles are seeded
  PERFORM public.seed_system_roles(v_new_restaurant_id);

  v_result := jsonb_build_object(
    'success', true,
    'restaurant_id', v_new_restaurant_id,
    'organization_id', p_organization_id,
    'name', p_name,
    'branch_code', p_branch_code
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_franchise_branch TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3. CREATE delete_franchise_branch()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_franchise_branch(p_branch_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_org_id UUID;
  v_is_platform_admin BOOLEAN;
  v_is_org_admin BOOLEAN;
  v_branch_name TEXT;
  v_is_hq BOOLEAN;
  v_remaining_count INTEGER;
BEGIN
  v_caller_id := auth.uid();
  v_is_platform_admin := public.is_platform_admin();

  -- 1. Find the branch and organization
  SELECT organization_id, name, is_headquarters
  INTO v_org_id, v_branch_name, v_is_hq
  FROM public.restaurants
  WHERE id = p_branch_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Branch not found';
  END IF;

  -- 2. Check permissions
  IF v_org_id IS NOT NULL THEN
    SELECT (
      EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = v_org_id
        AND user_id = v_caller_id
        AND role IN ('owner', 'admin')
      )
      OR EXISTS (
        SELECT 1 FROM public.organizations
        WHERE id = v_org_id
        AND owner_user_id = v_caller_id
      )
    ) INTO v_is_org_admin;
  ELSE
    v_is_org_admin := FALSE;
  END IF;

  IF NOT (v_is_platform_admin OR v_is_org_admin) THEN
    RAISE EXCEPTION 'Insufficient permissions to delete this branch';
  END IF;

  -- 3. If this branch is headquarters, check if there are other branches in the org
  IF v_org_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_remaining_count
    FROM public.restaurants
    WHERE organization_id = v_org_id AND id != p_branch_id;

    IF v_remaining_count > 0 AND v_is_hq THEN
      -- Promote the oldest remaining branch as headquarters
      UPDATE public.restaurants
      SET is_headquarters = true
      WHERE id = (
        SELECT id FROM public.restaurants
        WHERE organization_id = v_org_id AND id != p_branch_id
        ORDER BY created_at ASC
        LIMIT 1
      );
    END IF;
  END IF;

  -- 4. Topological deletion of non-cascading foreign keys
  -- Layer 1: Leaf tables
  DELETE FROM public.inventory_transactions
  WHERE restaurant_id = p_branch_id
     OR lot_id IN (SELECT id FROM public.inventory_lots WHERE restaurant_id = p_branch_id);

  -- Layer 2: Second-level deps
  DELETE FROM public.customer_activities WHERE restaurant_id = p_branch_id;
  DELETE FROM public.customer_notes WHERE restaurant_id = p_branch_id;
  DELETE FROM public.loyalty_transactions WHERE restaurant_id = p_branch_id;
  DELETE FROM public.loyalty_redemptions WHERE restaurant_id = p_branch_id;
  DELETE FROM public.kitchen_orders WHERE restaurant_id = p_branch_id;

  -- Profiles references
  DELETE FROM public.lost_found_items
    WHERE found_by IN (SELECT id FROM public.profiles WHERE restaurant_id = p_branch_id);
  DELETE FROM public.night_audit_logs
    WHERE performed_by IN (SELECT id FROM public.profiles WHERE restaurant_id = p_branch_id);
  DELETE FROM public.room_moves
    WHERE performed_by IN (SELECT id FROM public.profiles WHERE restaurant_id = p_branch_id);
  DELETE FROM public.split_bills
    WHERE created_by IN (SELECT id FROM public.profiles WHERE restaurant_id = p_branch_id);
  DELETE FROM public.staff_shift_assignments
    WHERE created_by IN (SELECT id FROM public.profiles WHERE restaurant_id = p_branch_id);
  DELETE FROM public.staff_time_clock
    WHERE override_by IN (SELECT id FROM public.profiles WHERE restaurant_id = p_branch_id);
  DELETE FROM public.loyalty_enrollments
    WHERE approved_by IN (SELECT id FROM public.profiles WHERE restaurant_id = p_branch_id);

  DELETE FROM public.loyalty_rewards WHERE restaurant_id = p_branch_id;

  -- Layer 3: First-level deps
  DELETE FROM public.pos_transactions WHERE restaurant_id = p_branch_id;
  DELETE FROM public.orders WHERE restaurant_id = p_branch_id;
  DELETE FROM public.restaurant_tables WHERE restaurant_id = p_branch_id;
  DELETE FROM public.customers WHERE restaurant_id = p_branch_id;
  DELETE FROM public.loyalty_tiers WHERE restaurant_id = p_branch_id;
  DELETE FROM public.loyalty_programs WHERE restaurant_id = p_branch_id;

  -- Recipe & menu dependencies
  DELETE FROM public.recipe_ingredients
  WHERE recipe_id IN (SELECT id FROM public.recipes WHERE restaurant_id = p_branch_id);
  DELETE FROM public.recipes WHERE restaurant_id = p_branch_id;

  DELETE FROM public.menu_item_variants WHERE restaurant_id = p_branch_id;
  DELETE FROM public.menu_items WHERE restaurant_id = p_branch_id;
  DELETE FROM public.categories WHERE restaurant_id = p_branch_id;

  DELETE FROM public.inventory_lots WHERE restaurant_id = p_branch_id;
  DELETE FROM public.inventory_items WHERE restaurant_id = p_branch_id;
  DELETE FROM public.daily_revenue_stats WHERE restaurant_id = p_branch_id;
  DELETE FROM public.guest_feedback WHERE restaurant_id = p_branch_id;
  DELETE FROM public.guest_preferences WHERE restaurant_id = p_branch_id;

  DELETE FROM public.room_amenities WHERE restaurant_id = p_branch_id;
  DELETE FROM public.room_amenity_inventory WHERE restaurant_id = p_branch_id;
  DELETE FROM public.room_billings WHERE restaurant_id = p_branch_id;
  DELETE FROM public.room_cleaning_schedules WHERE restaurant_id = p_branch_id;
  DELETE FROM public.room_food_orders WHERE restaurant_id = p_branch_id;
  DELETE FROM public.room_maintenance_requests WHERE restaurant_id = p_branch_id;
  DELETE FROM public.rooms WHERE restaurant_id = p_branch_id;

  DELETE FROM public.whatsapp_campaign_sends WHERE restaurant_id = p_branch_id;
  DELETE FROM public.whatsapp_templates WHERE restaurant_id = p_branch_id;
  DELETE FROM public.restaurant_subscriptions WHERE restaurant_id = p_branch_id;

  -- Remove branch profiles
  DELETE FROM public.profiles WHERE restaurant_id = p_branch_id;

  -- Layer 4: Delete the restaurant itself
  DELETE FROM public.restaurants WHERE id = p_branch_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_branch_id', p_branch_id,
    'name', v_branch_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_franchise_branch TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 4. CREATE clone_branch_menu_and_recipes()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.clone_branch_menu_and_recipes(
  p_source_branch_id UUID,
  p_target_branch_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_source_org_id UUID;
  v_target_org_id UUID;
  v_is_platform_admin BOOLEAN;
  v_is_org_admin BOOLEAN;
  
  -- Iterators
  r_cat RECORD;
  r_inv RECORD;
  r_item RECORD;
  r_var RECORD;
  r_rec RECORD;
  r_ing RECORD;

  -- Generated IDs
  v_new_cat_id UUID;
  v_new_inv_id UUID;
  v_new_item_id UUID;
  v_new_var_id UUID;
  v_new_rec_id UUID;

  -- Counters
  v_categories_count INTEGER := 0;
  v_inventory_count INTEGER := 0;
  v_items_count INTEGER := 0;
  v_recipes_count INTEGER := 0;
BEGIN
  v_caller_id := auth.uid();
  v_is_platform_admin := public.is_platform_admin();

  -- Get org IDs
  SELECT organization_id INTO v_source_org_id FROM public.restaurants WHERE id = p_source_branch_id;
  SELECT organization_id INTO v_target_org_id FROM public.restaurants WHERE id = p_target_branch_id;

  IF v_source_org_id IS NULL OR v_target_org_id IS NULL THEN
    RAISE EXCEPTION 'Source or target branch not found';
  END IF;

  -- Check permissions
  SELECT (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id IN (v_source_org_id, v_target_org_id)
      AND user_id = v_caller_id
      AND role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.organizations
      WHERE id IN (v_source_org_id, v_target_org_id)
      AND owner_user_id = v_caller_id
    )
  ) INTO v_is_org_admin;

  IF NOT (v_is_platform_admin OR v_is_org_admin) THEN
    RAISE EXCEPTION 'Insufficient permissions to clone menu/recipes';
  END IF;

  -- Temporary mapping tables for ID translations
  CREATE TEMP TABLE IF NOT EXISTS temp_cat_map (old_id UUID, new_id UUID) ON COMMIT DROP;
  CREATE TEMP TABLE IF NOT EXISTS temp_inv_map (old_id UUID, new_id UUID) ON COMMIT DROP;
  CREATE TEMP TABLE IF NOT EXISTS temp_item_map (old_id UUID, new_id UUID) ON COMMIT DROP;
  CREATE TEMP TABLE IF NOT EXISTS temp_var_map (old_id UUID, new_id UUID) ON COMMIT DROP;
  CREATE TEMP TABLE IF NOT EXISTS temp_rec_map (old_id UUID, new_id UUID) ON COMMIT DROP;

  TRUNCATE temp_cat_map;
  TRUNCATE temp_inv_map;
  TRUNCATE temp_item_map;
  TRUNCATE temp_var_map;
  TRUNCATE temp_rec_map;

  -- 1. Clone Categories
  FOR r_cat IN SELECT * FROM public.categories WHERE restaurant_id = p_source_branch_id LOOP
    SELECT id INTO v_new_cat_id 
    FROM public.categories 
    WHERE restaurant_id = p_target_branch_id AND LOWER(TRIM(name)) = LOWER(TRIM(r_cat.name))
    LIMIT 1;

    IF v_new_cat_id IS NULL THEN
      INSERT INTO public.categories (
        restaurant_id, name, description, icon, color, sort_order, is_active
      ) VALUES (
        p_target_branch_id, r_cat.name, r_cat.description, r_cat.icon, r_cat.color, r_cat.sort_order, COALESCE(r_cat.is_active, true)
      ) RETURNING id INTO v_new_cat_id;
      v_categories_count := v_categories_count + 1;
    END IF;

    INSERT INTO temp_cat_map (old_id, new_id) VALUES (r_cat.id, v_new_cat_id);
  END LOOP;

  -- 2. Clone Inventory Items (required for recipe ingredients)
  FOR r_inv IN SELECT * FROM public.inventory_items WHERE restaurant_id = p_source_branch_id LOOP
    SELECT id INTO v_new_inv_id
    FROM public.inventory_items
    WHERE restaurant_id = p_target_branch_id AND LOWER(TRIM(name)) = LOWER(TRIM(r_inv.name))
    LIMIT 1;

    IF v_new_inv_id IS NULL THEN
      INSERT INTO public.inventory_items (
        restaurant_id, name, unit, cost_per_unit, category, minimum_stock_level, current_stock, is_active
      ) VALUES (
        p_target_branch_id, r_inv.name, r_inv.unit, r_inv.cost_per_unit, r_inv.category, r_inv.minimum_stock_level, 0, COALESCE(r_inv.is_active, true)
      ) RETURNING id INTO v_new_inv_id;
      v_inventory_count := v_inventory_count + 1;
    END IF;

    INSERT INTO temp_inv_map (old_id, new_id) VALUES (r_inv.id, v_new_inv_id);
  END LOOP;

  -- 3. Clone Menu Items
  FOR r_item IN SELECT * FROM public.menu_items WHERE restaurant_id = p_source_branch_id LOOP
    SELECT new_id INTO v_new_cat_id FROM temp_cat_map WHERE old_id = r_item.category_id;

    SELECT id INTO v_new_item_id
    FROM public.menu_items
    WHERE restaurant_id = p_target_branch_id AND LOWER(TRIM(name)) = LOWER(TRIM(r_item.name))
    LIMIT 1;

    IF v_new_item_id IS NULL THEN
      INSERT INTO public.menu_items (
        organization_id, restaurant_id, name, description, price, category, category_id,
        is_available, image_url, dietary_tags, origin, source_item_id
      ) VALUES (
        v_target_org_id, p_target_branch_id, r_item.name, r_item.description, r_item.price,
        r_item.category, v_new_cat_id, COALESCE(r_item.is_available, true), r_item.image_url,
        r_item.dietary_tags, 'inherited', r_item.id
      ) RETURNING id INTO v_new_item_id;
      v_items_count := v_items_count + 1;
    END IF;

    INSERT INTO temp_item_map (old_id, new_id) VALUES (r_item.id, v_new_item_id);
  END LOOP;

  -- 4. Clone Menu Item Variants
  FOR r_var IN SELECT * FROM public.menu_item_variants WHERE restaurant_id = p_source_branch_id LOOP
    SELECT new_id INTO v_new_item_id FROM temp_item_map WHERE old_id = r_var.menu_item_id;

    IF v_new_item_id IS NOT NULL THEN
      SELECT id INTO v_new_var_id
      FROM public.menu_item_variants
      WHERE restaurant_id = p_target_branch_id AND menu_item_id = v_new_item_id AND LOWER(TRIM(name)) = LOWER(TRIM(r_var.name))
      LIMIT 1;

      IF v_new_var_id IS NULL THEN
        INSERT INTO public.menu_item_variants (
          restaurant_id, menu_item_id, name, price, is_available
        ) VALUES (
          p_target_branch_id, v_new_item_id, r_var.name, r_var.price, COALESCE(r_var.is_available, true)
        ) RETURNING id INTO v_new_var_id;
      END IF;

      INSERT INTO temp_var_map (old_id, new_id) VALUES (r_var.id, v_new_var_id);
    END IF;
  END LOOP;

  -- 5. Clone Recipes
  FOR r_rec IN SELECT * FROM public.recipes WHERE restaurant_id = p_source_branch_id LOOP
    SELECT new_id INTO v_new_item_id FROM temp_item_map WHERE old_id = r_rec.menu_item_id;

    SELECT id INTO v_new_rec_id
    FROM public.recipes
    WHERE restaurant_id = p_target_branch_id AND (
      (menu_item_id IS NOT NULL AND menu_item_id = v_new_item_id)
      OR LOWER(TRIM(name)) = LOWER(TRIM(r_rec.name))
    )
    LIMIT 1;

    IF v_new_rec_id IS NULL THEN
      INSERT INTO public.recipes (
        restaurant_id, menu_item_id, name, category, description, prep_time_minutes,
        cook_time_minutes, servings, instructions, is_active, cost_per_serving
      ) VALUES (
        p_target_branch_id, v_new_item_id, r_rec.name, r_rec.category, r_rec.description,
        r_rec.prep_time_minutes, r_rec.cook_time_minutes, r_rec.servings, r_rec.instructions,
        COALESCE(r_rec.is_active, true), r_rec.cost_per_serving
      ) RETURNING id INTO v_new_rec_id;
      v_recipes_count := v_recipes_count + 1;
    END IF;

    INSERT INTO temp_rec_map (old_id, new_id) VALUES (r_rec.id, v_new_rec_id);
  END LOOP;

  -- 6. Clone Recipe Ingredients
  FOR r_ing IN SELECT ri.* FROM public.recipe_ingredients ri
    JOIN public.recipes r ON r.id = ri.recipe_id
    WHERE r.restaurant_id = p_source_branch_id LOOP

    SELECT new_id INTO v_new_rec_id FROM temp_rec_map WHERE old_id = r_ing.recipe_id;
    SELECT new_id INTO v_new_inv_id FROM temp_inv_map WHERE old_id = r_ing.inventory_item_id;
    SELECT new_id INTO v_new_var_id FROM temp_var_map WHERE old_id = r_ing.variant_id;

    IF v_new_rec_id IS NOT NULL AND v_new_inv_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.recipe_ingredients
        WHERE recipe_id = v_new_rec_id AND inventory_item_id = v_new_inv_id
        AND (variant_id IS NOT DISTINCT FROM v_new_var_id)
      ) THEN
        INSERT INTO public.recipe_ingredients (
          recipe_id, inventory_item_id, variant_id, quantity, unit, cost_per_unit, notes
        ) VALUES (
          v_new_rec_id, v_new_inv_id, v_new_var_id, r_ing.quantity, r_ing.unit, r_ing.cost_per_unit, r_ing.notes
        );
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'categories_cloned', v_categories_count,
    'inventory_items_cloned', v_inventory_count,
    'menu_items_cloned', v_items_count,
    'recipes_cloned', v_recipes_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.clone_branch_menu_and_recipes TO authenticated, service_role;
