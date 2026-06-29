-- =============================================
-- DATA MIGRATION: Auto-create orgs for existing restaurants
-- Wrapped in transaction — all or nothing
-- =============================================

BEGIN;

-- Step 1: Create a single-type org for each existing restaurant
DO $$
DECLARE
  r RECORD;
  v_org_id UUID;
  v_owner_id UUID;
BEGIN
  FOR r IN SELECT id, name FROM restaurants WHERE organization_id IS NULL
  LOOP
    -- Generate org
    v_org_id := gen_random_uuid();

    INSERT INTO organizations (id, name, type, menu_mode)
    VALUES (v_org_id, r.name, 'single', 'independent');

    -- Link restaurant to org
    UPDATE restaurants SET
      organization_id = v_org_id,
      is_headquarters = true,
      branch_code = 'HQ'
    WHERE id = r.id;

    -- Find owner/admin for this restaurant
    SELECT p.id INTO v_owner_id
    FROM profiles p
    WHERE p.restaurant_id = r.id
      AND p.role IN ('admin', 'owner')
    LIMIT 1;

    -- Create org membership if owner found
    IF v_owner_id IS NOT NULL THEN
      UPDATE organizations SET owner_user_id = v_owner_id WHERE id = v_org_id;

      INSERT INTO organization_members (organization_id, user_id, role)
      VALUES (v_org_id, v_owner_id, 'owner')
      ON CONFLICT (organization_id, user_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

COMMIT;
