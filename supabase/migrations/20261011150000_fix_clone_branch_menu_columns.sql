-- ============================================================================
-- Migration: Fix clone_branch_menu_and_recipes column mappings
-- Purpose:
--   Fix invalid column references in clone_branch_menu_and_recipes RPC:
--   - categories: remove description, icon, color, sort_order, is_active (only name, restaurant_id)
--   - inventory_items: replace minimum_stock_level/current_stock/is_active with reorder_level/quantity/is_produced
--   - menu_items: remove category_id, dietary_tags; add is_veg, is_special
--   - recipes: replace servings/cost_per_serving with serving_size/total_cost
-- ============================================================================

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
  v_new_output_inv_id UUID;

  -- Counters
  v_categories_count INTEGER := 0;
  v_inventory_count INTEGER := 0;
  v_items_count INTEGER := 0;
  v_recipes_count INTEGER := 0;
BEGIN
  v_caller_id := auth.uid();
  v_is_platform_admin := public.is_platform_admin();

  -- Verify existence of both branches
  IF NOT EXISTS (SELECT 1 FROM public.restaurants WHERE id = p_source_branch_id) OR
     NOT EXISTS (SELECT 1 FROM public.restaurants WHERE id = p_target_branch_id) THEN
    RAISE EXCEPTION 'Source or target branch not found';
  END IF;

  -- Get org IDs
  SELECT organization_id INTO v_source_org_id FROM public.restaurants WHERE id = p_source_branch_id;
  SELECT organization_id INTO v_target_org_id FROM public.restaurants WHERE id = p_target_branch_id;

  -- Check permissions: platform admin can clone across orgs; ordinary callers must administer the same org
  IF NOT v_is_platform_admin THEN
    IF v_source_org_id IS NULL OR v_target_org_id IS NULL OR v_source_org_id <> v_target_org_id THEN
      RAISE EXCEPTION 'Both branches must belong to the same organization to clone menu';
    END IF;

    SELECT (
      EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = v_source_org_id
        AND user_id = v_caller_id
        AND role IN ('owner', 'admin')
      )
      OR EXISTS (
        SELECT 1 FROM public.organizations
        WHERE id = v_source_org_id
        AND owner_user_id = v_caller_id
      )
    ) INTO v_is_org_admin;

    IF NOT v_is_org_admin THEN
      RAISE EXCEPTION 'Insufficient permissions to clone menu/recipes for this organization';
    END IF;
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
        restaurant_id, name
      ) VALUES (
        p_target_branch_id, r_cat.name
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
        restaurant_id, name, unit, cost_per_unit, category, reorder_level, quantity, is_produced
      ) VALUES (
        p_target_branch_id, r_inv.name, r_inv.unit, r_inv.cost_per_unit, r_inv.category, r_inv.reorder_level, 0, COALESCE(r_inv.is_produced, false)
      ) RETURNING id INTO v_new_inv_id;
      v_inventory_count := v_inventory_count + 1;
    END IF;

    INSERT INTO temp_inv_map (old_id, new_id) VALUES (r_inv.id, v_new_inv_id);
  END LOOP;

  -- 3. Clone Menu Items
  FOR r_item IN SELECT * FROM public.menu_items WHERE restaurant_id = p_source_branch_id LOOP
    SELECT id INTO v_new_item_id
    FROM public.menu_items
    WHERE restaurant_id = p_target_branch_id AND LOWER(TRIM(name)) = LOWER(TRIM(r_item.name))
    LIMIT 1;

    IF v_new_item_id IS NULL THEN
      INSERT INTO public.menu_items (
        organization_id, restaurant_id, name, description, price, category,
        is_available, is_veg, is_special, image_url, origin, source_item_id,
        base_unit_quantity, pricing_type, pricing_unit
      ) VALUES (
        v_target_org_id, p_target_branch_id, r_item.name, r_item.description, r_item.price,
        r_item.category, COALESCE(r_item.is_available, true), r_item.is_veg, r_item.is_special,
        r_item.image_url, 'inherited', r_item.id,
        r_item.base_unit_quantity, r_item.pricing_type, r_item.pricing_unit
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
          restaurant_id, menu_item_id, name, price, is_available, sort_order
        ) VALUES (
          p_target_branch_id, v_new_item_id, r_var.name, r_var.price, COALESCE(r_var.is_available, true), r_var.sort_order
        ) RETURNING id INTO v_new_var_id;
      END IF;

      INSERT INTO temp_var_map (old_id, new_id) VALUES (r_var.id, v_new_var_id);
    END IF;
  END LOOP;

  -- 5. Clone Recipes
  FOR r_rec IN SELECT * FROM public.recipes WHERE restaurant_id = p_source_branch_id LOOP
    SELECT new_id INTO v_new_item_id FROM temp_item_map WHERE old_id = r_rec.menu_item_id;
    SELECT new_id INTO v_new_output_inv_id FROM temp_inv_map WHERE old_id = r_rec.output_inventory_item_id;

    SELECT id INTO v_new_rec_id
    FROM public.recipes
    WHERE restaurant_id = p_target_branch_id AND (
      (v_new_item_id IS NOT NULL AND menu_item_id = v_new_item_id)
      OR LOWER(TRIM(name)) = LOWER(TRIM(r_rec.name))
    )
    LIMIT 1;

    IF v_new_rec_id IS NULL THEN
      INSERT INTO public.recipes (
        restaurant_id, menu_item_id, name, category, description,
        prep_time_minutes, cook_time_minutes, serving_size, serving_unit,
        instructions, is_active, total_cost, selling_price, difficulty,
        food_cost_percentage, margin_percentage, image_url, recipe_type,
        output_inventory_item_id, output_quantity, output_unit
      ) VALUES (
        p_target_branch_id, v_new_item_id, r_rec.name, COALESCE(r_rec.category, 'main_course'::recipe_category), r_rec.description,
        r_rec.prep_time_minutes, r_rec.cook_time_minutes, COALESCE(r_rec.serving_size, 1), r_rec.serving_unit,
        r_rec.instructions, COALESCE(r_rec.is_active, true), r_rec.total_cost, r_rec.selling_price, r_rec.difficulty,
        r_rec.food_cost_percentage, r_rec.margin_percentage, r_rec.image_url, COALESCE(r_rec.recipe_type, 'menu_item'),
        v_new_output_inv_id, r_rec.output_quantity, r_rec.output_unit
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
          recipe_id, inventory_item_id, variant_id, quantity, unit, cost_per_unit, total_cost, notes
        ) VALUES (
          v_new_rec_id, v_new_inv_id, v_new_var_id, r_ing.quantity, r_ing.unit, r_ing.cost_per_unit, r_ing.total_cost, r_ing.notes
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
