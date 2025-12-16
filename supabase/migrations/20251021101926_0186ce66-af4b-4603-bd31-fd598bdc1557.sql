-- Phase 1: Create new dynamic role management system

-- 1. Create roles table
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  is_deletable BOOLEAN DEFAULT true,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(name, restaurant_id)
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view roles for their restaurant"
  ON public.roles FOR SELECT
  USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins and owners can manage roles"
  ON public.roles FOR ALL
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid()
    )
    AND has_any_role(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role])
  );

-- 2. Create app_components table (master list of all modules)
CREATE TABLE public.app_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.app_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view components"
  ON public.app_components FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only system admins can manage components"
  ON public.app_components FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role]));

-- 3. Create role_components junction table
CREATE TABLE public.role_components (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES public.app_components(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (role_id, component_id)
);

ALTER TABLE public.role_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view role components for their restaurant"
  ON public.role_components FOR SELECT
  USING (
    role_id IN (
      SELECT id FROM roles WHERE restaurant_id IN (
        SELECT restaurant_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins and owners can manage role components"
  ON public.role_components FOR ALL
  USING (
    role_id IN (
      SELECT id FROM roles WHERE restaurant_id IN (
        SELECT restaurant_id FROM profiles WHERE id = auth.uid()
      )
      AND has_any_role(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role])
    )
  );

-- 4. Add role_id to profiles (keep old role column for backward compatibility during migration)
ALTER TABLE public.profiles ADD COLUMN role_id UUID REFERENCES public.roles(id);

-- 5. Seed app_components with all application modules
INSERT INTO public.app_components (name, description) VALUES
  ('Dashboard', 'Main dashboard with stats and overview'),
  ('POS', 'Point of Sale system'),
  ('QSR POS', 'Quick Service Restaurant POS'),
  ('Orders', 'Order management'),
  ('Kitchen', 'Kitchen display system'),
  ('Menu', 'Menu management'),
  ('Inventory', 'Inventory tracking'),
  ('Staff', 'Staff management'),
  ('Customers', 'Customer relationship management'),
  ('CRM', 'Advanced CRM features'),
  ('Tables', 'Table management'),
  ('Reservations', 'Reservation system'),
  ('Rooms', 'Room management'),
  ('Housekeeping', 'Housekeeping operations'),
  ('Channel Management', 'Revenue channel management'),
  ('Marketing', 'Marketing campaigns'),
  ('Reports', 'Reporting and analytics'),
  ('Analytics', 'Advanced analytics'),
  ('Financial', 'Financial management'),
  ('Expenses', 'Expense tracking'),
  ('Settings', 'System settings'),
  ('Security', 'Security settings'),
  ('User Management', 'User administration'),
  ('Role Management', 'Role and permissions management'),
  ('Recipes', 'Recipe management'),
  ('Suppliers', 'Supplier management'),
  ('AI Assistant', 'AI-powered assistant');

-- 6. Create helper function to get user's accessible components
CREATE OR REPLACE FUNCTION public.get_user_components(user_id UUID)
RETURNS TABLE (component_name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ac.name
  FROM app_components ac
  INNER JOIN role_components rc ON ac.id = rc.component_id
  INNER JOIN roles r ON rc.role_id = r.id
  INNER JOIN profiles p ON r.id = p.role_id
  WHERE p.id = user_id;
$$;

-- 7. Create trigger to update roles updated_at
CREATE OR REPLACE FUNCTION public.update_roles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_roles_timestamp
  BEFORE UPDATE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_roles_updated_at();