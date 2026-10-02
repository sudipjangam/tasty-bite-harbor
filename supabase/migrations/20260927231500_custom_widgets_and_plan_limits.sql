-- ============================================================================
-- CUSTOM DYNAMIC WIDGETS & PLAN QUOTA LIMITS MIGRATION
-- ============================================================================

-- 1. Create custom_widgets table
CREATE TABLE IF NOT EXISTS public.custom_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    widget_type TEXT NOT NULL CHECK (widget_type IN ('kpi', 'chart', 'table', 'alert', 'gauge')),
    source_domain TEXT NOT NULL CHECK (source_domain IN ('orders', 'inventory', 'customers', 'staff', 'finance', 'menu', 'tables')),
    query_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    visual_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    ai_prompt TEXT DEFAULT '',
    grid_size TEXT NOT NULL DEFAULT 'md' CHECK (grid_size IN ('sm', 'md', 'lg', 'xl')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_custom_widgets_restaurant ON public.custom_widgets(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_custom_widgets_active ON public.custom_widgets(restaurant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_custom_widgets_source ON public.custom_widgets(restaurant_id, source_domain);

-- RLS
ALTER TABLE public.custom_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and manage their restaurant custom widgets"
    ON public.custom_widgets FOR ALL
    USING (
        restaurant_id IN (
            SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        restaurant_id IN (
            SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- 2. Add max_custom_widgets column to subscription_plans
ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS max_custom_widgets INTEGER NOT NULL DEFAULT 3;

-- 3. Quota Enforcement Trigger Function
CREATE OR REPLACE FUNCTION public.enforce_custom_widget_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_count INT;
    v_limit INT := 3;
BEGIN
    -- Only check limit when inserting or activating a widget
    IF (TG_OP = 'INSERT' AND NEW.is_active = true) OR (TG_OP = 'UPDATE' AND NEW.is_active = true AND OLD.is_active = false) THEN
        -- Get active plan quota limit for this restaurant
        SELECT COALESCE(sp.max_custom_widgets, 3) INTO v_limit
        FROM public.restaurant_subscriptions rs
        JOIN public.subscription_plans sp ON sp.id = rs.plan_id
        WHERE rs.restaurant_id = NEW.restaurant_id
          AND rs.status = 'active'
        LIMIT 1;

        v_limit := COALESCE(v_limit, 3);

        -- Check current active count
        SELECT COUNT(*) INTO v_count
        FROM public.custom_widgets
        WHERE restaurant_id = NEW.restaurant_id
          AND is_active = true
          AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

        IF v_count >= v_limit THEN
            RAISE EXCEPTION 'Custom widget quota exceeded (% of % allowed). Upgrade subscription plan.', v_count, v_limit;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_custom_widget_limit ON public.custom_widgets;
CREATE TRIGGER trg_enforce_custom_widget_limit
    BEFORE INSERT OR UPDATE OF is_active ON public.custom_widgets
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_custom_widget_limit();

-- 4. Update Existing Subscription Plans with Limits and Feature Keys
-- Starter Plans: limit 3
UPDATE public.subscription_plans
SET max_custom_widgets = 3
WHERE name ILIKE '%starter%' OR name ILIKE '%basic%';

-- Growth Plans: limit 10
UPDATE public.subscription_plans
SET max_custom_widgets = 10
WHERE name ILIKE '%growth%';

-- Professional / Enterprise Plans: limit 25
UPDATE public.subscription_plans
SET max_custom_widgets = 25
WHERE name ILIKE '%pro%' OR name ILIKE '%enterprise%' OR name ILIKE '%unlimited%' OR name ILIKE '%all-in-one%';

-- Add 'ai.custom_components' to components array for active plans (except Free Trial)
UPDATE public.subscription_plans
SET components = CASE 
    WHEN jsonb_typeof(components::jsonb) = 'array' AND NOT (components::jsonb ? 'ai.custom_components') THEN
        (components::jsonb || '["ai.custom_components"]'::jsonb)
    ELSE components
END
WHERE name NOT ILIKE '%free%' AND name NOT ILIKE '%trial%';
