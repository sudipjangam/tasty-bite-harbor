
-- Fix 1: Add policies for tables with RLS enabled but no policies
-- room_amenities
CREATE POLICY "Component-based room_amenities access"
ON public.room_amenities
FOR ALL
TO authenticated
USING (public.check_access('room_amenities', restaurant_id))
WITH CHECK (public.check_access('room_amenities', restaurant_id));

-- room_amenity_inventory (check if it has restaurant_id)
CREATE POLICY "Component-based room_amenity_inventory access"
ON public.room_amenity_inventory
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.room_amenities ra
    WHERE ra.id = room_amenity_inventory.amenity_id
    AND public.check_access('room_amenity_inventory', ra.restaurant_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.room_amenities ra
    WHERE ra.id = room_amenity_inventory.amenity_id
    AND public.check_access('room_amenity_inventory', ra.restaurant_id)
  )
);

-- Fix 2: Drop security definer views and recreate as regular views
DROP VIEW IF EXISTS public.customer_insights CASCADE;
CREATE VIEW public.customer_insights AS
SELECT 
  o.customer_name,
  o.restaurant_id,
  COUNT(*) as visit_count,
  SUM(o.total) as total_spent,
  AVG(o.total) as average_order_value,
  MIN(o.created_at) as first_visit,
  MAX(o.created_at) as last_visit
FROM public.orders o
WHERE o.customer_name IS NOT NULL
GROUP BY o.customer_name, o.restaurant_id;

DROP VIEW IF EXISTS public.profiles_with_role CASCADE;
CREATE VIEW public.profiles_with_role AS
SELECT 
  p.id,
  p.role,
  p.restaurant_id,
  p.role_id,
  r.name as role_name
FROM public.profiles p
LEFT JOIN public.roles r ON p.role_id = r.id;
