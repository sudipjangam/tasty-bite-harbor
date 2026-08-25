-- Fix: sync_orders_status_from_kitchen should NOT revert an already-completed order back to pending/preparing.
-- Scenario: QSR POS "Send to Kitchen" (round 2+) sets kitchen_orders.status = 'new',
-- which was triggering orders.status -> 'pending', undoing a completed payment.

CREATE OR REPLACE FUNCTION public.sync_orders_status_from_kitchen()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  current_order_status TEXT;
BEGIN
  IF NEW.order_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Guard: never downgrade an already completed/cancelled order
  SELECT status INTO current_order_status
  FROM public.orders
  WHERE id = NEW.order_id;

  IF current_order_status IN ('completed', 'cancelled', 'nc') THEN
    -- Do not overwrite a completed/cancelled order status from kitchen changes
    RETURN NEW;
  END IF;

  -- Map kitchen status to orders status
  IF NEW.status = 'preparing' THEN
    UPDATE public.orders SET status = 'preparing', updated_at = now() WHERE id = NEW.order_id;
  ELSIF NEW.status = 'ready' OR NEW.status = 'completed' THEN
    UPDATE public.orders SET status = 'completed', updated_at = now() WHERE id = NEW.order_id;
  ELSIF NEW.status = 'new' THEN
    UPDATE public.orders SET status = 'pending', updated_at = now() WHERE id = NEW.order_id;
  END IF;

  RETURN NEW;
END;
$function$;
