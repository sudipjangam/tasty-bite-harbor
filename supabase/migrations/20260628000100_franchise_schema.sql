-- =============================================
-- FRANCHISE SCHEMA: New Tables + Column Extensions
-- =============================================

BEGIN;

-- 1. Organizations table
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

-- 2. Organization members (franchise-level roles)
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  accessible_branches UUID[] DEFAULT NULL,  -- NULL = ALL branches
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- 3. Organization subscriptions
CREATE TABLE IF NOT EXISTS organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_type TEXT DEFAULT 'starter' CHECK (plan_type IN ('free', 'starter', 'pro', 'enterprise')),
  base_price NUMERIC(10,2) DEFAULT 0,
  per_branch_price NUMERIC(10,2) DEFAULT 0,
  max_branches INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'trial', 'expired')),
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Extend restaurants table (3 nullable columns)
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS branch_code TEXT DEFAULT 'HQ',
  ADD COLUMN IF NOT EXISTS is_headquarters BOOLEAN DEFAULT false;

-- 5. Extend menu_items for franchise menu sync (3 nullable columns)
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'branch' CHECK (origin IN ('master', 'branch', 'inherited')),
  ADD COLUMN IF NOT EXISTS source_item_id UUID REFERENCES menu_items(id);

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_subs_org ON organization_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_org ON restaurants(organization_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_org ON menu_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_source ON menu_items(source_item_id);

COMMIT;
