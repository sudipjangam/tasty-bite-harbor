-- Kitchen → orders status sync.
-- When kitchen marks ready, the order is completed (food is done / ready to serve).
-- Payment status (paid/pending) is tracked separately via payment_status.

CREATE OR REPLACE FUNCTION public.sync_orders_status_from_kitchen()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF NEW.order_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'preparing' THEN
    UPDATE public.orders SET status = 'preparing', updated_at = now() WHERE id = NEW.order_id;
  ELSIF NEW.status = 'ready' OR NEW.status = 'completed' THEN
    UPDATE public.orders SET status = 'completed', updated_at = now() WHERE id = NEW.order_id;
  ELSIF NEW.status = 'new' THEN
    UPDATE public.orders SET status = 'pending', updated_at = now() WHERE id = NEW.order_id;
  ELSIF NEW.status = 'held' THEN
    UPDATE public.orders SET status = 'held', updated_at = now() WHERE id = NEW.order_id;
  END IF;

  RETURN NEW;
END;
$function$;
