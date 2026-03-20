-- Add variant_id to recipe_ingredients table to support size variant specific ingredients
ALTER TABLE recipe_ingredients 
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES menu_item_variants(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_variant_id ON recipe_ingredients(variant_id);

-- Add comment
COMMENT ON COLUMN recipe_ingredients.variant_id IS 'Links ingredient to a specific size variant. If null, applies to all variants/base item.';
