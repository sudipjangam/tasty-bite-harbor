-- Drop existing restrictive policy for inserting reservations
DROP POLICY IF EXISTS "Operational roles can create reservations" ON public.reservations;

-- Create a more permissive policy that allows any authenticated user to create reservations for their restaurant
CREATE POLICY "Users can create reservations for their restaurant"
ON public.reservations
FOR INSERT
TO public
WITH CHECK (
  restaurant_id IN (
    SELECT restaurant_id
    FROM public.profiles
    WHERE id = auth.uid()
  )
);

-- Also ensure the SELECT policy is permissive
DROP POLICY IF EXISTS "Users can view reservations for their restaurant" ON public.reservations;

CREATE POLICY "Users can view reservations for their restaurant"
ON public.reservations
FOR SELECT
TO public
USING (
  restaurant_id IN (
    SELECT restaurant_id
    FROM public.profiles
    WHERE id = auth.uid()
  )
);

-- Keep the update policy restrictive to operational roles
-- (no changes needed for UPDATE and DELETE policies as they seem appropriate)
