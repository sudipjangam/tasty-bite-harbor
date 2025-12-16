-- Ensure RLS and scoped policies for payment_settings without adding unique index
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- Recreate policies idempotently
DROP POLICY IF EXISTS "payment_settings_select_own_restaurant" ON public.payment_settings;
DROP POLICY IF EXISTS "payment_settings_insert_own_restaurant" ON public.payment_settings;
DROP POLICY IF EXISTS "payment_settings_update_own_restaurant" ON public.payment_settings;
DROP POLICY IF EXISTS "payment_settings_delete_own_restaurant" ON public.payment_settings;

CREATE POLICY "payment_settings_select_own_restaurant"
ON public.payment_settings
FOR SELECT
USING (
  restaurant_id IN (
    SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "payment_settings_insert_own_restaurant"
ON public.payment_settings
FOR INSERT
WITH CHECK (
  restaurant_id IN (
    SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "payment_settings_update_own_restaurant"
ON public.payment_settings
FOR UPDATE
USING (
  restaurant_id IN (
    SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  restaurant_id IN (
    SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "payment_settings_delete_own_restaurant"
ON public.payment_settings
FOR DELETE
USING (
  restaurant_id IN (
    SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
  )
);
