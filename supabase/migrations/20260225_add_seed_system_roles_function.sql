-- Function to seed system roles for a new restaurant
-- Called from Platform Admin when creating a new restaurant
CREATE OR REPLACE FUNCTION seed_system_roles(p_restaurant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_def RECORD;
BEGIN
  -- System role definitions
  FOR role_def IN
    SELECT * FROM (VALUES
      ('Owner',   'Restaurant owner with full control',                    true,  true),
      ('Admin',   'Full system access (superuser)',                        true,  true),
      ('Manager', 'All operations except financial reports',               true,  false),
      ('Chef',    'Kitchen, orders, inventory, and menu management',       true,  false),
      ('Waiter',  'Orders, POS, tables, reservations',                     true,  false),
      ('Staff',   'Basic operational access',                              true,  false),
      ('Viewer',  'Dashboard view only (restricted)',                      true,  false)
    ) AS t(name, description, is_system, has_full_access)
  LOOP
    -- Insert only if this role doesn't already exist for this restaurant
    INSERT INTO roles (name, description, is_system, has_full_access, is_deletable, restaurant_id)
    SELECT role_def.name, role_def.description, role_def.is_system, role_def.has_full_access, 
           NOT role_def.is_system, p_restaurant_id
    WHERE NOT EXISTS (
      SELECT 1 FROM roles 
      WHERE restaurant_id = p_restaurant_id 
        AND lower(name) = lower(role_def.name)
        AND is_system = true
    );
  END LOOP;
END;
$$;

-- Grant execute to authenticated users (Platform Admin will call this)
GRANT EXECUTE ON FUNCTION seed_system_roles(uuid) TO authenticated;
