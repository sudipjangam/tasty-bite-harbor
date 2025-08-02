-- First, deactivate old plans
UPDATE subscription_plans SET is_active = false WHERE is_active = true;

-- Insert new market-standard plans for Indian market

-- Restaurant-only plans
INSERT INTO subscription_plans (
  id, name, description, price, interval, features, components, is_active, created_at, updated_at
) VALUES 
  (
    gen_random_uuid(),
    'Restaurant Starter',
    'Perfect for small cafés and food stalls',
    1999,
    'monthly',
    '["Menu management", "Order processing", "Basic POS", "Staff management", "Basic reporting", "Up to 2 users"]'::jsonb,
    '["dashboard", "menu", "orders", "staff", "settings"]'::jsonb,
    true,
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'Restaurant Professional',
    'Ideal for full-service restaurants',
    3999,
    'monthly',
    '["Menu management", "Order processing", "Table management", "Kitchen display", "Staff management", "Inventory tracking", "Customer management", "Advanced reporting", "Up to 10 users"]'::jsonb,
    '["dashboard", "menu", "orders", "tables", "kitchen", "staff", "inventory", "customers", "analytics", "settings"]'::jsonb,
    true,
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'Restaurant Enterprise',
    'Complete restaurant management solution',
    7999,
    'monthly',
    '["All Restaurant Pro features", "Multi-location support", "Advanced analytics", "Marketing campaigns", "Loyalty programs", "CRM", "Business dashboard", "Priority support", "Unlimited users"]'::jsonb,
    '["dashboard", "menu", "orders", "tables", "kitchen", "staff", "inventory", "customers", "CRM", "marketing", "analytics", "business_dashboard", "settings"]'::jsonb,
    true,
    now(),
    now()
  );

-- Hotel-only plans
INSERT INTO subscription_plans (
  id, name, description, price, interval, features, components, is_active, created_at, updated_at
) VALUES 
  (
    gen_random_uuid(),
    'Hotel Basic',
    'Essential features for small hotels and guesthouses',
    2999,
    'monthly',
    '["Room management", "Reservation system", "Guest check-in/out", "Basic housekeeping", "Staff management", "Basic reporting", "Up to 5 users"]'::jsonb,
    '["dashboard", "rooms", "housekeeping", "staff", "settings"]'::jsonb,
    true,
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'Hotel Professional',
    'Advanced hotel management for mid-size properties',
    5999,
    'monthly',
    '["All Hotel Basic features", "Channel management", "Revenue management", "Guest profiles", "Maintenance tracking", "Advanced housekeeping", "Financial reporting", "Up to 20 users"]'::jsonb,
    '["dashboard", "rooms", "housekeeping", "guests", "revenue", "staff", "financial", "analytics", "settings"]'::jsonb,
    true,
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'Hotel Enterprise',
    'Complete hotel management solution',
    9999,
    'monthly',
    '["All Hotel Pro features", "Multi-property support", "Advanced revenue management", "Business intelligence", "Guest experience management", "Marketing automation", "Priority support", "Unlimited users"]'::jsonb,
    '["dashboard", "rooms", "housekeeping", "guests", "revenue", "channel-management", "staff", "financial", "marketing", "analytics", "business_dashboard", "settings"]'::jsonb,
    true,
    now(),
    now()
  );

-- All-in-One plans (Restaurant + Hotel)
INSERT INTO subscription_plans (
  id, name, description, price, interval, features, components, is_active, created_at, updated_at
) VALUES 
  (
    gen_random_uuid(),
    'Hospitality Pro',
    'Complete solution for hotels with restaurants',
    8999,
    'monthly',
    '["All restaurant features", "All hotel features", "Integrated F&B management", "Guest dining preferences", "Room service management", "Unified reporting", "Up to 25 users"]'::jsonb,
    '["dashboard", "menu", "orders", "tables", "kitchen", "rooms", "housekeeping", "guests", "staff", "inventory", "customers", "analytics", "settings"]'::jsonb,
    true,
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'Hospitality Enterprise',
    'Ultimate hospitality management platform',
    14999,
    'monthly',
    '["All Hospitality Pro features", "Multi-property support", "Advanced business intelligence", "Revenue optimization", "Marketing automation", "CRM integration", "Channel management", "Priority support", "Custom integrations", "Unlimited users"]'::jsonb,
    '["dashboard", "menu", "orders", "tables", "kitchen", "rooms", "housekeeping", "guests", "revenue", "channel-management", "staff", "inventory", "customers", "CRM", "marketing", "analytics", "business_dashboard", "user-management", "financial", "settings"]'::jsonb,
    true,
    now(),
    now()
  );

-- Annual plans with discount
INSERT INTO subscription_plans (
  id, name, description, price, interval, features, components, is_active, created_at, updated_at
) VALUES 
  (
    gen_random_uuid(),
    'Restaurant Starter Annual',
    'Restaurant Starter plan with 2 months free',
    19990,
    'yearly',
    '["Menu management", "Order processing", "Basic POS", "Staff management", "Basic reporting", "Up to 2 users", "2 months FREE"]'::jsonb,
    '["dashboard", "menu", "orders", "staff", "settings"]'::jsonb,
    true,
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'Restaurant Professional Annual',
    'Restaurant Professional plan with 2 months free',
    39990,
    'yearly',
    '["Menu management", "Order processing", "Table management", "Kitchen display", "Staff management", "Inventory tracking", "Customer management", "Advanced reporting", "Up to 10 users", "2 months FREE"]'::jsonb,
    '["dashboard", "menu", "orders", "tables", "kitchen", "staff", "inventory", "customers", "analytics", "settings"]'::jsonb,
    true,
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'Hotel Professional Annual',
    'Hotel Professional plan with 2 months free',
    59990,
    'yearly',
    '["All Hotel Basic features", "Channel management", "Revenue management", "Guest profiles", "Maintenance tracking", "Advanced housekeeping", "Financial reporting", "Up to 20 users", "2 months FREE"]'::jsonb,
    '["dashboard", "rooms", "housekeeping", "guests", "revenue", "staff", "financial", "analytics", "settings"]'::jsonb,
    true,
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'Hospitality Enterprise Annual',
    'Ultimate hospitality solution with 2 months free',
    149990,
    'yearly',
    '["All features included", "Multi-property support", "Advanced business intelligence", "Revenue optimization", "Marketing automation", "CRM integration", "Channel management", "Priority support", "Custom integrations", "Unlimited users", "2 months FREE"]'::jsonb,
    '["dashboard", "menu", "orders", "tables", "kitchen", "rooms", "housekeeping", "guests", "revenue", "channel-management", "staff", "inventory", "customers", "CRM", "marketing", "analytics", "business_dashboard", "user-management", "financial", "settings"]'::jsonb,
    true,
    now(),
    now()
  );