-- Enable pg_net extension if not present (standard Supabase extension for async HTTP calls)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Trigger function to invoke send-order-update edge function on status change
CREATE OR REPLACE FUNCTION public.handle_order_status_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM net.http_post(
      url := 'https://clmsoetktmvhazctlans.supabase.co/functions/v1/send-order-update',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object(
        'record', row_to_json(NEW),
        'old_record', row_to_json(OLD)
      ),
      timeout_milliseconds := 5000
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it already exists
DROP TRIGGER IF EXISTS tr_orders_status_update ON public.orders;

-- Create trigger on status update
CREATE TRIGGER tr_orders_status_update
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_order_status_update();
