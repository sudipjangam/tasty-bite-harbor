
-- Fix supplier_order_items policy with correct column name
ALTER TABLE public.supplier_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "supplier_order_items_policy" ON public.supplier_order_items;
DROP POLICY IF EXISTS "Component-based supplier_order_items access" ON public.supplier_order_items;
CREATE POLICY "Component-based supplier_order_items access"
ON public.supplier_order_items
FOR ALL
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
