-- =====================================================
-- PHASE 3: LOST & FOUND - DATABASE MIGRATION
-- (Housekeeping and Maintenance already exist!)
-- Run this in Supabase SQL Editor
-- =====================================================

-- LOST & FOUND ITEMS (NEW TABLE)
CREATE TABLE IF NOT EXISTS lost_found_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- electronics, clothing, documents, jewelry, bags, keys, other
  found_location TEXT, -- Room 101, Lobby, Restaurant, Pool
  room_id UUID REFERENCES rooms(id),
  found_date DATE NOT NULL,
  found_by UUID REFERENCES profiles(id),
  storage_location TEXT, -- Front Desk Safe, Storage Room A
  status TEXT DEFAULT 'stored', -- stored, claimed, disposed, transferred
  guest_name TEXT,
  guest_phone TEXT,
  claimed_date DATE,
  claimed_by TEXT,
  notes TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lostfound_status ON lost_found_items(status);
CREATE INDEX IF NOT EXISTS idx_lostfound_date ON lost_found_items(found_date);

-- RLS
ALTER TABLE lost_found_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View lost_found for restaurant" ON lost_found_items FOR SELECT
  USING (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Insert lost_found for restaurant" ON lost_found_items FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Update lost_found for restaurant" ON lost_found_items FOR UPDATE
  USING (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Delete lost_found for restaurant" ON lost_found_items FOR DELETE
  USING (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));
