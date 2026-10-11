-- Migration: Fix organization_subscriptions constraints and add components to restaurant_subscriptions
-- Date: 2026-10-06

-- 1. Relax check constraints on organization_subscriptions to allow growth, pro, professional, trial, pending, suspended
ALTER TABLE public.organization_subscriptions DROP CONSTRAINT IF EXISTS organization_subscriptions_plan_type_check;
ALTER TABLE public.organization_subscriptions ADD CONSTRAINT organization_subscriptions_plan_type_check 
  CHECK (plan_type = ANY (ARRAY['free'::text, 'starter'::text, 'growth'::text, 'pro'::text, 'professional'::text, 'enterprise'::text]));

ALTER TABLE public.organization_subscriptions DROP CONSTRAINT IF EXISTS organization_subscriptions_status_check;
ALTER TABLE public.organization_subscriptions ADD CONSTRAINT organization_subscriptions_status_check 
  CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'trial'::text, 'pending'::text, 'suspended'::text, 'expired'::text]));

-- 2. Add components column to restaurant_subscriptions for branch-level feature overrides
ALTER TABLE public.restaurant_subscriptions ADD COLUMN IF NOT EXISTS components jsonb DEFAULT '[]'::jsonb;
