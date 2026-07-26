-- ============================================================================
-- MIGRATION: Fix Franchise Cross-Branch RLS for Loyalty Tables
-- Description: Adds franchise-aware RLS policies to loyalty_transactions,
-- loyalty_programs, loyalty_tiers, loyalty_rewards, loyalty_redemptions,
-- and loyalty_enrollments so franchise branch staff can manage loyalty data
-- across accessible branches without 403 errors.
-- Same pattern as the customers table fix in 20260725160000.
-- ============================================================================

BEGIN;

-- ─── 1. loyalty_transactions ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Component-based loyalty_transactions access" ON public.loyalty_transactions;

CREATE POLICY "Franchise-aware loyalty_transactions access"
ON public.loyalty_transactions FOR ALL TO authenticated
USING (
  restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  OR public.check_access('loyalty_transactions', restaurant_id)
)
WITH CHECK (
  restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  OR public.check_access('loyalty_transactions', restaurant_id)
);

-- ─── 2. loyalty_programs ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Component-based loyalty_programs access" ON public.loyalty_programs;

CREATE POLICY "Franchise-aware loyalty_programs access"
ON public.loyalty_programs FOR ALL TO authenticated
USING (
  restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  OR public.check_access('loyalty_programs', restaurant_id)
)
WITH CHECK (
  restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  OR public.check_access('loyalty_programs', restaurant_id)
);

-- ─── 3. loyalty_tiers ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Component-based loyalty_tiers access" ON public.loyalty_tiers;

CREATE POLICY "Franchise-aware loyalty_tiers access"
ON public.loyalty_tiers FOR ALL TO authenticated
USING (
  restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  OR public.check_access('loyalty_tiers', restaurant_id)
)
WITH CHECK (
  restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  OR public.check_access('loyalty_tiers', restaurant_id)
);

-- ─── 4. loyalty_rewards ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Component-based loyalty_rewards access" ON public.loyalty_rewards;

CREATE POLICY "Franchise-aware loyalty_rewards access"
ON public.loyalty_rewards FOR ALL TO authenticated
USING (
  restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  OR public.check_access('loyalty_rewards', restaurant_id)
)
WITH CHECK (
  restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  OR public.check_access('loyalty_rewards', restaurant_id)
);

-- ─── 5. loyalty_redemptions ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Component-based loyalty_redemptions access" ON public.loyalty_redemptions;

CREATE POLICY "Franchise-aware loyalty_redemptions access"
ON public.loyalty_redemptions FOR ALL TO authenticated
USING (
  restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  OR public.check_access('loyalty_redemptions', restaurant_id)
)
WITH CHECK (
  restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  OR public.check_access('loyalty_redemptions', restaurant_id)
);

-- ─── 6. loyalty_enrollments ────────────────────────────────────────────────
-- Old policies used profiles.restaurant_id directly (no franchise support)
DROP POLICY IF EXISTS "Users can view enrollments for their restaurant" ON public.loyalty_enrollments;
DROP POLICY IF EXISTS "Users can manage enrollments for their restaurant" ON public.loyalty_enrollments;

CREATE POLICY "Franchise-aware loyalty_enrollments access"
ON public.loyalty_enrollments FOR ALL TO authenticated
USING (
  restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  OR public.check_access('loyalty_enrollments', restaurant_id)
)
WITH CHECK (
  restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
  OR public.check_access('loyalty_enrollments', restaurant_id)
);

-- Keep the anon insert policy for public enrollment pages
-- (already exists from 20251228_loyalty_enrollment.sql, no change needed)

COMMIT;
