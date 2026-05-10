-- Migration: Add Homemade Production Support
-- Created: 2026-05-10
-- Description: Allows inventory items to be created by consuming existing
--              inventory items (raw materials). Tracks production in audit tables.

-- 1. Flag produced items in inventory_items
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS is_produced BOOLEAN DEFAULT false;

-- 2. Production log: one record per production event
CREATE TABLE IF NOT EXISTS homemade_production_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  output_inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  output_quantity NUMERIC NOT NULL,
  output_unit TEXT NOT NULL,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  cost_per_unit NUMERIC NOT NULL DEFAULT 0,
  wastage_quantity NUMERIC DEFAULT 0,
  wastage_unit TEXT,
  notes TEXT,
  produced_at TIMESTAMPTZ DEFAULT now(),
  produced_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Production log items: raw materials consumed per event
CREATE TABLE IF NOT EXISTS homemade_production_log_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_log_id UUID NOT NULL REFERENCES homemade_production_logs(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity_consumed NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  cost_per_unit NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0
);

-- 4. Row Level Security
ALTER TABLE homemade_production_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant_scope_production_logs"
  ON homemade_production_logs
  FOR ALL
  USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  ));

ALTER TABLE homemade_production_log_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "via_production_log_items"
  ON homemade_production_log_items
  FOR ALL
  USING (production_log_id IN (
    SELECT id FROM homemade_production_logs
    WHERE restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- 5. Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_production_logs_restaurant
  ON homemade_production_logs(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_production_logs_output_item
  ON homemade_production_logs(output_inventory_item_id);

CREATE INDEX IF NOT EXISTS idx_production_log_items_log
  ON homemade_production_log_items(production_log_id);

CREATE INDEX IF NOT EXISTS idx_production_log_items_item
  ON homemade_production_log_items(inventory_item_id);

-- Note: Two new transaction_type values are used (no DDL needed, column is text):
--   'production_consumed' — raw material deducted from inventory
--   'production_output'   — homemade item added to inventory
