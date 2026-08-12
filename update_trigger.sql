-- Function to generate owner notifications based on various table events
CREATE OR REPLACE FUNCTION generate_owner_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_restaurant_id UUID;
  v_title TEXT;
  v_message TEXT;
BEGIN
  -- Extract restaurant_id based on operation
  IF TG_OP = 'DELETE' THEN
    v_restaurant_id := OLD.restaurant_id;
  ELSE
    v_restaurant_id := NEW.restaurant_id;
  END IF;

  -- Ensure we have a restaurant_id to attach the notification to
  IF v_restaurant_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- 1. ORDERS (This handles all order creations and status updates)
  IF TG_TABLE_NAME = 'orders' THEN
    IF TG_OP = 'INSERT' THEN
      v_title := 'New Order Created';
      v_message := 'Order ' || COALESCE('#' || NEW.order_number::text, 'for ' || NEW.customer_name, 'from ' || NEW.source, '#Unknown') || ' has been placed (Total: ₹' || NEW.total || ').';
    ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
      v_title := 'Order Status Updated';
      v_message := 'Order ' || COALESCE('#' || NEW.order_number::text, 'for ' || NEW.customer_name, 'from ' || NEW.source, '#Unknown') || ' status changed to ' || NEW.status || '.';
    END IF;

  -- 2. PAYMENTS
  ELSIF TG_TABLE_NAME = 'payments' THEN
    IF TG_OP = 'INSERT' THEN
      v_title := 'Payment Received';
      v_message := 'Received ' || COALESCE(NEW.payment_method, 'Unknown') || ' payment of ₹' || COALESCE(NEW.amount::text, '0') || '.';
    END IF;

  -- 3. MENU ITEMS
  ELSIF TG_TABLE_NAME = 'menu_items' THEN
    IF TG_OP = 'INSERT' THEN
      v_title := 'New Menu Item Added';
      v_message := NEW.name || ' was added to the menu.';
    ELSIF TG_OP = 'UPDATE' AND NEW.price IS DISTINCT FROM OLD.price THEN
      v_title := 'Menu Price Changed';
      v_message := 'The price for ' || NEW.name || ' changed from ₹' || COALESCE(OLD.price::text, '0') || ' to ₹' || COALESCE(NEW.price::text, '0') || '.';
    ELSIF TG_OP = 'DELETE' THEN
      v_title := 'Menu Item Deleted';
      v_message := OLD.name || ' was removed from the menu.';
    END IF;

  -- 4. INVENTORY TRANSACTIONS
  ELSIF TG_TABLE_NAME = 'inventory_transactions' THEN
    IF TG_OP = 'INSERT' AND NEW.transaction_type IN ('adjustment', 'loss', 'return') THEN
      v_title := 'Inventory Alert';
      v_message := 'A ' || NEW.transaction_type || ' of ' || COALESCE(NEW.quantity_change::text, '0') || ' was recorded.';
    END IF;

  -- 5. RESERVATIONS
  ELSIF TG_TABLE_NAME = 'reservations' THEN
    IF TG_OP = 'INSERT' THEN
      v_title := 'New Reservation';
      v_message := 'Reservation created for ' || COALESCE(NEW.customer_name, 'Unknown') || ' on ' || COALESCE(NEW.reservation_time::text, 'Unknown') || ' for ' || COALESCE(NEW.guest_count::text, '0') || ' guests.';
    END IF;
  END IF;

  -- Insert the notification if title was set
  IF v_title IS NOT NULL THEN
    INSERT INTO public.owner_notifications (restaurant_id, title, message, type)
    VALUES (v_restaurant_id, v_title, v_message, 'system_alert');
  END IF;

  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
