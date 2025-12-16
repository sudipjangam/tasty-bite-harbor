-- Fix: Create default roles for restaurant 978363fe-e1ba-4e66-980d-5d6b99199fb7
INSERT INTO public.roles (name, description, restaurant_id, is_deletable)
VALUES 
  ('Owner', 'Full system access and control', '978363fe-e1ba-4e66-980d-5d6b99199fb7', false),
  ('admin', 'Administrative access to all features', '978363fe-e1ba-4e66-980d-5d6b99199fb7', false),
  ('manager', 'Manager access', '978363fe-e1ba-4e66-980d-5d6b99199fb7', true),
  ('staff', 'Operational access only', '978363fe-e1ba-4e66-980d-5d6b99199fb7', true),
  ('chef', 'Kitchen access', '978363fe-e1ba-4e66-980d-5d6b99199fb7', true)
ON CONFLICT DO NOTHING;

-- Update user profile to owner role (so they can manage roles)
UPDATE public.profiles 
SET role = 'owner', role_id = NULL
WHERE id = '6a1a5703-999f-45b7-a7bd-ff7ff12ba11d';