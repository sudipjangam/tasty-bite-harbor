-- Critical Security Fixes Phase 1: Enable RLS and Fix Policies

-- Enable RLS on tables that don't have it
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Add restaurant-specific policies for expense_categories
CREATE POLICY "Users can view their restaurant's expense categories"
ON public.expense_categories FOR SELECT
USING (restaurant_id IN (
  SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()
));

CREATE POLICY "Users can manage their restaurant's expense categories"
ON public.expense_categories FOR ALL
USING (restaurant_id IN (
  SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()
));

-- Add restaurant-specific policies for expenses
CREATE POLICY "Users can view their restaurant's expenses"
ON public.expenses FOR SELECT
USING (restaurant_id IN (
  SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()
));

CREATE POLICY "Users can manage their restaurant's expenses"
ON public.expenses FOR ALL
USING (restaurant_id IN (
  SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()
));

-- Add restaurant-specific policies for guest_feedback
CREATE POLICY "Users can view their restaurant's guest feedback"
ON public.guest_feedback FOR SELECT
USING (restaurant_id IN (
  SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()
));

CREATE POLICY "Users can manage their restaurant's guest feedback"
ON public.guest_feedback FOR ALL
USING (restaurant_id IN (
  SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()
));

-- Add restaurant-specific policies for guest_preferences
CREATE POLICY "Users can view their restaurant's guest preferences"
ON public.guest_preferences FOR SELECT
USING (restaurant_id IN (
  SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()
));

CREATE POLICY "Users can manage their restaurant's guest preferences"
ON public.guest_preferences FOR ALL
USING (restaurant_id IN (
  SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()
));

-- Add restaurant-specific policies for inventory_alerts
CREATE POLICY "Users can view their restaurant's inventory alerts"
ON public.inventory_alerts FOR SELECT
USING (restaurant_id IN (
  SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()
));

CREATE POLICY "Users can manage their restaurant's inventory alerts"
ON public.inventory_alerts FOR ALL
USING (restaurant_id IN (
  SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()
));

-- Add restaurant-specific policies for inventory_transactions
CREATE POLICY "Users can view their restaurant's inventory transactions"
ON public.inventory_transactions FOR SELECT
USING (restaurant_id IN (
  SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()
));

CREATE POLICY "Users can manage their restaurant's inventory transactions"
ON public.inventory_transactions FOR ALL
USING (restaurant_id IN (
  SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()
));

-- Fix overly permissive anonymous access policies
-- Update currencies table to require authentication for management
DROP POLICY IF EXISTS "Only admins can manage currencies" ON public.currencies;
CREATE POLICY "Only authenticated admins can manage currencies"
ON public.currencies FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));

-- Secure database functions with proper search_path
CREATE OR REPLACE FUNCTION public.update_restaurants_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.audit_log_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    INSERT INTO public.audit_logs (
        restaurant_id,
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values
    )
    VALUES (
        COALESCE(NEW.restaurant_id, OLD.restaurant_id),
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_active_subscription(restaurant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM restaurant_subscriptions
        WHERE restaurant_subscriptions.restaurant_id = $1
        AND status = 'active'
        AND current_period_end > now()
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    INSERT INTO public.profiles (id, role)
    VALUES (new.id, 'manager');
    RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;