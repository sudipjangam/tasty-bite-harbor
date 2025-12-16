
-- Clean up old policies with public role and keep only component-based authenticated policies

-- payment_settings - remove old policies
DROP POLICY IF EXISTS "Users can delete payment settings for their restaurant" ON public.payment_settings;
DROP POLICY IF EXISTS "Users can insert payment settings for their restaurant" ON public.payment_settings;
DROP POLICY IF EXISTS "Users can insert their own payment settings" ON public.payment_settings;
DROP POLICY IF EXISTS "Users can update payment settings for their restaurant" ON public.payment_settings;
DROP POLICY IF EXISTS "Users can update their own payment settings" ON public.payment_settings;
DROP POLICY IF EXISTS "Users can view payment settings for their restaurant" ON public.payment_settings;
DROP POLICY IF EXISTS "Users can view their own payment settings" ON public.payment_settings;
DROP POLICY IF EXISTS "payment_settings_delete_own_restaurant" ON public.payment_settings;
DROP POLICY IF EXISTS "payment_settings_insert_own_restaurant" ON public.payment_settings;
DROP POLICY IF EXISTS "payment_settings_select_own_restaurant" ON public.payment_settings;
DROP POLICY IF EXISTS "payment_settings_update_own_restaurant" ON public.payment_settings;

-- operational_costs - remove old policies
DROP POLICY IF EXISTS "Users can delete operational costs for their restaurant" ON public.operational_costs;
DROP POLICY IF EXISTS "Users can insert operational costs for their restaurant" ON public.operational_costs;
DROP POLICY IF EXISTS "Users can update operational costs for their restaurant" ON public.operational_costs;
DROP POLICY IF EXISTS "Users can view operational costs for their restaurant" ON public.operational_costs;

-- staff - remove old policies and add component-based
DROP POLICY IF EXISTS "Management roles can create staff" ON public.staff;
DROP POLICY IF EXISTS "Management roles can update staff" ON public.staff;
DROP POLICY IF EXISTS "Senior management can delete staff" ON public.staff;
DROP POLICY IF EXISTS "Users can view staff for their restaurant" ON public.staff;
CREATE POLICY "Component-based staff access"
ON public.staff
FOR ALL
TO authenticated
USING (public.check_access('staff', restaurant_id))
WITH CHECK (public.check_access('staff', restaurant_id));

-- waitlist - remove old policy
DROP POLICY IF EXISTS "Users can manage waitlist for their restaurant" ON public.waitlist;

-- budget_line_items - remove old policy and add component-based
DROP POLICY IF EXISTS "budget_line_items_policy" ON public.budget_line_items;
ALTER TABLE public.budget_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Component-based budget_line_items access"
ON public.budget_line_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_line_items.budget_id
    AND public.check_access('budget_line_items', b.restaurant_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_line_items.budget_id
    AND public.check_access('budget_line_items', b.restaurant_id)
  )
);

-- inventory_items - remove old policies
DROP POLICY IF EXISTS "Inventory management roles can create items" ON public.inventory_items;
DROP POLICY IF EXISTS "Inventory management roles can update items" ON public.inventory_items;
DROP POLICY IF EXISTS "Management roles can delete inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Users can view inventory for their restaurant" ON public.inventory_items;
CREATE POLICY "Component-based inventory_items access"
ON public.inventory_items
FOR ALL
TO authenticated
USING (public.check_access('inventory_items', restaurant_id))
WITH CHECK (public.check_access('inventory_items', restaurant_id));
