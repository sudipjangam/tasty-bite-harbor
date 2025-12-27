-- Seed 7 predefined system roles for all restaurants
-- This ensures every restaurant has the standard roles: Owner, Admin, Manager, Chef, Waiter, Staff, Viewer

-- First, add a unique constraint on (name, restaurant_id) if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'roles_name_restaurant_unique'
  ) THEN
    ALTER TABLE public.roles 
    ADD CONSTRAINT roles_name_restaurant_unique 
    UNIQUE (name, restaurant_id);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- Constraint already exists
END $$;

-- Seed predefined roles for all restaurants
DO $$
DECLARE
  r_id UUID;
BEGIN
  FOR r_id IN SELECT DISTINCT restaurant_id FROM public.profiles WHERE restaurant_id IS NOT NULL
  LOOP
    -- Insert Owner role (if not exists)
    INSERT INTO public.roles (name, description, restaurant_id, is_deletable, is_system, has_full_access)
    VALUES ('Owner', 'Restaurant owner with full control', r_id, false, true, true)
    ON CONFLICT (name, restaurant_id) DO UPDATE SET 
      is_system = true, 
      has_full_access = true, 
      is_deletable = false,
      description = EXCLUDED.description;
    
    -- Insert Admin role (if not exists)
    INSERT INTO public.roles (name, description, restaurant_id, is_deletable, is_system, has_full_access)
    VALUES ('Admin', 'Full system access (superuser)', r_id, false, true, true)
    ON CONFLICT (name, restaurant_id) DO UPDATE SET 
      is_system = true, 
      has_full_access = true, 
      is_deletable = false,
      description = EXCLUDED.description;
    
    -- Insert Manager role (if not exists)
    INSERT INTO public.roles (name, description, restaurant_id, is_deletable, is_system, has_full_access)
    VALUES ('Manager', 'All operations except financial reports', r_id, false, true, false)
    ON CONFLICT (name, restaurant_id) DO UPDATE SET 
      is_system = true, 
      is_deletable = false,
      description = EXCLUDED.description;
    
    -- Insert Chef role (if not exists)
    INSERT INTO public.roles (name, description, restaurant_id, is_deletable, is_system, has_full_access)
    VALUES ('Chef', 'Kitchen, orders, inventory, and menu management', r_id, false, true, false)
    ON CONFLICT (name, restaurant_id) DO UPDATE SET 
      is_system = true, 
      is_deletable = false,
      description = EXCLUDED.description;
    
    -- Insert Waiter role (if not exists)
    INSERT INTO public.roles (name, description, restaurant_id, is_deletable, is_system, has_full_access)
    VALUES ('Waiter', 'Orders, POS, tables, reservations', r_id, false, true, false)
    ON CONFLICT (name, restaurant_id) DO UPDATE SET 
      is_system = true, 
      is_deletable = false,
      description = EXCLUDED.description;
    
    -- Insert Staff role - check if exists first to avoid conflict with custom Staff roles
    IF NOT EXISTS (SELECT 1 FROM public.roles WHERE LOWER(name) = 'staff' AND restaurant_id = r_id AND is_system = true) THEN
      INSERT INTO public.roles (name, description, restaurant_id, is_deletable, is_system, has_full_access)
      VALUES ('Staff', 'Basic operational access', r_id, false, true, false)
      ON CONFLICT (name, restaurant_id) DO UPDATE SET 
        is_system = true, 
        is_deletable = false;
    END IF;
    
    -- Insert Viewer role (if not exists)
    INSERT INTO public.roles (name, description, restaurant_id, is_deletable, is_system, has_full_access)
    VALUES ('Viewer', 'Dashboard view only (restricted)', r_id, false, true, false)
    ON CONFLICT (name, restaurant_id) DO UPDATE SET 
      is_system = true, 
      is_deletable = false,
      description = EXCLUDED.description;
    
    RAISE NOTICE 'Created/updated predefined roles for restaurant: %', r_id;
  END LOOP;
END $$;

-- Create a function to automatically seed default roles when a new restaurant is created
CREATE OR REPLACE FUNCTION public.seed_default_roles_for_restaurant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Only seed if restaurant_id is not null and not already seeded
  IF NEW.restaurant_id IS NOT NULL THEN
    -- Check if roles already exist for this restaurant
    IF NOT EXISTS (SELECT 1 FROM public.roles WHERE restaurant_id = NEW.restaurant_id AND is_system = true LIMIT 1) THEN
      INSERT INTO public.roles (name, description, restaurant_id, is_deletable, is_system, has_full_access)
      VALUES 
        ('Owner', 'Restaurant owner with full control', NEW.restaurant_id, false, true, true),
        ('Admin', 'Full system access (superuser)', NEW.restaurant_id, false, true, true),
        ('Manager', 'All operations except financial reports', NEW.restaurant_id, false, true, false),
        ('Chef', 'Kitchen, orders, inventory, and menu management', NEW.restaurant_id, false, true, false),
        ('Waiter', 'Orders, POS, tables, reservations', NEW.restaurant_id, false, true, false),
        ('Staff', 'Basic operational access', NEW.restaurant_id, false, true, false),
        ('Viewer', 'Dashboard view only (restricted)', NEW.restaurant_id, false, true, false)
      ON CONFLICT (name, restaurant_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to auto-seed roles when first user is added to a restaurant
DROP TRIGGER IF EXISTS seed_roles_on_profile_insert ON public.profiles;
CREATE TRIGGER seed_roles_on_profile_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_default_roles_for_restaurant();

-- Also create trigger for when restaurant_id is updated on a profile
DROP TRIGGER IF EXISTS seed_roles_on_profile_update ON public.profiles;
CREATE TRIGGER seed_roles_on_profile_update
  AFTER UPDATE OF restaurant_id ON public.profiles
  FOR EACH ROW
  WHEN (OLD.restaurant_id IS DISTINCT FROM NEW.restaurant_id AND NEW.restaurant_id IS NOT NULL)
  EXECUTE FUNCTION public.seed_default_roles_for_restaurant();
