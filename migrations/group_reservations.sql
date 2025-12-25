-- Group Reservations Database Migration
-- Run this in Supabase SQL Editor to enable group booking functionality

-- =====================================================
-- STEP 1: Add group fields to reservations table
-- =====================================================

-- Add group_id column to link reservations together
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS group_id UUID;

-- Add group_name for display purposes
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS group_name TEXT;

-- Add is_master_folio to identify the primary bill holder
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS is_master_folio BOOLEAN DEFAULT FALSE;

-- Create index for efficient group queries
CREATE INDEX IF NOT EXISTS idx_reservations_group_id ON reservations(group_id);

-- =====================================================
-- STEP 2: Verify the changes
-- =====================================================

-- Run this to verify columns were added:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'reservations' 
-- AND column_name IN ('group_id', 'group_name', 'is_master_folio');

-- =====================================================
-- OPTIONAL: Create reservation_groups table for advanced management
-- (Only needed if you want separate group metadata storage)
-- =====================================================

/*
CREATE TABLE IF NOT EXISTS reservation_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  group_name TEXT NOT NULL,
  organizer_name TEXT NOT NULL,
  organizer_phone TEXT,
  organizer_email TEXT,
  company_name TEXT,
  total_rooms INTEGER DEFAULT 0,
  check_in_date DATE,
  check_out_date DATE,
  status TEXT DEFAULT 'confirmed',
  billing_type TEXT DEFAULT 'individual',
  master_reservation_id UUID REFERENCES reservations(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for reservation_groups
ALTER TABLE reservation_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view groups for their restaurant"
  ON reservation_groups FOR SELECT
  USING (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage groups for their restaurant"
  ON reservation_groups FOR ALL
  USING (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));
*/

-- =====================================================
-- SUCCESS! Group Reservations is now enabled.
-- =====================================================
