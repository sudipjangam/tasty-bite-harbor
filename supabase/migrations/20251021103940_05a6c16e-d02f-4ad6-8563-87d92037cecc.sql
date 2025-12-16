-- Seed default roles for each restaurant
DO $$
DECLARE
  rest_id UUID;
  owner_role_id UUID;
  admin_role_id UUID;
  staff_role_id UUID;
BEGIN
  -- For each restaurant, create default roles
  FOR rest_id IN SELECT DISTINCT restaurant_id FROM profiles WHERE restaurant_id IS NOT NULL
  LOOP
    -- Create Owner role
    INSERT INTO public.roles (name, description, restaurant_id, is_deletable)
    VALUES ('Owner', 'Full system access and control', rest_id, false)
    ON CONFLICT DO NOTHING
    RETURNING id INTO owner_role_id;

    -- Create Admin role
    INSERT INTO public.roles (name, description, restaurant_id, is_deletable)
    VALUES ('Admin', 'Administrative access to all features', rest_id, false)
    ON CONFLICT DO NOTHING
    RETURNING id INTO admin_role_id;

    -- Create Staff role
    INSERT INTO public.roles (name, description, restaurant_id, is_deletable)
    VALUES ('Staff', 'Operational access only (POS, Orders, Kitchen, etc.)', rest_id, true)
    ON CONFLICT DO NOTHING
    RETURNING id INTO staff_role_id;

    -- Assign ALL components to Owner role
    IF owner_role_id IS NOT NULL THEN
      INSERT INTO public.role_components (role_id, component_id)
      SELECT owner_role_id, id FROM public.app_components
      ON CONFLICT DO NOTHING;
    END IF;

    -- Assign ALL components to Admin role
    IF admin_role_id IS NOT NULL THEN
      INSERT INTO public.role_components (role_id, component_id)
      SELECT admin_role_id, id FROM public.app_components
      ON CONFLICT DO NOTHING;
    END IF;

    -- Assign ONLY operational components to Staff role
    IF staff_role_id IS NOT NULL THEN
      INSERT INTO public.role_components (role_id, component_id)
      SELECT staff_role_id, id FROM public.app_components
      WHERE name IN ('POS', 'Orders', 'Kitchen', 'Recipes', 'Menu', 'Tables', 'Inventory', 'QSR POS')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- Update existing admin/owner users to use the new role system
DO $$
DECLARE
  rest_id UUID;
  owner_role_id UUID;
  admin_role_id UUID;
BEGIN
  FOR rest_id IN SELECT DISTINCT restaurant_id FROM profiles WHERE restaurant_id IS NOT NULL
  LOOP
    -- Get owner role id for this restaurant
    SELECT id INTO owner_role_id FROM public.roles 
    WHERE restaurant_id = rest_id AND name = 'Owner' LIMIT 1;

    -- Get admin role id for this restaurant
    SELECT id INTO admin_role_id FROM public.roles 
    WHERE restaurant_id = rest_id AND name = 'Admin' LIMIT 1;

    -- Update profiles with role='owner' to use owner_role_id
    IF owner_role_id IS NOT NULL THEN
      UPDATE public.profiles
      SET role_id = owner_role_id
      WHERE restaurant_id = rest_id AND role = 'owner' AND role_id IS NULL;
    END IF;

    -- Update profiles with role='admin' to use admin_role_id
    IF admin_role_id IS NOT NULL THEN
      UPDATE public.profiles
      SET role_id = admin_role_id
      WHERE restaurant_id = rest_id AND role = 'admin' AND role_id IS NULL;
    END IF;
  END LOOP;
END $$;