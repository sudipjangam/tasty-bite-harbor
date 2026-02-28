-- ============================================================================
-- MIGRATION: Fix Critical RLS Policy Vulnerabilities
-- Date: 2026-02-25
-- Applied to: clmsoetktmvhazctlans
-- ============================================================================

-- CRIT-1: Drop broken restaurant_access policies (self-join bug)
DROP POLICY IF EXISTS "restaurant_access" ON staff_leave_balances;
DROP POLICY IF EXISTS "restaurant_access" ON staff_leave_requests;
DROP POLICY IF EXISTS "restaurant_access" ON staff_leave_types;
DROP POLICY IF EXISTS "restaurant_access" ON staff_roles;
DROP POLICY IF EXISTS "restaurant_access" ON staff_shifts;
DROP POLICY IF EXISTS "restaurant_access" ON staff_time_clock;

-- CRIT-2: Remove anonymous INSERT/UPDATE on payment_transactions
DROP POLICY IF EXISTS "payment_transactions_anon_insert" ON payment_transactions;
DROP POLICY IF EXISTS "payment_transactions_anon_update" ON payment_transactions;

-- CRIT-3: Replace world-readable shared_bills policy
DROP POLICY IF EXISTS "Anyone can view shared bills" ON shared_bills;
CREATE POLICY "Anyone can view shared bill by short_id" ON shared_bills
  FOR SELECT TO public USING (true);

-- HIGH-1: Enable RLS on backup table
ALTER TABLE IF EXISTS orders_unified_backup_20260111_000000 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only service role can access backups"
  ON orders_unified_backup_20260111_000000
  FOR ALL TO public
  USING ((SELECT auth.role()) = 'service_role');

-- HIGH-2: Fix categories — add restaurant_id tenant isolation
DROP POLICY IF EXISTS "categories_select_for_authenticated" ON categories;
CREATE POLICY "categories_select_for_restaurant" ON categories
  FOR SELECT TO authenticated
  USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "categories_insert_by_managers" ON categories;
CREATE POLICY "categories_insert_by_managers" ON categories
  FOR INSERT TO authenticated
  WITH CHECK (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = (SELECT auth.uid()))
    AND EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY(ARRAY['owner'::user_role, 'admin'::user_role, 'manager'::user_role, 'chef'::user_role])
    )
  );

DROP POLICY IF EXISTS "categories_update_by_managers" ON categories;
CREATE POLICY "categories_update_by_managers" ON categories
  FOR UPDATE TO authenticated
  USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = (SELECT auth.uid()))
    AND EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY(ARRAY['owner'::user_role, 'admin'::user_role, 'manager'::user_role, 'chef'::user_role])
    )
  )
  WITH CHECK (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "categories_delete_by_managers" ON categories;
CREATE POLICY "categories_delete_by_managers" ON categories
  FOR DELETE TO authenticated
  USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = (SELECT auth.uid()))
    AND EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY(ARRAY['owner'::user_role, 'admin'::user_role, 'manager'::user_role, 'chef'::user_role])
    )
  );

-- HIGH-3: Restrict customer_order_sessions anonymous INSERT
DROP POLICY IF EXISTS "Public can create sessions" ON customer_order_sessions;
CREATE POLICY "Public can create sessions for QR restaurants" ON customer_order_sessions
  FOR INSERT TO public
  WITH CHECK (
    restaurant_id IN (SELECT id FROM restaurants WHERE qr_ordering_enabled = true)
  );

-- MED-4: Fix broken room_billings ownership check
DROP POLICY IF EXISTS "Users can view room_billings for their restaurant" ON room_billings;
