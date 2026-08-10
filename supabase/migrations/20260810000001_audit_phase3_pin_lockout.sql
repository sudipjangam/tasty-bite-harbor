-- ============================================================
-- Phase 3.1: Kitchen PIN Lockout Rate Limiting
-- Adds failed attempt tracking and lockout mechanism to prevent brute-forcing
-- ============================================================

ALTER TABLE public.restaurant_settings 
ADD COLUMN IF NOT EXISTS pin_failed_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pin_lockout_until TIMESTAMP WITH TIME ZONE;

-- Create or update the RPC to include rate-limiting logic
CREATE OR REPLACE FUNCTION public.verify_kitchen_pin(p_restaurant_id UUID, p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings RECORD;
BEGIN
  -- 1. Fetch current settings for the restaurant
  SELECT kitchen_pin, pin_failed_attempts, pin_lockout_until 
  INTO v_settings
  FROM public.restaurant_settings
  WHERE restaurant_id = p_restaurant_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- 2. Check if currently locked out
  IF v_settings.pin_lockout_until IS NOT NULL AND v_settings.pin_lockout_until > NOW() THEN
    RAISE EXCEPTION 'LOCKED_OUT';
  END IF;

  -- 3. Verify PIN
  IF v_settings.kitchen_pin = p_pin THEN
    -- Success: reset counters
    UPDATE public.restaurant_settings
    SET pin_failed_attempts = 0,
        pin_lockout_until = NULL
    WHERE restaurant_id = p_restaurant_id;
    
    RETURN TRUE;
  ELSE
    -- Failure: increment counter and possibly lock out
    IF COALESCE(v_settings.pin_failed_attempts, 0) + 1 >= 5 THEN
      UPDATE public.restaurant_settings
      SET pin_failed_attempts = COALESCE(pin_failed_attempts, 0) + 1,
          pin_lockout_until = NOW() + INTERVAL '5 minutes'
      WHERE restaurant_id = p_restaurant_id;
    ELSE
      UPDATE public.restaurant_settings
      SET pin_failed_attempts = COALESCE(pin_failed_attempts, 0) + 1
      WHERE restaurant_id = p_restaurant_id;
    END IF;
    
    RETURN FALSE;
  END IF;
END;
$$;
