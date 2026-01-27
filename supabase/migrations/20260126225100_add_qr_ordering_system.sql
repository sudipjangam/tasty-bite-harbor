-- QR Ordering System Database Schema
-- Migration: Add QR code support for tables and rooms with payment-first ordering

-- Unified QR Code Management (supports both tables and rooms)
CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('table', 'room')),
  entity_id UUID NOT NULL,
  qr_code_data TEXT NOT NULL,
  qr_code_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(entity_type, entity_id)
);

-- Customer Order Sessions (cart management + payment tracking)
CREATE TABLE IF NOT EXISTS customer_order_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id UUID REFERENCES qr_codes(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('table', 'room')),
  entity_id UUID NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  cart_items JSONB DEFAULT '[]',
  customer_name TEXT,
  customer_phone TEXT,
  special_instructions TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed')),
  payment_intent_id TEXT,
  payment_amount NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '2 hours'
);

-- Add QR ordering configuration to restaurants
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS qr_ordering_enabled BOOLEAN DEFAULT false;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS qr_service_charge_percent NUMERIC(5,2) DEFAULT 0;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS qr_payment_required BOOLEAN DEFAULT true;

-- Add QR order tracking to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_qr_order BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qr_session_id UUID REFERENCES customer_order_sessions(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_qr_codes_entity ON qr_codes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_restaurant ON qr_codes(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_active ON qr_codes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_customer_sessions_entity ON customer_order_sessions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_payment ON customer_order_sessions(payment_status);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_token ON customer_order_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_orders_qr_session ON orders(qr_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_is_qr ON orders(is_qr_order) WHERE is_qr_order = true;

-- Enable RLS (Row Level Security)
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_order_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for qr_codes
-- Allow authenticated users to read QR codes for their restaurant
CREATE POLICY "Users can view their restaurant's QR codes"
  ON qr_codes FOR SELECT
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Allow authenticated users to insert/update/delete QR codes for their restaurant
CREATE POLICY "Users can manage their restaurant's QR codes"
  ON qr_codes FOR ALL
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for customer_order_sessions
-- Allow public read access for active sessions (customers need this)
CREATE POLICY "Public can view active sessions"
  ON customer_order_sessions FOR SELECT
  USING (expires_at > NOW());

-- Allow public insert for new sessions (customers creating carts)
CREATE POLICY "Public can create sessions"
  ON customer_order_sessions FOR INSERT
  WITH CHECK (true);

-- Allow public update for their own sessions
CREATE POLICY "Public can update sessions"
  ON customer_order_sessions FOR UPDATE
  USING (expires_at > NOW());

-- Allow restaurant staff to view all sessions
CREATE POLICY "Staff can view all sessions"
  ON customer_order_sessions FOR SELECT
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Add comments for documentation
COMMENT ON TABLE qr_codes IS 'Stores QR codes for tables and rooms, enabling contactless ordering';
COMMENT ON TABLE customer_order_sessions IS 'Manages customer cart sessions and payment tracking for QR orders';
COMMENT ON COLUMN qr_codes.entity_type IS 'Type of entity: table or room';
COMMENT ON COLUMN qr_codes.entity_id IS 'References restaurant_tables.id or restaurant_rooms.id';
COMMENT ON COLUMN customer_order_sessions.payment_status IS 'Payment status: pending, processing, completed, or failed';
COMMENT ON COLUMN customer_order_sessions.payment_intent_id IS 'External payment gateway reference ID';
