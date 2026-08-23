-- ==============================================================================
-- MIGRATION: Sync profiles.role → user_roles + Backfill
-- Date: 2026-08-23
-- Description:
--   1. Add trigger: on profiles.role INSERT/UPDATE → upsert into user_roles
--   2. Backfill: insert any profiles rows missing from user_roles
--
-- PURPOSE: profiles.role and user_roles can diverge. The frontend writes
-- profiles.role, but RLS helper functions (user_is_admin_or_owner, has_role)
-- check user_roles. This trigger keeps them in sync automatically.
-- ==============================================================================

BEGIN;

-- ============================================================================
-- 1. TRIGGER FUNCTION: sync profiles.role → user_roles on INSERT/UPDATE
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_profile_role_to_user_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only sync if both role and restaurant_id are set
  IF NEW.role IS NOT NULL AND NEW.restaurant_id IS NOT NULL THEN
    -- Remove old role entry if role changed
    IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
      DELETE FROM public.user_roles
      WHERE user_id = NEW.id
        AND role = OLD.role
        AND restaurant_id = OLD.restaurant_id;
    END IF;

    -- Upsert new role
    INSERT INTO public.user_roles (user_id, role, restaurant_id)
    VALUES (NEW.id, NEW.role, NEW.restaurant_id)
    ON CONFLICT (user_id, role, restaurant_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. CREATE TRIGGER on profiles
-- ============================================================================
DROP TRIGGER IF EXISTS trg_sync_profile_role ON public.profiles;

CREATE TRIGGER trg_sync_profile_role
  AFTER INSERT OR UPDATE OF role, restaurant_id
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_role_to_user_roles();

-- ============================================================================
-- 3. BACKFILL: insert profiles rows that are missing from user_roles
-- ============================================================================
INSERT INTO public.user_roles (user_id, role, restaurant_id)
SELECT p.id, p.role, p.restaurant_id
FROM public.profiles p
WHERE p.role IS NOT NULL
  AND p.restaurant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.id
      AND ur.role = p.role
      AND ur.restaurant_id = p.restaurant_id
  )
ON CONFLICT (user_id, role, restaurant_id) DO NOTHING;

-- ============================================================================
-- VERIFICATION:
--
-- 1. Check all profiles have matching user_roles:
--    SELECT p.id, p.role, p.restaurant_id
--    FROM profiles p
--    WHERE p.role IS NOT NULL AND p.restaurant_id IS NOT NULL
--    AND NOT EXISTS (
--      SELECT 1 FROM user_roles ur
--      WHERE ur.user_id = p.id AND ur.role = p.role
--    );
--    → Should return 0 rows
--
-- 2. Test trigger: update a profile's role and verify user_roles updates:
--    UPDATE profiles SET role = 'manager' WHERE id = '<test_user_id>';
--    SELECT * FROM user_roles WHERE user_id = '<test_user_id>';
--    → Should show new 'manager' row
-- ============================================================================

COMMIT;
