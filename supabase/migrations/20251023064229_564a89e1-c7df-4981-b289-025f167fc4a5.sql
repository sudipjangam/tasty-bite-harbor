-- Helper function to check if a user has admin/owner permissions
-- Checks both system roles (enum) and custom roles (roles table)
CREATE OR REPLACE FUNCTION public.user_is_admin_or_owner(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  custom_role_name TEXT;
BEGIN
  -- Get the user's system role (enum)
  SELECT role INTO user_role
  FROM profiles
  WHERE id = user_id;

  -- Check if system role is admin or owner
  IF user_role IN ('admin', 'owner') THEN
    RETURN TRUE;
  END IF;

  -- Check custom role from roles table
  SELECT r.name INTO custom_role_name
  FROM profiles p
  JOIN roles r ON p.role_id = r.id
  WHERE p.id = user_id;

  -- Check if custom role is admin or owner
  IF LOWER(custom_role_name) IN ('admin', 'owner') THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Helper function to get user's effective role name
-- Returns custom role name if set, otherwise system role
CREATE OR REPLACE FUNCTION public.get_user_role_name(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  custom_role_name TEXT;
  system_role TEXT;
BEGIN
  -- Try to get custom role first
  SELECT r.name INTO custom_role_name
  FROM profiles p
  JOIN roles r ON p.role_id = r.id
  WHERE p.id = user_id;

  IF custom_role_name IS NOT NULL THEN
    RETURN custom_role_name;
  END IF;

  -- Fall back to system role
  SELECT role INTO system_role
  FROM profiles
  WHERE id = user_id;

  RETURN system_role;
END;
$$;

-- Add comment to role_id column to document usage
COMMENT ON COLUMN public.profiles.role_id IS 
  'Foreign key to custom roles table. When set, this takes precedence over the enum role column. Use this for custom roles created by restaurants.';

COMMENT ON COLUMN public.profiles.role IS 
  'System role enum (owner, admin, manager, etc.). For backward compatibility and system roles only. Custom roles should use role_id instead.';

-- Add index for better performance on role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role_id ON public.profiles(role_id) WHERE role_id IS NOT NULL;