-- ============================================================================
-- Customer Self-Enrollment Feature
-- Adds slug to restaurants and creates loyalty_enrollments table
-- ============================================================================

-- 1. Add slug column to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- 2. Generate slugs for existing restaurants
UPDATE restaurants 
SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g'))
WHERE slug IS NULL;

-- 3. Create function to auto-generate slug on insert
CREATE OR REPLACE FUNCTION generate_restaurant_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base slug from name
  base_slug := LOWER(REGEXP_REPLACE(REGEXP_REPLACE(NEW.name, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g'));
  final_slug := base_slug;
  
  -- Handle duplicates by appending number
  WHILE EXISTS (SELECT 1 FROM restaurants WHERE slug = final_slug AND id != NEW.id) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for auto-generating slug
DROP TRIGGER IF EXISTS set_restaurant_slug ON restaurants;
CREATE TRIGGER set_restaurant_slug
  BEFORE INSERT OR UPDATE OF name ON restaurants
  FOR EACH ROW
  WHEN (NEW.slug IS NULL OR NEW.slug = '')
  EXECUTE FUNCTION generate_restaurant_slug();

-- 5. Create loyalty_enrollments table
CREATE TABLE IF NOT EXISTS loyalty_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  
  -- Customer info (captured during enrollment)
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birthday DATE,
  
  -- Enrollment metadata
  source TEXT DEFAULT 'qr_code' CHECK (source IN ('qr_code', 'link', 'invitation', 'manual')),
  status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  welcome_points_awarded INTEGER DEFAULT 50,
  
  -- Timestamps
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_by UUID REFERENCES profiles(id),
  
  -- Additional data
  metadata JSONB DEFAULT '{}',
  user_agent TEXT,
  ip_address INET,
  
  -- Constraints
  CONSTRAINT unique_enrollment_email UNIQUE (restaurant_id, email),
  CONSTRAINT unique_enrollment_phone UNIQUE (restaurant_id, phone),
  CONSTRAINT require_contact CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_enrollments_restaurant ON loyalty_enrollments(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_customer ON loyalty_enrollments(customer_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_email ON loyalty_enrollments(email);
CREATE INDEX IF NOT EXISTS idx_enrollments_phone ON loyalty_enrollments(phone);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON loyalty_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);

-- 7. Enable RLS on loyalty_enrollments
ALTER TABLE loyalty_enrollments ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for loyalty_enrollments
-- Allow authenticated users to read enrollments for their restaurant
DROP POLICY IF EXISTS "Users can view enrollments for their restaurant" ON loyalty_enrollments;
CREATE POLICY "Users can view enrollments for their restaurant"
  ON loyalty_enrollments
  FOR SELECT
  TO authenticated
  USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  ));

-- Allow authenticated users to manage enrollments for their restaurant
DROP POLICY IF EXISTS "Users can manage enrollments for their restaurant" ON loyalty_enrollments;
CREATE POLICY "Users can manage enrollments for their restaurant"
  ON loyalty_enrollments
  FOR ALL
  TO authenticated
  USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  ))
  WITH CHECK (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  ));

-- Allow anonymous users to insert enrollments (for public enrollment page)
DROP POLICY IF EXISTS "Anyone can enroll" ON loyalty_enrollments;
CREATE POLICY "Anyone can enroll"
  ON loyalty_enrollments
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- 9. Comments for documentation
COMMENT ON TABLE loyalty_enrollments IS 'Tracks customer self-enrollments in loyalty program';
COMMENT ON COLUMN loyalty_enrollments.source IS 'How the customer enrolled: qr_code, link, invitation, manual';
COMMENT ON COLUMN loyalty_enrollments.status IS 'Enrollment status: pending, approved, rejected';
COMMENT ON COLUMN loyalty_enrollments.welcome_points_awarded IS 'Number of welcome points given on enrollment';
COMMENT ON COLUMN restaurants.slug IS 'URL-friendly unique identifier for the restaurant';
