-- ============================================================================
-- Channel Management System (CMS) — Core Database Migration
-- Creates all tables needed for real OTA integration, pooled inventory,
-- retry queues, channel mapping, and audit logging.
-- ============================================================================

-- 1. OTA Credentials Vault
-- Stores encrypted username/password/tokens for each OTA connection.
CREATE TABLE IF NOT EXISTS ota_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES booking_channels(id) ON DELETE CASCADE,
  ota_name TEXT NOT NULL,                       -- 'mmt', 'goibibo', 'booking_com', 'agoda', etc.
  username TEXT,                                -- encrypted via pgsodium in app layer
  password_encrypted TEXT,                      -- never stored in plaintext
  access_token TEXT,                            -- for InGo-MMT token-based auth
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  api_endpoint TEXT,                            -- base URL for this OTA's API
  auth_type TEXT NOT NULL DEFAULT 'token',      -- 'token', 'basic', 'session', 'oauth2'
  extra_config JSONB DEFAULT '{}',              -- OTA-specific settings
  connection_status TEXT DEFAULT 'disconnected', -- 'connected', 'disconnected', 'expired', 'error'
  last_tested_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Channel Room Mapping
-- Maps internal HMS room types / rate plans to each OTA's unique identifiers.
CREATE TABLE IF NOT EXISTS channel_room_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES booking_channels(id) ON DELETE CASCADE,
  hms_room_type TEXT NOT NULL,                  -- your internal room type name
  hms_room_type_id UUID,                        -- FK to rooms table if applicable
  ota_room_type_id TEXT NOT NULL,               -- OTA's internal room type ID
  ota_rate_plan_id TEXT NOT NULL,               -- OTA's internal rate plan ID
  ota_room_name TEXT,                           -- display name on the OTA
  max_occupancy INT DEFAULT 2,
  is_mapped BOOLEAN DEFAULT true,
  mapping_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(channel_id, ota_room_type_id, ota_rate_plan_id)
);

-- 3. Pool Inventory (Central Source of Truth)
-- Holds the REAL available room count per room type. All channels derive from this.
CREATE TABLE IF NOT EXISTS pool_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  room_type TEXT NOT NULL,
  total_count INT NOT NULL DEFAULT 0,            -- total physical rooms of this type
  available_count INT NOT NULL DEFAULT 0,        -- currently bookable
  blocked_count INT DEFAULT 0,                   -- maintenance / stop-sell
  buffer_count INT DEFAULT 0,                    -- safety buffer to prevent overbooking
  date DATE NOT NULL DEFAULT CURRENT_DATE,       -- date-specific inventory
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(restaurant_id, room_type, date)
);

-- 4. Sync Logs (Audit Trail)
-- Complete log of every sync operation with raw request/response payloads.
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES booking_channels(id) ON DELETE SET NULL,
  sync_type TEXT NOT NULL,                       -- 'rate_push', 'availability_push', 'booking_pull', 'restriction_push', 'full_sync'
  direction TEXT NOT NULL DEFAULT 'outbound',    -- 'outbound' (push to OTA), 'inbound' (pull from OTA)
  status TEXT NOT NULL DEFAULT 'started',        -- 'started', 'success', 'partial', 'failed'
  records_processed INT DEFAULT 0,
  records_failed INT DEFAULT 0,
  error_details JSONB DEFAULT '[]'::jsonb,       -- array of error objects
  request_payload JSONB,                         -- EXACT JSON/XML sent to OTA
  response_payload JSONB,                        -- EXACT response from OTA
  http_status_code INT,
  duration_ms INT,
  triggered_by TEXT DEFAULT 'system',            -- 'system', 'user', 'webhook', 'cron'
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 5. Sync Retry Queue
-- Failed pushes are queued here with exponential backoff.
CREATE TABLE IF NOT EXISTS sync_retry_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES booking_channels(id) ON DELETE CASCADE,
  sync_log_id UUID REFERENCES sync_logs(id) ON DELETE SET NULL,
  sync_type TEXT NOT NULL,                       -- 'rate_push', 'availability_push'
  payload JSONB NOT NULL,                        -- the exact payload that failed
  response_payload JSONB,                        -- OTA's error response
  attempts INT DEFAULT 0,
  max_retries INT DEFAULT 5,
  next_retry_at TIMESTAMPTZ DEFAULT now(),
  backoff_seconds INT DEFAULT 5,                 -- doubles each retry: 5 → 10 → 20 → 40 → 80
  status TEXT DEFAULT 'pending',                 -- 'pending', 'retrying', 'succeeded', 'exhausted'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- 6. OTA Bookings (Incoming Reservations)
