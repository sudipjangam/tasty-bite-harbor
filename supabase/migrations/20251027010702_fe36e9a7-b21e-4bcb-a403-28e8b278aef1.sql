-- Add menu_item_id to recipes table to link recipes with menu items
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_recipes_menu_item_id ON recipes(menu_item_id);

-- Add comment
COMMENT ON COLUMN recipes.menu_item_id IS 'Links recipe to a menu item for automatic inventory deduction';