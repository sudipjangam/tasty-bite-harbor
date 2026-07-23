-- =============================================
-- DIGITAL TWIN SCHEMA: Table Layout Coordinates + Static Layout Objects
-- =============================================

BEGIN;

-- 1. Add coordinates and layout columns to restaurant_tables
ALTER TABLE restaurant_tables
  ADD COLUMN IF NOT EXISTS x_pos INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS y_pos INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS width INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS height INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS shape TEXT DEFAULT 'square' CHECK (shape IN ('square', 'circle', 'rectangle'));

-- 2. Create restaurant_layout_objects for non-table structural features
CREATE TABLE IF NOT EXISTS restaurant_layout_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('wall', 'restroom', 'storage', 'kitchen', 'host_stand', 'manager_desk', 'bar')),
  x_pos INTEGER NOT NULL DEFAULT 0,
  y_pos INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 2,
  height INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_layout_objects_restaurant ON restaurant_layout_objects(restaurant_id);

-- 4. Enable RLS on restaurant_layout_objects
ALTER TABLE restaurant_layout_objects ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "restaurant_layout_objects_select" ON restaurant_layout_objects
  FOR SELECT TO authenticated
  USING (
    restaurant_id = ANY(get_user_accessible_restaurants(auth.uid()))
  );

CREATE POLICY "restaurant_layout_objects_all" ON restaurant_layout_objects
  FOR ALL TO authenticated
  USING (
    restaurant_id = ANY(get_user_accessible_restaurants(auth.uid()))
  );

COMMIT;
