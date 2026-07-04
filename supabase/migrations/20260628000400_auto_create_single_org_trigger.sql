-- =============================================
-- TRIGGER: Auto-create organization for single/standalone restaurants
-- Description: Ensures any restaurant created without an organization_id
--              automatically gets a 'single' type organization and starter subscription.
-- =============================================

BEGIN;

CREATE OR REPLACE FUNCTION trg_fn_auto_create_single_organization()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Only execute if organization_id is NULL
  IF NEW.organization_id IS NULL THEN
    -- 1. Create a 'single' type organization named after the restaurant
    INSERT INTO organizations (name, type, menu_mode)
    VALUES (NEW.name, 'single', 'independent')
    RETURNING id INTO v_org_id;

    -- 2. Create the organization subscription
    INSERT INTO organization_subscriptions (organization_id, plan_type, max_branches)
    VALUES (v_org_id, 'starter', 1);

    -- 3. Link the restaurant to the new organization and mark it as headquarters
    NEW.organization_id := v_org_id;
    NEW.is_headquarters := true;
    NEW.branch_code := 'HQ';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_auto_create_single_organization ON restaurants;
CREATE TRIGGER trg_auto_create_single_organization
  BEFORE INSERT ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_auto_create_single_organization();

COMMIT;
