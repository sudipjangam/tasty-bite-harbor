-- Disable the auto-sync trigger that incorrectly overrides UI calculations without unit conversions
DROP TRIGGER IF EXISTS trigger_sync_ingredient_cost ON public.recipe_ingredients;
DROP FUNCTION IF EXISTS sync_ingredient_cost() CASCADE;

-- Add is_custom_cost column to support manual cost overrides
ALTER TABLE public.recipe_ingredients 
ADD COLUMN IF NOT EXISTS is_custom_cost BOOLEAN DEFAULT false;
