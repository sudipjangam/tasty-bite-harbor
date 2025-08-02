-- Enable RLS on restaurants table
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own restaurant data
CREATE POLICY "Users can view their restaurant data" ON restaurants
FOR SELECT USING (
  id IN (
    SELECT restaurant_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- Allow users to update their own restaurant data
CREATE POLICY "Users can update their restaurant data" ON restaurants
FOR UPDATE USING (
  id IN (
    SELECT restaurant_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- Allow users to insert restaurant data (for restaurant creation)
CREATE POLICY "Users can insert restaurant data" ON restaurants
FOR INSERT WITH CHECK (true);