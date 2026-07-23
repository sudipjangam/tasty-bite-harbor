-- ============================================================================
-- FRANCHISE PHASE 3 MIGRATION: Live Approvals & Discount Requests Table
-- ============================================================================

BEGIN;

-- 1. Create approval_requests table
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('discount', 'price_override', 'menu_item_add')),
  payload JSONB NOT NULL DEFAULT '{}',
  bm_comment TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  resolver_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- 2. Indexes for fast queues
CREATE INDEX IF NOT EXISTS idx_approvals_org ON approval_requests(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_approvals_restaurant ON approval_requests(restaurant_id);

-- 3. RLS Security
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view requests they raised" ON approval_requests
  FOR SELECT TO authenticated
  USING (
    requester_id = auth.uid()
    OR restaurant_id = ANY(get_user_accessible_restaurants(auth.uid()))
  );

CREATE POLICY "Branch managers can insert approval requests" ON approval_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    restaurant_id = ANY(get_user_accessible_restaurants(auth.uid()))
  );

CREATE POLICY "Owners and RMs can decide approvals" ON approval_requests
  FOR UPDATE TO authenticated
  USING (
    restaurant_id = ANY(get_user_accessible_restaurants(auth.uid()))
  )
  WITH CHECK (
    restaurant_id = ANY(get_user_accessible_restaurants(auth.uid()))
  );

COMMIT;
