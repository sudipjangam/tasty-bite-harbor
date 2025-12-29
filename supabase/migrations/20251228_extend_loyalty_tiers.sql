-- Migration: Extend loyalty_tiers table for full tier customization
-- Run this in your Supabase SQL Editor

-- Add new columns to loyalty_tiers for full tier customization
ALTER TABLE loyalty_tiers
ADD COLUMN IF NOT EXISTS min_spent numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_visits integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS points_multiplier numeric DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS color text DEFAULT 'bg-gray-500';

-- Add comment to explain the columns
COMMENT ON COLUMN loyalty_tiers.min_spent IS 'Minimum amount spent to qualify for this tier';
COMMENT ON COLUMN loyalty_tiers.min_visits IS 'Minimum number of visits to qualify for this tier';
COMMENT ON COLUMN loyalty_tiers.points_multiplier IS 'Points earning multiplier for customers in this tier';
COMMENT ON COLUMN loyalty_tiers.color IS 'Tailwind CSS color class for tier badge display';

-- Insert default tiers if none exist (for restaurants without custom tiers)
-- This is optional - only runs if no tiers exist for the restaurant
INSERT INTO loyalty_tiers (restaurant_id, name, points_required, min_spent, min_visits, points_multiplier, color, benefits, display_order)
SELECT 
  r.id as restaurant_id,
  tier.name,
  tier.points_required,
  tier.min_spent,
  tier.min_visits,
  tier.points_multiplier,
  tier.color,
  tier.benefits,
  tier.display_order
FROM restaurants r
CROSS JOIN (
  VALUES 
    ('None', 0, 0, 0, 1.0, 'bg-gray-500', '["Basic service"]'::jsonb, 0),
    ('Bronze', 100, 1000, 3, 1.0, 'bg-amber-600', '["5% discount on special occasions"]'::jsonb, 1),
    ('Silver', 500, 2500, 5, 1.2, 'bg-gray-400', '["10% discount", "Priority reservations"]'::jsonb, 2),
    ('Gold', 1000, 5000, 8, 1.5, 'bg-yellow-500', '["15% discount", "Priority reservations", "Free appetizer"]'::jsonb, 3),
    ('Platinum', 2500, 10000, 10, 2.0, 'bg-gray-500', '["20% discount", "VIP seating", "Free dessert", "Birthday special"]'::jsonb, 4),
    ('Diamond', 5000, 20000, 15, 2.5, 'bg-purple-600', '["25% discount", "VIP treatment", "Exclusive events", "Personal service"]'::jsonb, 5)
) AS tier(name, points_required, min_spent, min_visits, points_multiplier, color, benefits, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM loyalty_tiers lt WHERE lt.restaurant_id = r.id
);
