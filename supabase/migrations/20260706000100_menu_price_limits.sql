-- =============================================
-- FRANCHISE PHASE 2 MIGRATION 1: Menu Price Limits
-- Adds min/max price override columns to menu_items
-- and a trigger to validate branch prices stay within limits
-- =============================================

BEGIN;

-- 1. Add price limit columns to menu_items
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS min_price_override NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS max_price_override NUMERIC(10,2);

-- 2. Constraint: min must be <= max when both are set
ALTER TABLE menu_items
  DROP CONSTRAINT IF EXISTS chk_price_override_range;

ALTER TABLE menu_items
  ADD CONSTRAINT chk_price_override_range
  CHECK (
    min_price_override IS NULL
    OR max_price_override IS NULL
    OR min_price_override <= max_price_override
  );

-- 3. Validation trigger function
CREATE OR REPLACE FUNCTION validate_menu_price_limits()
RETURNS TRIGGER AS $$
DECLARE
  v_min NUMERIC(10,2);
  v_max NUMERIC(10,2);
BEGIN
  -- Only validate inherited (branch copy) items
  IF NEW.source_item_id IS NOT NULL AND NEW.origin = 'inherited' THEN
    SELECT min_price_override, max_price_override
    INTO v_min, v_max
    FROM menu_items
    WHERE id = NEW.source_item_id;

    IF v_min IS NOT NULL AND NEW.price < v_min THEN
      RAISE EXCEPTION 'Price ₹% is below the minimum allowed ₹% for this item', NEW.price, v_min;
    END IF;

    IF v_max IS NOT NULL AND NEW.price > v_max THEN
      RAISE EXCEPTION 'Price ₹% exceeds the maximum allowed ₹% for this item', NEW.price, v_max;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Attach trigger
DROP TRIGGER IF EXISTS trg_validate_menu_price ON menu_items;

CREATE TRIGGER trg_validate_menu_price
  BEFORE INSERT OR UPDATE OF price ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_menu_price_limits();

-- 5. Index for fast lookup of source items
CREATE INDEX IF NOT EXISTS idx_menu_items_source_price
  ON menu_items(source_item_id)
  WHERE source_item_id IS NOT NULL;

COMMIT;
