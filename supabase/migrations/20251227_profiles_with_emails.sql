-- Create a function to get profiles with emails for platform admin
-- This function joins profiles with auth.users to get email addresses

CREATE OR REPLACE FUNCTION public.get_profiles_with_emails()
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text,
  role public.user_role,
  phone text,
  restaurant_id uuid,
  restaurant_name text,
  role_id uuid,
  role_name_text text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow platform admins to call this function
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Only platform admins can view all users.';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    u.email,
    p.role,
    NULL::text as phone,
    p.restaurant_id,
    r.name as restaurant_name,
    p.role_id,
    p.role_name_text,
    p.created_at,
    p.updated_at
  FROM profiles p
  LEFT JOIN auth.users u ON p.id = u.id
  LEFT JOIN restaurants r ON p.restaurant_id = r.id
  ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_profiles_with_emails() TO authenticated;