-- Stores bookings pulled from OTAs via webhooks or polling.
CREATE TABLE IF NOT EXISTS ota_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES booking_channels(id) ON DELETE CASCADE,
  ota_booking_id TEXT NOT NULL,                  -- OTA's own booking reference number
  ota_name TEXT NOT NULL,                        -- 'mmt', 'goibibo', 'booking_com'
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  room_type TEXT NOT NULL,
  room_count INT DEFAULT 1,
  adults INT DEFAULT 1,
  children INT DEFAULT 0,
  total_amount NUMERIC(12,2),
  commission_amount NUMERIC(12,2),
  net_amount NUMERIC(12,2),
  currency TEXT DEFAULT 'INR',
  booking_status TEXT DEFAULT 'confirmed',       -- 'confirmed', 'modified', 'cancelled', 'no_show', 'checked_in', 'checked_out'
  payment_status TEXT DEFAULT 'pending',         -- 'pending', 'paid', 'partial', 'refunded'
  payment_mode TEXT,                             -- 'prepaid', 'pay_at_hotel'
  special_requests TEXT,
  raw_payload JSONB,                             -- store the original OTA response in full
  synced_to_pms BOOLEAN DEFAULT false,           -- whether this has been pushed to your HMS
  pms_reservation_id UUID,                       -- FK to room_reservations if synced
  inventory_decremented BOOLEAN DEFAULT false,   -- whether pool_inventory was updated
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(channel_id, ota_booking_id)
);

