-- Sync orders.status when kitchen_orders.status changes
CREATE OR REPLACE FUNCTION public.sync_orders_status_from_kitchen()
RETURNS TRIGGER AS $$
BEGIN
  -- If no linked order, do nothing
  IF NEW.order_id IS NULL THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure a clean trigger state
DROP TRIGGER IF EXISTS trg_sync_orders_status_from_kitchen ON public.kitchen_orders;

-- Create trigger on status updates
CREATE TRIGGER trg_sync_orders_status_from_kitchen
AFTER UPDATE OF status ON public.kitchen_orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_orders_status_from_kitchen();