-- Create recipe categories enum
CREATE TYPE recipe_category AS ENUM (
  'appetizer',
  'main_course',
  'dessert',
  'beverage',
  'side_dish',
  'salad',
  'soup',
  'breakfast',
  'snack'
);

-- Create unit of measure enum
CREATE TYPE unit_of_measure AS ENUM (
  'kg',
  'g',
  'mg',
  'l',
  'ml',
  'piece',
  'dozen',
  'cup',
  'tbsp',
  'tsp'
);

-- Create recipes table
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category recipe_category NOT NULL,
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  serving_size INTEGER NOT NULL DEFAULT 1,
  serving_unit TEXT DEFAULT 'portion',
  instructions TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  total_cost NUMERIC(10, 2) DEFAULT 0,
  selling_price NUMERIC(10, 2) DEFAULT 0,
  food_cost_percentage NUMERIC(5, 2) DEFAULT 0,
  margin_percentage NUMERIC(5, 2) DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create recipe_ingredients junction table
CREATE TABLE public.recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  quantity NUMERIC(10, 3) NOT NULL,
  unit unit_of_measure NOT NULL,
  cost_per_unit NUMERIC(10, 2),
  total_cost NUMERIC(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(recipe_id, inventory_item_id)
);

-- Create batch_productions table for batch cooking management
CREATE TABLE public.batch_productions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  batch_size INTEGER NOT NULL,
  production_date DATE NOT NULL DEFAULT CURRENT_DATE,
  produced_by UUID,
  total_cost NUMERIC(10, 2),
  cost_per_unit NUMERIC(10, 2),
  yield_actual INTEGER,
  yield_expected INTEGER,
  yield_percentage NUMERIC(5, 2),
  waste_amount NUMERIC(10, 3),
  waste_reason TEXT,
  notes TEXT,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create recipe_nutrition table (optional, for future use)
CREATE TABLE public.recipe_nutrition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE UNIQUE,
  calories INTEGER,
  protein_g NUMERIC(5, 2),
  carbs_g NUMERIC(5, 2),
  fat_g NUMERIC(5, 2),
  fiber_g NUMERIC(5, 2),
  sodium_mg INTEGER,
  allergens TEXT[],
  dietary_tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_productions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_nutrition ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recipes
CREATE POLICY "Users can view recipes for their restaurant"
  ON public.recipes FOR SELECT
  USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create recipes for their restaurant"
  ON public.recipes FOR INSERT
  WITH CHECK (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update recipes for their restaurant"
  ON public.recipes FOR UPDATE
  USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete recipes for their restaurant"
  ON public.recipes FOR DELETE
  USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  ));

-- RLS Policies for recipe_ingredients
CREATE POLICY "Users can view recipe ingredients"
  ON public.recipe_ingredients FOR SELECT
  USING (recipe_id IN (
    SELECT id FROM recipes WHERE restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage recipe ingredients"
  ON public.recipe_ingredients FOR ALL
  USING (recipe_id IN (
    SELECT id FROM recipes WHERE restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- RLS Policies for batch_productions
CREATE POLICY "Users can view batch productions for their restaurant"
  ON public.batch_productions FOR SELECT
  USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage batch productions"
  ON public.batch_productions FOR ALL
  USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  ));

-- RLS Policies for recipe_nutrition
CREATE POLICY "Users can view recipe nutrition"
  ON public.recipe_nutrition FOR SELECT
  USING (recipe_id IN (
    SELECT id FROM recipes WHERE restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage recipe nutrition"
  ON public.recipe_nutrition FOR ALL
  USING (recipe_id IN (
    SELECT id FROM recipes WHERE restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- Create indexes for better performance
CREATE INDEX idx_recipes_restaurant_id ON public.recipes(restaurant_id);
CREATE INDEX idx_recipes_category ON public.recipes(category);
CREATE INDEX idx_recipe_ingredients_recipe_id ON public.recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_inventory_item_id ON public.recipe_ingredients(inventory_item_id);
CREATE INDEX idx_batch_productions_restaurant_id ON public.batch_productions(restaurant_id);
CREATE INDEX idx_batch_productions_recipe_id ON public.batch_productions(recipe_id);
CREATE INDEX idx_batch_productions_date ON public.batch_productions(production_date);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recipe_ingredients_updated_at
  BEFORE UPDATE ON public.recipe_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_batch_productions_updated_at
  BEFORE UPDATE ON public.batch_productions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recipe_nutrition_updated_at
  BEFORE UPDATE ON public.recipe_nutrition
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-calculate recipe costs
CREATE OR REPLACE FUNCTION calculate_recipe_cost()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the total cost of the recipe based on ingredients
  UPDATE recipes
  SET 
    total_cost = (
      SELECT COALESCE(SUM(total_cost), 0)
      FROM recipe_ingredients
      WHERE recipe_id = NEW.recipe_id
    ),
    food_cost_percentage = CASE
      WHEN selling_price > 0 THEN 
        ((SELECT COALESCE(SUM(total_cost), 0)
          FROM recipe_ingredients
          WHERE recipe_id = NEW.recipe_id) / selling_price) * 100
      ELSE 0
    END,
    margin_percentage = CASE
      WHEN selling_price > 0 THEN 
        100 - (((SELECT COALESCE(SUM(total_cost), 0)
          FROM recipe_ingredients
          WHERE recipe_id = NEW.recipe_id) / selling_price) * 100)
      ELSE 0
    END,
    updated_at = now()
  WHERE id = NEW.recipe_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to recalculate recipe cost when ingredients change
CREATE TRIGGER trigger_calculate_recipe_cost
  AFTER INSERT OR UPDATE OR DELETE ON public.recipe_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION calculate_recipe_cost();

-- Function to calculate ingredient cost from inventory
CREATE OR REPLACE FUNCTION sync_ingredient_cost()
RETURNS TRIGGER AS $$
BEGIN
  -- Update recipe ingredient cost based on inventory item cost
  NEW.cost_per_unit := (
    SELECT cost_per_unit
    FROM inventory_items
    WHERE id = NEW.inventory_item_id
  );
  
  NEW.total_cost := NEW.quantity * NEW.cost_per_unit;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to sync costs when ingredient is added/updated
CREATE TRIGGER trigger_sync_ingredient_cost
  BEFORE INSERT OR UPDATE ON public.recipe_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION sync_ingredient_cost();