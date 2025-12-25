-- =====================================================
-- PHASE 4: ADVANCED HOTEL OPERATIONS - DATABASE MIGRATION
-- Run this in Supabase SQL Editor
-- =====================================================

-- NIGHT AUDIT LOGS
CREATE TABLE IF NOT EXISTS night_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  audit_date DATE NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed
  total_revenue DECIMAL(12,2) DEFAULT 0,
  room_revenue DECIMAL(12,2) DEFAULT 0,
  food_revenue DECIMAL(12,2) DEFAULT 0,
  other_revenue DECIMAL(12,2) DEFAULT 0,
  rooms_charged INTEGER DEFAULT 0,
  total_check_ins INTEGER DEFAULT 0,
  total_check_outs INTEGER DEFAULT 0,
  discrepancies JSONB DEFAULT '[]',
  notes TEXT,
  performed_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, audit_date)
);

-- ROOM MOVES/TRANSFERS
CREATE TABLE IF NOT EXISTS room_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  check_in_id UUID REFERENCES check_ins(id),
  from_room_id UUID REFERENCES rooms(id),
  to_room_id UUID REFERENCES rooms(id),
  move_date TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT, -- upgrade, maintenance, guest_request, other
  rate_adjustment DECIMAL(10,2) DEFAULT 0,
  is_complimentary BOOLEAN DEFAULT false,
  notes TEXT,
  performed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SPLIT BILLING
CREATE TABLE IF NOT EXISTS split_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  check_in_id UUID REFERENCES check_ins(id),
  original_amount DECIMAL(12,2) NOT NULL,
  split_method TEXT DEFAULT 'percentage', -- percentage, items, equal
  num_portions INTEGER DEFAULT 2,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS split_bill_portions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_bill_id UUID REFERENCES split_bills(id) ON DELETE CASCADE,
  payer_name TEXT NOT NULL,
  payer_phone TEXT,
  payer_email TEXT,
  amount DECIMAL(12,2) NOT NULL,
  percentage DECIMAL(5,2),
  payment_status TEXT DEFAULT 'pending', -- pending, paid, partial
  payment_method TEXT,
  items JSONB, -- for item-based splits
  invoice_number TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_night_audit_date ON night_audit_logs(audit_date);
CREATE INDEX IF NOT EXISTS idx_night_audit_restaurant ON night_audit_logs(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_room_moves_checkin ON room_moves(check_in_id);
CREATE INDEX IF NOT EXISTS idx_room_moves_date ON room_moves(move_date);
CREATE INDEX IF NOT EXISTS idx_split_bills_checkin ON split_bills(check_in_id);

-- RLS Policies
ALTER TABLE night_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE split_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE split_bill_portions ENABLE ROW LEVEL SECURITY;

-- Night Audit Policies
CREATE POLICY "View night_audit for restaurant" ON night_audit_logs FOR SELECT
  USING (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Insert night_audit for restaurant" ON night_audit_logs FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Update night_audit for restaurant" ON night_audit_logs FOR UPDATE
  USING (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

-- Room Moves Policies
CREATE POLICY "View room_moves for restaurant" ON room_moves FOR SELECT
  USING (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Insert room_moves for restaurant" ON room_moves FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

-- Split Bills Policies
CREATE POLICY "View split_bills for restaurant" ON split_bills FOR SELECT
  USING (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Insert split_bills for restaurant" ON split_bills FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "View split_bill_portions" ON split_bill_portions FOR SELECT
  USING (split_bill_id IN (SELECT id FROM split_bills WHERE restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Insert split_bill_portions" ON split_bill_portions FOR INSERT
  WITH CHECK (split_bill_id IN (SELECT id FROM split_bills WHERE restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Update split_bill_portions" ON split_bill_portions FOR UPDATE
  USING (split_bill_id IN (SELECT id FROM split_bills WHERE restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())));
