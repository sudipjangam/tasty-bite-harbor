-- Phase 2 GST Schema Updates
-- Migration: Add GST-specific fields to invoices and invoice_line_items

-- =====================================================
-- 1. INVOICES TABLE: Add GST fields
-- =====================================================

-- Customer GSTIN for B2B invoices (15 characters)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_gstin VARCHAR(15);

-- Place of supply (state code + state name)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS place_of_supply VARCHAR(50);

-- B2B flag - automatically set when GSTIN is provided
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_b2b BOOLEAN DEFAULT false;

-- Comment for documentation
COMMENT ON COLUMN invoices.customer_gstin IS 'Customer GST Identification Number for B2B transactions';
COMMENT ON COLUMN invoices.place_of_supply IS 'State where supply is made (e.g., "27-Maharashtra")';
COMMENT ON COLUMN invoices.is_b2b IS 'True if customer has GSTIN (B2B), false for B2C';

-- =====================================================
-- 2. INVOICE_LINE_ITEMS TABLE: Add GST breakdown
-- =====================================================

-- HSN/SAC code for the item (4-8 digits)
ALTER TABLE invoice_line_items ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(8);

-- CGST amount (Central GST)
ALTER TABLE invoice_line_items ADD COLUMN IF NOT EXISTS cgst_amount DECIMAL(10,2) DEFAULT 0;

-- SGST amount (State GST)
ALTER TABLE invoice_line_items ADD COLUMN IF NOT EXISTS sgst_amount DECIMAL(10,2) DEFAULT 0;

-- IGST amount (Integrated GST - for inter-state)
ALTER TABLE invoice_line_items ADD COLUMN IF NOT EXISTS igst_amount DECIMAL(10,2) DEFAULT 0;

-- Comments for documentation
COMMENT ON COLUMN invoice_line_items.hsn_code IS 'HSN/SAC code for GST classification';
COMMENT ON COLUMN invoice_line_items.cgst_amount IS 'Central GST amount (intra-state)';
COMMENT ON COLUMN invoice_line_items.sgst_amount IS 'State GST amount (intra-state)';
COMMENT ON COLUMN invoice_line_items.igst_amount IS 'Integrated GST amount (inter-state)';

-- =====================================================
-- 3. Create index for faster GST queries
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_invoices_customer_gstin ON invoices(customer_gstin) WHERE customer_gstin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_is_b2b ON invoices(is_b2b) WHERE is_b2b = true;
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_hsn ON invoice_line_items(hsn_code) WHERE hsn_code IS NOT NULL;

-- =====================================================
-- 4. Add trigger to auto-set is_b2b when GSTIN is provided
-- =====================================================

CREATE OR REPLACE FUNCTION update_is_b2b()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_gstin IS NOT NULL AND NEW.customer_gstin != '' THEN
    NEW.is_b2b := true;
  ELSE
    NEW.is_b2b := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_is_b2b ON invoices;
CREATE TRIGGER trigger_update_is_b2b
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_is_b2b();

-- =====================================================
-- 5. Backfill existing invoices (set is_b2b based on existing GSTIN)
-- =====================================================

UPDATE invoices 
SET is_b2b = (customer_gstin IS NOT NULL AND customer_gstin != '')
WHERE is_b2b IS NULL OR is_b2b != (customer_gstin IS NOT NULL AND customer_gstin != '');
