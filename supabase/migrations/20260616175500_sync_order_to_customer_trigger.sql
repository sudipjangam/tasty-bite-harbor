-- DB trigger: auto-sync orders -> customers on every new order INSERT
-- Safety net: ONLY ensures customer record EXISTS + backfills missing phone
-- Stats (visit_count, total_spent, loyalty_points) handled by client-side useCRMSync
-- SECURITY DEFINER bypasses RLS so it works regardless of user role

CREATE OR REPLACE FUNCTION public.sync_order_to_customer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_id uuid;
  v_trimmed_name text;
  v_trimmed_phone text;
  v_existing_customer RECORD;
BEGIN
  v_trimmed_name := TRIM(NEW.customer_name);
  v_trimmed_phone := NULLIF(TRIM(COALESCE(NEW.customer_phone, '')), '');

  IF v_trimmed_name IS NULL OR v_trimmed_name = '' THEN
    RETURN NEW;
  END IF;

  -- Skip generic/placeholder names
  IF LOWER(v_trimmed_name) IN (
    'nc', 'delivery', 'takeaway', 'dine-in', 'dine in',
    'pos order', 'qsr order', 'qsr-order', 'walk-in', 'walk in',
    'walkin', 'walk-in customer', 'walkin customer', 'guest', 'customer'
  ) THEN
    RETURN NEW;
  END IF;

  -- Try find existing customer by phone first
  IF v_trimmed_phone IS NOT NULL THEN
    SELECT id, phone INTO v_existing_customer
    FROM public.customers
    WHERE restaurant_id = NEW.restaurant_id
      AND phone = v_trimmed_phone
    LIMIT 1;
  END IF;

  -- Fallback: find by name (case-insensitive)
  IF v_existing_customer.id IS NULL THEN
    SELECT id, phone INTO v_existing_customer
    FROM public.customers
    WHERE restaurant_id = NEW.restaurant_id
      AND LOWER(TRIM(name)) = LOWER(v_trimmed_name)
    LIMIT 1;
  END IF;

  -- If customer exists, only backfill phone if missing
  IF v_existing_customer.id IS NOT NULL THEN
    IF v_trimmed_phone IS NOT NULL AND v_existing_customer.phone IS NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.customers
        WHERE restaurant_id = NEW.restaurant_id
          AND phone = v_trimmed_phone
          AND id != v_existing_customer.id
      ) THEN
        UPDATE public.customers SET phone = v_trimmed_phone WHERE id = v_existing_customer.id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Customer doesn't exist — create as safety net
  -- Prevent unique violation on phone
  IF v_trimmed_phone IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.customers WHERE restaurant_id = NEW.restaurant_id AND phone = v_trimmed_phone
  ) THEN
    v_trimmed_phone := NULL;
  END IF;

  INSERT INTO public.customers (name, phone, restaurant_id, visit_count, total_spent, loyalty_points, last_visit_date, average_order_value, tags)
  VALUES (
    v_trimmed_name,
    v_trimmed_phone,
    NEW.restaurant_id,
    0,  -- useCRMSync will increment
    0,  -- useCRMSync will set actual amount
    0,
    NOW(),
    0,
    ARRAY['auto-synced']::text[]
  );

  RETURN NEW;
END;
$$;

-- Trigger fires AFTER every new order is inserted
DROP TRIGGER IF EXISTS trg_sync_order_to_customer ON public.orders;
CREATE TRIGGER trg_sync_order_to_customer
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_to_customer();
