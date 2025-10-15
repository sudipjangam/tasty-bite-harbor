-- Update subscription plans to include new restaurant operation components

-- Restaurant Plans: Add recipes and reservations to Professional and Enterprise
UPDATE subscription_plans 
SET components = components || '["recipes", "reservations"]'::jsonb
WHERE name IN (
  'Restaurant Professional', 
  'Restaurant Professional Annual',
  'Restaurant Enterprise',
  'Restaurant Enterprise Annual'
) AND is_active = true;

-- Hotel Plans: Add recipes to Professional and Enterprise
UPDATE subscription_plans 
SET components = components || '["recipes"]'::jsonb
WHERE name IN (
  'Hotel Professional',
  'Hotel Professional Annual', 
  'Hotel Enterprise',
  'Hotel Enterprise Annual'
) AND is_active = true;

-- Hospitality Plans: Add recipes and reservations (if not already there)
UPDATE subscription_plans 
SET components = components || '["recipes", "reservations"]'::jsonb
WHERE name IN (
  'Hospitality Pro',
  'Hospitality Enterprise',
  'Hospitality Enterprise Annual'
) AND is_active = true;