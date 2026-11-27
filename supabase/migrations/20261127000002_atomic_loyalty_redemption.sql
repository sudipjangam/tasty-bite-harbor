-- Atomic, idempotent loyalty point redemption RPC + partial unique index

CREATE UNIQUE INDEX IF NOT EXISTS idx_loyalty_tx_unique_redemption_source
  ON public.loyalty_transactions (restaurant_id, source_id)
  WHERE source_id IS NOT NULL AND transaction_type IN ('redeem', 'redeemed');

CREATE OR REPLACE FUNCTION public.redeem_loyalty_points_atomic(
  p_tx_id UUID,
  p_restaurant_id UUID,
  p_customer_id UUID DEFAULT NULL,
  p_customer_phone TEXT DEFAULT NULL,
  p_points INTEGER DEFAULT 0,
  p_transaction_type TEXT DEFAULT 'redeem',
  p_source TEXT DEFAULT 'pos',
  p_source_id TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_inserted_id UUID;
BEGIN
  IF p_restaurant_id IS NULL OR COALESCE(p_points, 0) <= 0 THEN
    RETURN false;
  END IF;

  -- Enforce tenant access for authenticated callers (service_role bypasses)
  IF auth.uid() IS NOT NULL AND NOT (
    p_restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
    OR public.is_platform_admin()
  ) THEN
    RAISE EXCEPTION 'Access denied for restaurant %', p_restaurant_id;
  END IF;

  -- Idempotency check by tx id or (restaurant_id, source_id)
  IF p_tx_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.loyalty_transactions WHERE id = p_tx_id
  ) THEN
    RETURN false;
  END IF;

  IF p_source_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.loyalty_transactions
    WHERE restaurant_id = p_restaurant_id
      AND source_id = p_source_id
      AND transaction_type IN ('redeem', 'redeemed')
  ) THEN
    RETURN false;
  END IF;

  -- Resolve target customer
  IF p_customer_id IS NOT NULL THEN
    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE id = p_customer_id AND restaurant_id = p_restaurant_id
    FOR UPDATE;
  ELSIF p_customer_phone IS NOT NULL AND p_customer_phone <> '' THEN
    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE restaurant_id = p_restaurant_id AND phone = p_customer_phone
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_customer_id IS NULL THEN
    RETURN false;
  END IF;

  -- Insert transaction first with ON CONFLICT safety, then deduct balance atomically
  INSERT INTO public.loyalty_transactions (
    id,
    restaurant_id,
    customer_id,
    transaction_type,
    points,
    source,
    source_id,
    notes,
    created_by
  ) VALUES (
    COALESCE(p_tx_id, gen_random_uuid()),
    p_restaurant_id,
    v_customer_id,
    COALESCE(NULLIF(p_transaction_type, ''), 'redeem'),
    -p_points,
    COALESCE(NULLIF(p_source, ''), 'pos'),
    p_source_id,
    COALESCE(p_notes, format('Redeemed %s points offline', p_points)),
    p_created_by
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.customers
  SET loyalty_points = GREATEST(0, COALESCE(loyalty_points, 0) - p_points)
  WHERE id = v_customer_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_loyalty_points_atomic(UUID, UUID, UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_loyalty_points_atomic(UUID, UUID, UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated, service_role;
