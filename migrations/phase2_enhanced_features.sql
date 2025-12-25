-- =====================================================
-- PHASE 2 ENHANCED FEATURES - DATABASE MIGRATION
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. VIP/LOYALTY TIERS
-- =====================================================

-- Add tier to reservations
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS guest_tier TEXT DEFAULT 'regular';

-- Guest loyalty tracking table
CREATE TABLE IF NOT EXISTS guest_loyalty (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  guest_phone TEXT NOT NULL,
  guest_name TEXT,
  guest_email TEXT,
  tier TEXT DEFAULT 'regular', -- regular, silver, gold, platinum
  total_stays INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  last_stay_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, guest_phone)
);

-- =====================================================
-- 2. GUEST PREFERENCES
-- =====================================================

CREATE TABLE IF NOT EXISTS guest_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  guest_phone TEXT NOT NULL,
  preference_type TEXT NOT NULL, -- room_type, floor, amenities, dietary, special
  preference_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, guest_phone, preference_type, preference_value)
);

-- =====================================================
-- 3. CORPORATE RESERVATIONS
-- =====================================================

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS is_corporate BOOLEAN DEFAULT FALSE;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS corporate_rate DECIMAL(10,2);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS billing_address TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS company_gst TEXT;

-- =====================================================
-- 4. WAITLIST MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS room_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  preferred_room_type TEXT,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  guests_count INTEGER DEFAULT 1,
  status TEXT DEFAULT 'waiting', -- waiting, notified, converted, cancelled
  notes TEXT,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_guest_loyalty_phone ON guest_loyalty(guest_phone);
CREATE INDEX IF NOT EXISTS idx_guest_preferences_phone ON guest_preferences(guest_phone);
CREATE INDEX IF NOT EXISTS idx_room_waitlist_dates ON room_waitlist(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_room_waitlist_status ON room_waitlist(status);

-- =====================================================
-- 6. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE guest_loyalty ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_waitlist ENABLE ROW LEVEL SECURITY;

-- Guest Loyalty policies
CREATE POLICY "Users can view guest_loyalty for their restaurant"
  ON guest_loyalty FOR SELECT
  USING (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert guest_loyalty for their restaurant"
  ON guest_loyalty FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update guest_loyalty for their restaurant"
  ON guest_loyalty FOR UPDATE
  USING (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete guest_loyalty for their restaurant"
  ON guest_loyalty FOR DELETE
  USING (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

-- Guest Preferences policies
CREATE POLICY "Users can view guest_preferences for their restaurant"
  ON guest_preferences FOR SELECT
  USING (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert guest_preferences for their restaurant"
  ON guest_preferences FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update guest_preferences for their restaurant"
  ON guest_preferences FOR UPDATE
  USING (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete guest_preferences for their restaurant"
  ON guest_preferences FOR DELETE
  USING (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

-- Room Waitlist policies
CREATE POLICY "Users can view room_waitlist for their restaurant"
  ON room_waitlist FOR SELECT
  USING (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert room_waitlist for their restaurant"
  ON room_waitlist FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update room_waitlist for their restaurant"
  ON room_waitlist FOR UPDATE
  USING (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete room_waitlist for their restaurant"
  ON room_waitlist FOR DELETE
  USING (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

-- =====================================================
-- DONE! All Phase 2 database changes applied.
-- =====================================================
