-- Add reservation_id and payment_status columns to orders table if they don't exist
DO $$ 
BEGIN
  -- Add reservation_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'reservation_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN reservation_id UUID REFERENCES reservations(id);
    CREATE INDEX IF NOT EXISTS idx_orders_reservation_id ON orders(reservation_id);
  END IF;

  -- Add payment_status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'completed';
  END IF;
END $$;

-- Add order_id column to room_food_orders table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'room_food_orders' AND column_name = 'order_id'
  ) THEN
    ALTER TABLE room_food_orders ADD COLUMN order_id UUID REFERENCES orders(id);
    CREATE INDEX IF NOT EXISTS idx_room_food_orders_order_id ON room_food_orders(order_id);
  END IF;
END $$;