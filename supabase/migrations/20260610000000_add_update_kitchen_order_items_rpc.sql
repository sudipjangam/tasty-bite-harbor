-- Function to update kitchen order items by pin
CREATE OR REPLACE FUNCTION update_kitchen_order_items_by_pin(
  p_order_id UUID,
  p_restaurant_id UUID,
  p_pin TEXT,
  p_items JSONB,
  p_item_completion_status JSONB DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_is_valid BOOLEAN;
BEGIN
  -- Verify PIN
  SELECT EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE restaurant_id = p_restaurant_id 
    AND pin = p_pin 
    AND is_active = true
  ) INTO v_is_valid;

  IF NOT v_is_valid THEN
    RAISE EXCEPTION 'Invalid PIN or inactive user';
  END IF;

  -- Update items
  IF p_item_completion_status IS NOT NULL THEN
    UPDATE kitchen_orders
    SET 
      items = p_items,
      item_completion_status = p_item_completion_status
    WHERE id = p_order_id 
    AND restaurant_id = p_restaurant_id;
  ELSE
    UPDATE kitchen_orders
    SET items = p_items
    WHERE id = p_order_id 
    AND restaurant_id = p_restaurant_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
