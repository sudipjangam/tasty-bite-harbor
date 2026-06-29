-- =============================================
-- FRANCHISE: RLS Policies + Helper Functions
-- =============================================

BEGIN;

-- ========================
-- HELPER FUNCTION: Get all restaurants a user can access
-- Returns: UUID array of restaurant IDs
-- Used by: franchise-aware RLS policies
-- ========================
CREATE OR REPLACE FUNCTION get_user_accessible_restaurants(p_user_id UUID)
RETURNS UUID[] AS $$
  SELECT COALESCE(
    (SELECT CASE
      WHEN om.accessible_branches IS NOT NULL THEN om.accessible_branches
      ELSE ARRAY_AGG(r.id)
    END
    FROM organization_members om
    JOIN restaurants r ON r.organization_id = om.organization_id
    WHERE om.user_id = p_user_id
    GROUP BY om.accessible_branches),
    ARRAY[(SELECT restaurant_id FROM profiles WHERE id = p_user_id)]
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ========================
-- RPC: Atomic franchise creation
-- Creates: organization + HQ restaurant + subscription in one call
-- ========================
CREATE OR REPLACE FUNCTION create_franchise_organization(
  p_org_name TEXT,
  p_org_type TEXT DEFAULT 'franchise',
  p_menu_mode TEXT DEFAULT 'independent',
  p_hq_name TEXT DEFAULT NULL,
  p_hq_branch_code TEXT DEFAULT 'HQ',
  p_plan_type TEXT DEFAULT 'starter',
  p_max_branches INTEGER DEFAULT 5
) RETURNS JSONB AS $$
DECLARE
  v_org_id UUID;
  v_restaurant_id UUID;
  v_sub_id UUID;
BEGIN
  -- Create organization
  INSERT INTO organizations (name, type, menu_mode)
  VALUES (p_org_name, p_org_type, p_menu_mode)
  RETURNING id INTO v_org_id;

  -- Create HQ restaurant
  INSERT INTO restaurants (name, organization_id, branch_code, is_headquarters)
  VALUES (COALESCE(p_hq_name, p_org_name || ' HQ'), v_org_id, p_hq_branch_code, true)
  RETURNING id INTO v_restaurant_id;

  -- Create subscription
  INSERT INTO organization_subscriptions (organization_id, plan_type, max_branches)
  VALUES (v_org_id, p_plan_type, p_max_branches)
  RETURNING id INTO v_sub_id;

  RETURN jsonb_build_object(
    'organization_id', v_org_id,
    'restaurant_id', v_restaurant_id,
    'subscription_id', v_sub_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================
-- RLS: organizations
-- ========================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_select" ON organizations FOR SELECT TO authenticated
  USING (
    id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
    OR is_platform_admin()
  );

CREATE POLICY "org_insert" ON organizations FOR INSERT TO authenticated
  WITH CHECK (is_platform_admin());

CREATE POLICY "org_update" ON organizations FOR UPDATE TO authenticated
  USING (
    owner_user_id = auth.uid() OR is_platform_admin()
  );

-- ========================
-- RLS: organization_members
-- ========================
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orgmem_select" ON organization_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR is_platform_admin()
  );

CREATE POLICY "orgmem_manage" ON organization_members FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR is_platform_admin()
  );

-- ========================
-- RLS: organization_subscriptions
-- ========================
ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orgsub_select" ON organization_subscriptions FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
    OR is_platform_admin()
  );

CREATE POLICY "orgsub_manage" ON organization_subscriptions FOR ALL TO authenticated
  USING (is_platform_admin());

-- ========================
-- CRITICAL: Extend existing restaurants RLS for franchise owners
-- Without this, franchise owners can only see their profiles.restaurant_id
-- ========================
CREATE POLICY "Franchise owner can view branches" ON restaurants
  FOR SELECT TO authenticated
  USING (
    id = ANY(get_user_accessible_restaurants(auth.uid()))
  );

CREATE POLICY "Franchise owner can update branches" ON restaurants
  FOR UPDATE TO authenticated
  USING (
    id = ANY(get_user_accessible_restaurants(auth.uid()))
  );

COMMIT;
