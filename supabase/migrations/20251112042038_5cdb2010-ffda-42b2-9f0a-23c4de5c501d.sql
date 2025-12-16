-- Enable RLS on payment_settings table
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view payment settings for their restaurant" ON payment_settings;
DROP POLICY IF EXISTS "Users can insert payment settings for their restaurant" ON payment_settings;
DROP POLICY IF EXISTS "Users can update payment settings for their restaurant" ON payment_settings;
DROP POLICY IF EXISTS "Users can delete payment settings for their restaurant" ON payment_settings;

-- Policy: Users can view payment settings for their restaurant
CREATE POLICY "Users can view payment settings for their restaurant"
ON payment_settings
FOR SELECT
USING (
  restaurant_id IN (
    SELECT restaurant_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- Policy: Users can insert payment settings for their restaurant
CREATE POLICY "Users can insert payment settings for their restaurant"
ON payment_settings
FOR INSERT
WITH CHECK (
  restaurant_id IN (
    SELECT restaurant_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- Policy: Users can update payment settings for their restaurant
CREATE POLICY "Users can update payment settings for their restaurant"
ON payment_settings
FOR UPDATE
USING (
  restaurant_id IN (
    SELECT restaurant_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  restaurant_id IN (
    SELECT restaurant_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- Policy: Users can delete payment settings for their restaurant
CREATE POLICY "Users can delete payment settings for their restaurant"
ON payment_settings
FOR DELETE
USING (
  restaurant_id IN (
    SELECT restaurant_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);