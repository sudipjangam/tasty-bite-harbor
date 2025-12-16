
-- CRITICAL FIX: Add menu_items RLS policy
CREATE POLICY "Component-based menu_items access"
ON public.menu_items
FOR ALL
TO authenticated
USING (public.check_access('menu_items', restaurant_id))
WITH CHECK (public.check_access('menu_items', restaurant_id));
