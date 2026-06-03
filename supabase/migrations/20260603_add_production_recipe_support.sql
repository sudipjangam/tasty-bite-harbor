-- Migration: Add Production Recipe Support to Recipes Table
-- Created: 2026-06-03
-- Description: Extends the recipes table to support production recipes that
--              define how homemade inventory items are produced from raw materials.
--              A production recipe links to an output inventory item instead of a menu item.

-- 1. Add recipe_type column to distinguish menu recipes from production recipes
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS recipe_type TEXT DEFAULT 'menu_item'
  CHECK (recipe_type IN ('menu_item', 'production'));

-- 2. Link production recipes to their output inventory item
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS output_inventory_item_id UUID
  REFERENCES inventory_items(id) ON DELETE SET NULL;

-- 3. Store the base output quantity and unit for scaling calculations
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS output_quantity NUMERIC(10,3);
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS output_unit TEXT;

-- 4. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_recipes_output_item
  ON recipes(output_inventory_item_id) WHERE output_inventory_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recipes_type
  ON recipes(recipe_type);

-- 5. Make category optional for production recipes by adding a default
-- (category is already NOT NULL, but production recipes can use 'side_dish' as a placeholder)
-- No DDL change needed — handled at application level.

-- Note: Existing recipes automatically get recipe_type = 'menu_item' via the DEFAULT.
