
-- Fix anonymous access by adding TO authenticated to all component-based policies
-- This is a batch fix for all tables using the check_access pattern

-- First, let's fix the major tables with restaurant_id
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN 
        SELECT tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND policyname LIKE 'Component-based%'
        AND tablename IN (
            SELECT table_name 
            FROM information_schema.columns 
            WHERE column_name = 'restaurant_id' 
            AND table_schema = 'public'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Component-based %I access" ON public.%I', tbl.tablename, tbl.tablename);
        EXECUTE format('CREATE POLICY "Component-based %I access" ON public.%I FOR ALL TO authenticated USING (public.check_access(%L, restaurant_id)) WITH CHECK (public.check_access(%L, restaurant_id))', 
            tbl.tablename, tbl.tablename, tbl.tablename, tbl.tablename);
    END LOOP;
END $$;

-- Fix room_amenity_inventory (no direct restaurant_id)
DROP POLICY IF EXISTS "Component-based room_amenity_inventory access" ON public.room_amenity_inventory;
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

-- Fix recipe_ingredients
DROP POLICY IF EXISTS "Component-based recipe_ingredients access" ON public.recipe_ingredients;
CREATE POLICY "Component-based recipe_ingredients access"
ON public.recipe_ingredients
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.recipes r
    WHERE r.id = recipe_ingredients.recipe_id
    AND public.check_access('recipe_ingredients', r.restaurant_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.recipes r
    WHERE r.id = recipe_ingredients.recipe_id
    AND public.check_access('recipe_ingredients', r.restaurant_id)
  )
);

-- Fix purchase_order_items
DROP POLICY IF EXISTS "Component-based purchase_order_items access" ON public.purchase_order_items;
CREATE POLICY "Component-based purchase_order_items access"
ON public.purchase_order_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_items.purchase_order_id
    AND public.check_access('purchase_order_items', po.restaurant_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_items.purchase_order_id
    AND public.check_access('purchase_order_items', po.restaurant_id)
  )
);

-- Fix supplier_order_items
DROP POLICY IF EXISTS "Component-based supplier_order_items access" ON public.supplier_order_items;
CREATE POLICY "Component-based supplier_order_items access"
ON public.supplier_order_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.supplier_orders so
    WHERE so.id = supplier_order_items.order_id
    AND public.check_access('supplier_order_items', so.restaurant_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.supplier_orders so
    WHERE so.id = supplier_order_items.order_id
    AND public.check_access('supplier_order_items', so.restaurant_id)
  )
);

-- Fix other policies without TO authenticated
DROP POLICY IF EXISTS "Authenticated users can view components" ON public.app_components;
CREATE POLICY "Authenticated users can view components" 
ON public.app_components 
FOR SELECT 
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Only system admins can manage components" ON public.app_components;
CREATE POLICY "Only system admins can manage components" 
ON public.app_components 
FOR ALL 
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role]));

DROP POLICY IF EXISTS "Authenticated users can read component_table_mapping" ON public.component_table_mapping;
CREATE POLICY "Authenticated users can read component_table_mapping" 
ON public.component_table_mapping 
FOR SELECT 
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage component_table_mapping" ON public.component_table_mapping;
CREATE POLICY "Admins can manage component_table_mapping" 
ON public.component_table_mapping 
FOR ALL 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM user_roles ur
  WHERE ur.user_id = auth.uid() 
  AND ur.role = ANY(ARRAY['admin'::user_role, 'owner'::user_role])
));
