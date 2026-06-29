-- =============================================
-- ROLLBACK: Franchise Migration
-- Removes ALL franchise changes
-- Safe: only drops what was added
-- Execution time: <5 seconds
-- =============================================

BEGIN;

-- Step 1: Clear data from modified columns
UPDATE restaurants SET
  organization_id = NULL,
  branch_code = NULL,
  is_headquarters = NULL;

UPDATE menu_items SET
  organization_id = NULL,
  origin = NULL,
  source_item_id = NULL;

-- Step 2: Drop franchise RLS on restaurants
DROP POLICY IF EXISTS "Franchise owner can view branches" ON restaurants;
DROP POLICY IF EXISTS "Franchise owner can update branches" ON restaurants;

-- Step 3: Drop RLS on new tables
DROP POLICY IF EXISTS "org_select" ON organizations;
DROP POLICY IF EXISTS "org_insert" ON organizations;
DROP POLICY IF EXISTS "org_update" ON organizations;
DROP POLICY IF EXISTS "orgmem_select" ON organization_members;
DROP POLICY IF EXISTS "orgmem_manage" ON organization_members;
DROP POLICY IF EXISTS "orgsub_select" ON organization_subscriptions;
DROP POLICY IF EXISTS "orgsub_manage" ON organization_subscriptions;

-- Step 4: Drop indexes
DROP INDEX IF EXISTS idx_org_members_user;
DROP INDEX IF EXISTS idx_org_members_org;
DROP INDEX IF EXISTS idx_org_subs_org;
DROP INDEX IF EXISTS idx_restaurants_org;
DROP INDEX IF EXISTS idx_menu_items_org;
DROP INDEX IF EXISTS idx_menu_items_source;

-- Step 5: Drop functions
DROP FUNCTION IF EXISTS get_user_accessible_restaurants(UUID);
DROP FUNCTION IF EXISTS create_franchise_organization(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER);

-- Step 6: Drop new tables (order matters for FK deps)
DROP TABLE IF EXISTS organization_subscriptions;
DROP TABLE IF EXISTS organization_members;
DROP TABLE IF EXISTS organizations;

-- Step 7: Remove columns from existing tables
ALTER TABLE restaurants
  DROP COLUMN IF EXISTS organization_id,
  DROP COLUMN IF EXISTS branch_code,
  DROP COLUMN IF EXISTS is_headquarters;

ALTER TABLE menu_items
  DROP COLUMN IF EXISTS organization_id,
  DROP COLUMN IF EXISTS origin,
  DROP COLUMN IF EXISTS source_item_id;

COMMIT;