-- 7. Channel Rate Rules (Yield Management)
-- Per-channel markup/markdown rules for automated pricing.
CREATE TABLE IF NOT EXISTS channel_rate_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES booking_channels(id) ON DELETE CASCADE,
  rate_plan_id UUID REFERENCES rate_plans(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL,                       -- 'markup', 'markdown', 'fixed_offset', 'round_to', 'commission_offset'
  value NUMERIC NOT NULL,                        -- e.g., 10 means +10% or +₹10
  is_percentage BOOLEAN DEFAULT true,            -- true = percentage, false = fixed amount
  min_price NUMERIC(12,2),                       -- floor price
  max_price NUMERIC(12,2),                       -- ceiling price
  priority INT DEFAULT 0,                        -- higher = applied first
  applies_to_dates DATERANGE,                    -- optional date range
  days_of_week INT[] DEFAULT '{0,1,2,3,4,5,6}', -- 0=Sun, 6=Sat
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Channel Restrictions (Stop-Sell, Min/Max Stay, CTA/CTD)
-- Date-range based restrictions per channel per room type.
CREATE TABLE IF NOT EXISTS channel_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES booking_channels(id) ON DELETE CASCADE, -- NULL = all channels
  room_type TEXT,                                -- NULL = all room types
  restriction_type TEXT NOT NULL,                -- 'stop_sell', 'close_to_arrival', 'close_to_departure', 'min_stay', 'max_stay', 'min_advance', 'max_advance'
  value JSONB NOT NULL DEFAULT '{}',             -- {"closed": true} or {"min_nights": 2}
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Rate Parity Checks
-- Periodic snapshots of rates across channels for parity monitoring.
CREATE TABLE IF NOT EXISTS rate_parity_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  check_date DATE NOT NULL,
  room_type TEXT NOT NULL,
  channel_rates JSONB NOT NULL,                  -- {"mmt": 5000, "goibibo": 4800, "booking_com": 5200}
  base_rate NUMERIC(12,2),                       -- your internal rate for comparison
  parity_status TEXT DEFAULT 'unchecked',        -- 'in_parity', 'out_of_parity', 'unchecked'
  max_deviation_percent NUMERIC(5,2),
  flagged_channels JSONB DEFAULT '[]'::jsonb,    -- channels that deviate
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INDEXES for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ota_credentials_restaurant ON ota_credentials(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_ota_credentials_channel ON ota_credentials(channel_id);

CREATE INDEX IF NOT EXISTS idx_channel_room_mapping_lookup ON channel_room_mapping(restaurant_id, channel_id);

CREATE INDEX IF NOT EXISTS idx_pool_inventory_lookup ON pool_inventory(restaurant_id, room_type, date);

CREATE INDEX IF NOT EXISTS idx_sync_logs_restaurant ON sync_logs(restaurant_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_channel ON sync_logs(channel_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);

CREATE INDEX IF NOT EXISTS idx_sync_retry_queue_pending ON sync_retry_queue(status, next_retry_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_sync_retry_queue_restaurant ON sync_retry_queue(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_ota_bookings_restaurant ON ota_bookings(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ota_bookings_channel ON ota_bookings(channel_id);
CREATE INDEX IF NOT EXISTS idx_ota_bookings_dates ON ota_bookings(check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_ota_bookings_status ON ota_bookings(booking_status);

CREATE INDEX IF NOT EXISTS idx_channel_rate_rules_lookup ON channel_rate_rules(restaurant_id, channel_id, is_active);

CREATE INDEX IF NOT EXISTS idx_channel_restrictions_lookup ON channel_restrictions(restaurant_id, date_from, date_to);

CREATE INDEX IF NOT EXISTS idx_rate_parity_checks_lookup ON rate_parity_checks(restaurant_id, check_date);

-- ============================================================================
-- TRIGGER: Auto-decrement pool inventory on new OTA booking
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_on_new_ota_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- Only decrement if not already done (idempotency guard)
  IF NEW.inventory_decremented = false AND NEW.booking_status = 'confirmed' THEN
    -- Decrement pool inventory for each date in the booking range
    UPDATE pool_inventory 
    SET 
      available_count = GREATEST(available_count - NEW.room_count, 0),
      updated_at = now()
    WHERE restaurant_id = NEW.restaurant_id 
      AND room_type = NEW.room_type
      AND date >= NEW.check_in
      AND date < NEW.check_out;
    
    -- Mark as decremented
    NEW.inventory_decremented := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ota_booking_inventory ON ota_bookings;
CREATE TRIGGER trg_ota_booking_inventory
  BEFORE INSERT ON ota_bookings
  FOR EACH ROW
  EXECUTE FUNCTION fn_on_new_ota_booking();

-- ============================================================================
-- TRIGGER: Re-increment pool on cancellation
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_on_ota_booking_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.booking_status = 'confirmed' AND NEW.booking_status = 'cancelled' AND OLD.inventory_decremented = true THEN
    UPDATE pool_inventory 
    SET 
      available_count = LEAST(available_count + OLD.room_count, total_count),
      updated_at = now()
    WHERE restaurant_id = OLD.restaurant_id 
      AND room_type = OLD.room_type
      AND date >= OLD.check_in
      AND date < OLD.check_out;
    
    NEW.inventory_decremented := false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ota_booking_cancel ON ota_bookings;
CREATE TRIGGER trg_ota_booking_cancel
  BEFORE UPDATE ON ota_bookings
  FOR EACH ROW
  EXECUTE FUNCTION fn_on_ota_booking_cancel();

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_update_cms_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all CMS tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'ota_credentials', 'channel_room_mapping', 'pool_inventory',
    'ota_bookings', 'channel_rate_rules', 'channel_restrictions'
  ])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_%s_updated ON %s;
      CREATE TRIGGER trg_%s_updated
        BEFORE UPDATE ON %s
        FOR EACH ROW
        EXECUTE FUNCTION fn_update_cms_timestamp();
    ', t, t, t, t);
  END LOOP;
END $$;

-- ============================================================================
-- RLS (Row Level Security) Policies
-- ============================================================================

ALTER TABLE ota_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_room_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_retry_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_rate_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_parity_checks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own restaurant's data
-- Using the same pattern as your existing RLS policies
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'ota_credentials', 'channel_room_mapping', 'pool_inventory',
    'sync_logs', 'sync_retry_queue', 'ota_bookings',
    'channel_rate_rules', 'channel_restrictions', 'rate_parity_checks'
  ])
  LOOP
    -- SELECT policy
    EXECUTE format('
      CREATE POLICY %s_select ON %s FOR SELECT
        USING (restaurant_id IN (
          SELECT restaurant_id FROM profiles WHERE id = auth.uid()
        ));
    ', t, t);
    
    -- INSERT policy
    EXECUTE format('
      CREATE POLICY %s_insert ON %s FOR INSERT
        WITH CHECK (restaurant_id IN (
          SELECT restaurant_id FROM profiles WHERE id = auth.uid()
        ));
    ', t, t);
    
    -- UPDATE policy
    EXECUTE format('
      CREATE POLICY %s_update ON %s FOR UPDATE
        USING (restaurant_id IN (
          SELECT restaurant_id FROM profiles WHERE id = auth.uid()
        ));
    ', t, t);
    
    -- DELETE policy
    EXECUTE format('
      CREATE POLICY %s_delete ON %s FOR DELETE
        USING (restaurant_id IN (
          SELECT restaurant_id FROM profiles WHERE id = auth.uid()
        ));
    ', t, t);
  END LOOP;
END $$;

-- ============================================================================
-- Enable Realtime for key tables (live dashboard updates)
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE ota_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE sync_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE pool_inventory;
