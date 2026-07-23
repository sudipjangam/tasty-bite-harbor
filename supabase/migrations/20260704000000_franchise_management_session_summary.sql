-- =============================================
-- FRANCHISE MANAGEMENT: Session Summary Migration
-- Date: 2026-07-04
-- Covers: All franchise DB changes applied in this session
-- Status: Already applied to DEV (tnzfcugvgeelkxnzhnnn)
--         Apply to PROD manually via SQL Editor or supabase db push
-- =============================================

-- ─────────────────────────────────────────────
-- FILE 1: 20260628000100_franchise_schema.sql
-- New tables: organizations, organization_members, organization_subscriptions
-- New columns on restaurants: organization_id, branch_code, is_headquarters
-- New columns on menu_items: organization_id, origin, source_item_id
-- ─────────────────────────────────────────────

BEGIN;

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  type TEXT DEFAULT 'single' CHECK (type IN ('single', 'franchise', 'chain')),
  owner_user_id UUID REFERENCES auth.users(id),
  menu_mode TEXT DEFAULT 'independent' CHECK (menu_mode IN ('independent', 'shared', 'master')),
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  accessible_branches UUID[] DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_type TEXT DEFAULT 'starter' CHECK (plan_type IN ('free', 'starter', 'growth', 'professional', 'pro', 'enterprise')),
  base_price NUMERIC(10,2) DEFAULT 0,
  per_branch_price NUMERIC(10,2) DEFAULT 0,
  max_branches INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'trial', 'expired')),
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS branch_code TEXT DEFAULT 'HQ',
  ADD COLUMN IF NOT EXISTS is_headquarters BOOLEAN DEFAULT false;

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'branch' CHECK (origin IN ('master', 'branch', 'inherited')),
  ADD COLUMN IF NOT EXISTS source_item_id UUID REFERENCES menu_items(id);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_subs_org ON organization_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_org ON restaurants(organization_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_org ON menu_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_source ON menu_items(source_item_id);

COMMIT;

-- ─────────────────────────────────────────────
-- FILE 2: 20260628000200_franchise_data_migration.sql
-- Backfills existing single restaurants with auto-generated organizations
-- ─────────────────────────────────────────────

BEGIN;

DO $$
DECLARE
  r RECORD;
  v_org_id UUID;
BEGIN
  FOR r IN SELECT id, name FROM restaurants WHERE organization_id IS NULL LOOP
    INSERT INTO organizations (name, type, menu_mode)
    VALUES (r.name, 'single', 'independent')
    RETURNING id INTO v_org_id;

    INSERT INTO organization_subscriptions (organization_id, plan_type, max_branches)
    VALUES (v_org_id, 'starter', 1);

    UPDATE restaurants
    SET
      organization_id = v_org_id,
      branch_code = 'HQ',
      is_headquarters = true
    WHERE id = r.id;
  END LOOP;
END $$;

COMMIT;

-- ─────────────────────────────────────────────
-- FILE 3: 20260628000300_franchise_rls_functions.sql
-- RPC: get_user_accessible_restaurants (with org fallback for single users)
-- RPC: create_franchise_organization (atomic: org + HQ branch + subscription)
-- RLS policies on organizations, organization_members, organization_subscriptions
-- ─────────────────────────────────────────────

BEGIN;

-- Helper RPC: returns all restaurant IDs accessible to a user
-- Checks org membership first; falls back to profile.restaurant_id for single users
CREATE OR REPLACE FUNCTION get_user_accessible_restaurants(p_user_id UUID)
RETURNS UUID[] AS $$
DECLARE
  v_org_ids UUID[];
  v_restaurant_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(organization_id) INTO v_org_ids
  FROM organization_members
  WHERE user_id = p_user_id;

  IF v_org_ids IS NOT NULL AND array_length(v_org_ids, 1) > 0 THEN
    SELECT ARRAY_AGG(id) INTO v_restaurant_ids
    FROM restaurants
    WHERE organization_id = ANY(v_org_ids);
    RETURN COALESCE(v_restaurant_ids, '{}');
  ELSE
    -- Fallback for single-restaurant users (no org member record)
    RETURN ARRAY[(SELECT restaurant_id FROM profiles WHERE id = p_user_id)];
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Atomic franchise creation RPC
-- Creates: organization + HQ restaurant + subscription in one transaction
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
  INSERT INTO organizations (name, type, menu_mode)
  VALUES (p_org_name, p_org_type, p_menu_mode)
  RETURNING id INTO v_org_id;

  INSERT INTO restaurants (name, organization_id, branch_code, is_headquarters)
  VALUES (COALESCE(p_hq_name, p_org_name || ' HQ'), v_org_id, p_hq_branch_code, true)
  RETURNING id INTO v_restaurant_id;

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

-- Security definer functions to bypass RLS recursion on organization_members
CREATE OR REPLACE FUNCTION check_user_is_org_admin_or_owner(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_org_id 
      AND user_id = p_user_id 
      AND role IN ('owner', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_user_is_org_member(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_org_id 
      AND user_id = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- RLS: organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_select" ON organizations;
CREATE POLICY "org_select" ON organizations FOR SELECT TO authenticated
  USING (
    check_user_is_org_member(id, auth.uid())
    OR is_platform_admin()
  );

DROP POLICY IF EXISTS "org_insert" ON organizations;
CREATE POLICY "org_insert" ON organizations FOR INSERT TO authenticated
  WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS "org_update" ON organizations;
CREATE POLICY "org_update" ON organizations FOR UPDATE TO authenticated
  USING (
    owner_user_id = auth.uid() OR is_platform_admin()
  );

-- RLS: organization_members
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orgmem_select" ON organization_members;
CREATE POLICY "orgmem_select" ON organization_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR check_user_is_org_admin_or_owner(organization_id, auth.uid())
    OR is_platform_admin()
  );

DROP POLICY IF EXISTS "orgmem_manage" ON organization_members;
CREATE POLICY "orgmem_manage" ON organization_members FOR ALL TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- RLS: organization_subscriptions
ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orgsub_select" ON organization_subscriptions;
CREATE POLICY "orgsub_select" ON organization_subscriptions FOR SELECT TO authenticated
  USING (
    check_user_is_org_member(organization_id, auth.uid())
    OR is_platform_admin()
  );

DROP POLICY IF EXISTS "orgsub_manage" ON organization_subscriptions;
CREATE POLICY "orgsub_manage" ON organization_subscriptions FOR ALL TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

COMMIT;

-- ─────────────────────────────────────────────
-- FILE 4: 20260628000400_auto_create_single_org_trigger.sql
-- Trigger: auto-creates a 'single' organization when a restaurant is inserted
--          without an organization_id (single/standalone restaurants)
-- ─────────────────────────────────────────────

BEGIN;

CREATE OR REPLACE FUNCTION trg_fn_auto_create_single_organization()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
BEGIN
  IF NEW.organization_id IS NULL THEN
    INSERT INTO organizations (name, type, menu_mode)
    VALUES (NEW.name, 'single', 'independent')
    RETURNING id INTO v_org_id;

    INSERT INTO organization_subscriptions (organization_id, plan_type, max_branches)
    VALUES (v_org_id, 'starter', 1);

    NEW.organization_id := v_org_id;
    NEW.is_headquarters := true;
    NEW.branch_code := 'HQ';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_create_single_organization ON restaurants;
CREATE TRIGGER trg_auto_create_single_organization
  BEFORE INSERT ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_auto_create_single_organization();

COMMIT;

-- ─────────────────────────────────────────────
-- NOTES
-- ─────────────────────────────────────────────
-- This file is a CONSOLIDATED REFERENCE of all 4 franchise migration files.
-- To apply to PRODUCTION, run each numbered section in order via Supabase SQL Editor
-- OR use: npx supabase db push (requires CLI linked to prod project)
--
-- The user-management edge function is already deployed and handles:
--   - create_user: Creates auth user + profile (used by franchise owner + staff creation)
--   - update_user, delete_user, reset_password, list_users
-- No edge function changes were needed for franchise onboarding.
