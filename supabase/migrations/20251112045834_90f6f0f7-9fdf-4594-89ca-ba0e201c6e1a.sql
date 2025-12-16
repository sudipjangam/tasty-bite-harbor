-- Fix the INSERT policy for room_food_orders to properly validate restaurant_id
DROP POLICY IF EXISTS "Allow authenticated users to insert room food orders" ON public.room_food_orders;

CREATE POLICY "Allow authenticated users to insert room food orders"
ON public.room_food_orders
FOR INSERT
TO authenticated
WITH CHECK (
  restaurant_id IN (
    SELECT restaurant_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);