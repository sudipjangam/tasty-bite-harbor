-- =============================================
-- FRANCHISE PHASE 2 MIGRATION 3: Shared Customer Database + Chain-Wide Loyalty
-- Adds organization_id to customers + loyalty tables
-- Backfills existing data
-- Adds dedup function for merging duplicate customers by phone within an org
-- =============================================

BEGIN;

-- ─── 1. Add organization_id to customers ────────────────────────────────────
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Backfill: link existing customers to their restaurant's org
UPDATE customers c
SET organization_id = r.organization_id
FROM restaurants r
WHERE c.restaurant_id = r.id
  AND r.organization_id IS NOT NULL
  AND c.organization_id IS NULL;

-- Index for fast org-scoped lookup
CREATE INDEX IF NOT EXISTS idx_customers_org
  ON customers(organization_id)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_org_phone
  ON customers(organization_id, phone)
  WHERE organization_id IS NOT NULL AND phone IS NOT NULL;

-- ─── 2. Add organization_id to loyalty tables ────────────────────────────────
ALTER TABLE loyalty_programs
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE loyalty_transactions
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE loyalty_enrollments
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Backfill loyalty tables
UPDATE loyalty_programs lp
SET organization_id = r.organization_id
FROM restaurants r
WHERE lp.restaurant_id = r.id
  AND r.organization_id IS NOT NULL
  AND lp.organization_id IS NULL;

UPDATE loyalty_transactions lt
SET organization_id = r.organization_id
FROM restaurants r
WHERE lt.restaurant_id = r.id
  AND r.organization_id IS NOT NULL
  AND lt.organization_id IS NULL;

UPDATE loyalty_enrollments le
SET organization_id = r.organization_id
FROM restaurants r
WHERE le.restaurant_id = r.id
  AND r.organization_id IS NOT NULL
  AND le.organization_id IS NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_org
  ON loyalty_transactions(organization_id)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_loyalty_enrollments_org
  ON loyalty_enrollments(organization_id)
  WHERE organization_id IS NOT NULL;

-- ─── 3. Customer dedup function ─────────────────────────────────────────────
-- Merges duplicate customers (same phone, same org) into a single record
-- Consolidates: total_spent, visit_count, loyalty_points
-- Re-points all FK references to the kept record
-- Returns: number of records merged (deleted)
CREATE OR REPLACE FUNCTION dedup_org_customers(p_org_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_merged INTEGER := 0;
  v_rec RECORD;
  v_keep_id UUID;
BEGIN
  FOR v_rec IN
    SELECT
      phone,
      MIN(id) AS keep_id,
      ARRAY_AGG(id ORDER BY created_at ASC) AS all_ids,
      COUNT(*) AS dup_count
    FROM customers
    WHERE organization_id = p_org_id
      AND phone IS NOT NULL
      AND phone <> ''
    GROUP BY phone
    HAVING COUNT(*) > 1
  LOOP
    v_keep_id := v_rec.keep_id;

    -- Consolidate totals into the kept record
    UPDATE customers
    SET
      total_spent  = (
        SELECT COALESCE(SUM(total_spent), 0)
        FROM customers
        WHERE id = ANY(v_rec.all_ids)
      ),
      visit_count  = (
        SELECT COALESCE(SUM(visit_count), 0)
        FROM customers
        WHERE id = ANY(v_rec.all_ids)
      ),
      loyalty_points = (
        SELECT COALESCE(SUM(loyalty_points), 0)
        FROM customers
        WHERE id = ANY(v_rec.all_ids)
      )
    WHERE id = v_keep_id;

    -- Re-point all FKs from duplicate records to keep_id
    UPDATE loyalty_transactions
      SET customer_id = v_keep_id
      WHERE customer_id = ANY(v_rec.all_ids) AND customer_id <> v_keep_id;

    UPDATE loyalty_enrollments
      SET customer_id = v_keep_id
      WHERE customer_id = ANY(v_rec.all_ids) AND customer_id <> v_keep_id;

    UPDATE loyalty_redemptions
      SET customer_id = v_keep_id
      WHERE customer_id = ANY(v_rec.all_ids) AND customer_id <> v_keep_id;

    UPDATE customer_activities
      SET customer_id = v_keep_id
      WHERE customer_id = ANY(v_rec.all_ids) AND customer_id <> v_keep_id;

    UPDATE customer_notes
      SET customer_id = v_keep_id
      WHERE customer_id = ANY(v_rec.all_ids) AND customer_id <> v_keep_id;

    UPDATE whatsapp_campaign_sends
      SET customer_id = v_keep_id
      WHERE customer_id = ANY(v_rec.all_ids) AND customer_id <> v_keep_id;

    -- Delete duplicate records (all except keep_id)
    DELETE FROM customers
    WHERE id = ANY(v_rec.all_ids)
      AND id <> v_keep_id;

    v_merged := v_merged + (v_rec.dup_count - 1);
  END LOOP;

  RETURN v_merged;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 4. RPC: get org-level customer summary ─────────────────────────────────
-- Used by CrossBranchCustomers.tsx to show consolidated customer view
CREATE OR REPLACE FUNCTION get_org_customers(p_org_id UUID)
RETURNS TABLE (
  customer_id    UUID,
  name           TEXT,
  phone          TEXT,
  total_spent    NUMERIC,
  visit_count    INTEGER,
  loyalty_points INTEGER,
  branches_visited TEXT[]
) AS $$
  SELECT
    c.id                                                AS customer_id,
    c.name,
    c.phone,
    COALESCE(c.total_spent, 0)                         AS total_spent,
    COALESCE(c.visit_count, 0)                         AS visit_count,
    COALESCE(c.loyalty_points, 0)                      AS loyalty_points,
    ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) AS branches_visited
  FROM customers c
  LEFT JOIN orders o   ON o.customer_name = c.name AND o.restaurant_id = c.restaurant_id
  LEFT JOIN restaurants r ON r.id = o.restaurant_id
  WHERE c.organization_id = p_org_id
  GROUP BY c.id, c.name, c.phone, c.total_spent, c.visit_count, c.loyalty_points
  ORDER BY c.total_spent DESC NULLS LAST;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMIT;
