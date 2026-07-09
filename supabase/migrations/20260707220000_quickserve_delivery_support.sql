-- ═══════════════════════════════════════════════════════════════
-- QuickServe Delivery Support
-- Adds delivery columns to orders, address fields to customers,
-- delivery_zones table, delivery settings, and charge calculator.
-- Non-destructive: ADD COLUMN IF NOT EXISTS only.
-- ═══════════════════════════════════════════════════════════════

-- 1. orders table: delivery fields
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_notes text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lat double precision;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lng double precision;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_time timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_charge numeric(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_distance_km numeric(6,2);

-- 2. customers table: saved addresses
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address_lat double precision;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address_lng double precision;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS landmark text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS pincode text;

-- 3. delivery_zones: tiered distance-based pricing
CREATE TABLE IF NOT EXISTS delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  zone_name text NOT NULL,
  min_distance_km numeric(6,2) NOT NULL DEFAULT 0,
  max_distance_km numeric(6,2) NOT NULL,
  delivery_charge numeric(10,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT delivery_zones_distance_check CHECK (max_distance_km > min_distance_km)
);

ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'delivery_zones' AND policyname = 'delivery_zones_select'
  ) THEN
    CREATE POLICY "delivery_zones_select" ON delivery_zones
      FOR SELECT TO authenticated
      USING (restaurant_id = (SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'delivery_zones' AND policyname = 'delivery_zones_insert'
  ) THEN
    CREATE POLICY "delivery_zones_insert" ON delivery_zones
      FOR INSERT TO authenticated
      WITH CHECK (restaurant_id = (SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'delivery_zones' AND policyname = 'delivery_zones_update'
  ) THEN
    CREATE POLICY "delivery_zones_update" ON delivery_zones
      FOR UPDATE TO authenticated
      USING (restaurant_id = (SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()))
      WITH CHECK (restaurant_id = (SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'delivery_zones' AND policyname = 'delivery_zones_delete'
  ) THEN
    CREATE POLICY "delivery_zones_delete" ON delivery_zones
      FOR DELETE TO authenticated
      USING (restaurant_id = (SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()));
  END IF;
END $$;

-- 4. restaurant_settings: delivery config
ALTER TABLE restaurant_settings
  ADD COLUMN IF NOT EXISTS delivery_enabled boolean DEFAULT false;
ALTER TABLE restaurant_settings
  ADD COLUMN IF NOT EXISTS max_delivery_radius_km numeric(6,2) DEFAULT 10;
ALTER TABLE restaurant_settings
  ADD COLUMN IF NOT EXISTS restaurant_lat double precision;
ALTER TABLE restaurant_settings
  ADD COLUMN IF NOT EXISTS restaurant_lng double precision;
ALTER TABLE restaurant_settings
  ADD COLUMN IF NOT EXISTS default_delivery_charge numeric(10,2) DEFAULT 30;
ALTER TABLE restaurant_settings
  ADD COLUMN IF NOT EXISTS free_delivery_above numeric(10,2);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status
  ON orders(restaurant_id, delivery_status)
  WHERE order_type = 'delivery';

CREATE INDEX IF NOT EXISTS idx_orders_order_type
  ON orders(restaurant_id, order_type);

CREATE INDEX IF NOT EXISTS idx_delivery_zones_restaurant
  ON delivery_zones(restaurant_id, is_active);

-- 6. DB function: calculate delivery charge by distance (Haversine)
CREATE OR REPLACE FUNCTION calculate_delivery_charge(
  p_restaurant_id uuid,
  p_delivery_lat double precision,
  p_delivery_lng double precision
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER
AS $$
DECLARE
  v_restaurant_lat double precision;
  v_restaurant_lng double precision;
  v_max_radius numeric;
  v_distance_km numeric;
  v_charge numeric := 0;
  v_zone_name text := 'default';
  v_default_charge numeric;
  v_free_above numeric;
BEGIN
  -- Get restaurant location and settings
  SELECT restaurant_lat, restaurant_lng, max_delivery_radius_km,
         default_delivery_charge, free_delivery_above
  INTO v_restaurant_lat, v_restaurant_lng, v_max_radius,
       v_default_charge, v_free_above
  FROM restaurant_settings
  WHERE restaurant_id = p_restaurant_id
  LIMIT 1;

  -- Restaurant location not set
  IF v_restaurant_lat IS NULL OR v_restaurant_lng IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Restaurant location not configured. Set it in Settings → Delivery.'
    );
  END IF;

  -- Haversine distance calculation
  v_distance_km := round(
    (6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(v_restaurant_lat)) * cos(radians(p_delivery_lat)) *
        cos(radians(p_delivery_lng) - radians(v_restaurant_lng)) +
        sin(radians(v_restaurant_lat)) * sin(radians(p_delivery_lat))
      ))
    ))::numeric, 2
  );

  -- Check max radius
  IF v_distance_km > COALESCE(v_max_radius, 10) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Delivery address is %.1f km away. Max radius is %s km.',
                       v_distance_km, v_max_radius),
      'distance_km', v_distance_km,
      'max_radius_km', v_max_radius
    );
  END IF;

  -- Find matching delivery zone
  SELECT dz.delivery_charge, dz.zone_name
  INTO v_charge, v_zone_name
  FROM delivery_zones dz
  WHERE dz.restaurant_id = p_restaurant_id
    AND dz.is_active = true
    AND v_distance_km >= dz.min_distance_km
    AND v_distance_km < dz.max_distance_km
  ORDER BY dz.min_distance_km
  LIMIT 1;

  -- No zone matched → use default charge
  IF v_charge IS NULL THEN
    v_charge := COALESCE(v_default_charge, 30);
    v_zone_name := 'default';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'distance_km', v_distance_km,
    'charge', v_charge,
    'zone_name', v_zone_name,
    'free_delivery_above', v_free_above
  );
END;
$$;
