-- Migration: Add branding_config column to restaurant_settings
-- Date: 2026-07-23
-- Purpose: Stores custom UI branding colors per restaurant (white-label theming)
-- TODO: Gate behind Premium subscription when plan upgrades are done

ALTER TABLE restaurant_settings 
ADD COLUMN IF NOT EXISTS branding_config JSONB DEFAULT NULL;

COMMENT ON COLUMN restaurant_settings.branding_config IS 
'Custom branding config: {mode, color1, color2, gradient_direction, font_family, logo_url, advanced_overrides}. See colorUtils.ts for full schema.';

-- Index for fast lookup (branding fetched on every login)
CREATE INDEX IF NOT EXISTS idx_restaurant_settings_branding 
ON restaurant_settings(restaurant_id) 
WHERE branding_config IS NOT NULL;
