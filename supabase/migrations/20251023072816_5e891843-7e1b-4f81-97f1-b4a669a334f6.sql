-- Update get_user_components to handle both custom roles and system role enum
CREATE OR REPLACE FUNCTION public.get_user_components(user_id uuid)
RETURNS TABLE(component_name text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- First, try to get components from custom role (role_id)
  IF EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND role_id IS NOT NULL) THEN
    RETURN QUERY
    SELECT DISTINCT ac.name
    FROM app_components ac
    INNER JOIN role_components rc ON ac.id = rc.component_id
    INNER JOIN roles r ON rc.role_id = r.id
    INNER JOIN profiles p ON r.id = p.role_id
    WHERE p.id = user_id;
  ELSE
    -- Fallback to system role enum
    -- Get components based on the system role from profiles.role column
    RETURN QUERY
    SELECT DISTINCT ac.name
    FROM app_components ac
    INNER JOIN role_components rc ON ac.id = rc.component_id
    INNER JOIN roles r ON rc.role_id = r.id
    INNER JOIN profiles p ON LOWER(r.name) = LOWER(p.role::text)
    WHERE p.id = user_id
    AND p.role_id IS NULL;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_user_components(uuid) IS 'Returns accessible components for a user, checking custom role_id first, then falling back to system role enum';
