-- Fix 1: Enable RLS on monthly_budgets table
ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their restaurant's monthly budgets"
ON public.monthly_budgets
FOR ALL
USING (restaurant_id IN (
  SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
));

-- Fix 2: Create separate user_roles table to prevent privilege escalation
-- Note: user_role enum already exists, so we'll use it
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role user_role NOT NULL,
    restaurant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (user_id, role, restaurant_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles safely
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to check if user has any of multiple roles  
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles user_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

-- RLS policy for user_roles table
CREATE POLICY "Users can view roles in their restaurant"
ON public.user_roles
FOR SELECT
USING (restaurant_id IN (
  SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Admins and owners can manage roles"
ON public.user_roles
FOR ALL
USING (
  restaurant_id IN (
    SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
  )
  AND public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role])
);

-- Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role, restaurant_id)
SELECT 
  id,
  role,
  restaurant_id
FROM public.profiles
WHERE role IS NOT NULL AND restaurant_id IS NOT NULL
ON CONFLICT (user_id, role, restaurant_id) DO NOTHING;

-- Fix 3: Add RLS policies to booking_channels to protect API keys
CREATE POLICY "Only admins and owners can view booking channels"
ON public.booking_channels
FOR SELECT
USING (
  restaurant_id IN (
    SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
  )
  AND public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role])
);

CREATE POLICY "Only admins and owners can manage booking channels"
ON public.booking_channels
FOR ALL
USING (
  restaurant_id IN (
    SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
  )
  AND public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role])
);