-- ============================================================================
-- MIGRATION: Auto-sync Franchise Branch Subscriptions
-- Description: Triggers to automatically create and update restaurant_subscriptions 
-- for franchise branches based on organization_subscriptions.
-- ============================================================================

-- 1. Helper function to map organization plan_type to subscription_plans ID
CREATE OR REPLACE FUNCTION get_mapped_restaurant_plan_id(p_plan_type TEXT)
RETURNS UUID AS $$
DECLARE
  v_plan_id UUID;
BEGIN
  -- Look up the active plan in public.subscription_plans matching the type
  SELECT id INTO v_plan_id
  FROM public.subscription_plans
  WHERE is_active = true
    AND name = CASE 
      WHEN p_plan_type = 'starter' THEN 'Restaurant Starter'
      WHEN p_plan_type = 'growth' THEN 'Restaurant Growth'
      ELSE 'Restaurant Professional'
    END
  LIMIT 1;
  
  -- Fallback if exact name match isn't found
  IF v_plan_id IS NULL THEN
    SELECT id INTO v_plan_id
    FROM public.subscription_plans
    WHERE is_active = true
    ORDER BY price DESC
    LIMIT 1;
  END IF;

  RETURN v_plan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger function: Runs when a new restaurant is created under an organization
CREATE OR REPLACE FUNCTION sync_franchise_restaurant_subscription()
RETURNS TRIGGER AS $$
DECLARE
  v_org_plan TEXT;
  v_plan_id UUID;
BEGIN
  IF NEW.organization_id IS NOT NULL THEN
    -- Get organization's subscription plan type
    SELECT plan_type INTO v_org_plan
    FROM public.organization_subscriptions
    WHERE organization_id = NEW.organization_id;

    IF v_org_plan IS NOT NULL THEN
      v_plan_id := get_mapped_restaurant_plan_id(v_org_plan);

      IF v_plan_id IS NOT NULL THEN
        INSERT INTO public.restaurant_subscriptions (
          restaurant_id,
          plan_id,
          status,
          current_period_start,
          current_period_end
        ) VALUES (
          NEW.id,
          v_plan_id,
          'active',
          NOW(),
          NOW() + INTERVAL '10 years'
        )
        ON CONFLICT (restaurant_id) DO UPDATE
        SET plan_id = EXCLUDED.plan_id,
            status = 'active',
            current_period_end = EXCLUDED.current_period_end;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on restaurants table
DROP TRIGGER IF EXISTS trigger_sync_franchise_restaurant_subscription ON public.restaurants;
CREATE TRIGGER trigger_sync_franchise_restaurant_subscription
AFTER INSERT OR UPDATE OF organization_id ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION sync_franchise_restaurant_subscription();


-- 3. Trigger function: Runs when an organization subscription is created or changed
CREATE OR REPLACE FUNCTION sync_franchise_org_subscription_change()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_id UUID;
  v_restaurant_id UUID;
BEGIN
  v_plan_id := get_mapped_restaurant_plan_id(NEW.plan_type);

  IF v_plan_id IS NOT NULL THEN
    -- Loop through and sync all restaurants under this organization
    FOR v_restaurant_id IN 
      SELECT id FROM public.restaurants WHERE organization_id = NEW.organization_id
    LOOP
      INSERT INTO public.restaurant_subscriptions (
        restaurant_id,
        plan_id,
        status,
        current_period_start,
        current_period_end
      ) VALUES (
        v_restaurant_id,
        v_plan_id,
        'active',
        NOW(),
        NOW() + INTERVAL '10 years'
      )
      ON CONFLICT (restaurant_id) DO UPDATE
      SET plan_id = EXCLUDED.plan_id,
          status = 'active',
          current_period_end = EXCLUDED.current_period_end;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on organization_subscriptions table
DROP TRIGGER IF EXISTS trigger_sync_franchise_org_subscription_change ON public.organization_subscriptions;
CREATE TRIGGER trigger_sync_franchise_org_subscription_change
AFTER INSERT OR UPDATE OF plan_type ON public.organization_subscriptions
FOR EACH ROW
EXECUTE FUNCTION sync_franchise_org_subscription_change();
