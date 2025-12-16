-- Update has_any_role to check both new role_id and old role column during transition
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First check if user has role_id set (new system)
  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = _user_id
    AND r.name = ANY(_roles)
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Fallback to old role column during transition period
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = _user_id
    AND p.role = ANY(_roles)
  );
END;
$$;