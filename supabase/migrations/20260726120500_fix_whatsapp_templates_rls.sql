-- ============================================================================
-- MIGRATION: Fix Franchise Cross-Branch RLS for WhatsApp Templates
-- Description: Adds franchise-aware RLS policies to whatsapp_templates
-- so franchise branch staff can manage templates across accessible branches
-- without 403 errors. Preserves admin policies and is_default delete protection.
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS "Users can view own restaurant templates" ON public.whatsapp_templates;
DROP POLICY IF EXISTS "Users can insert own restaurant templates" ON public.whatsapp_templates;
DROP POLICY IF EXISTS "Users can update own restaurant templates" ON public.whatsapp_templates;
DROP POLICY IF EXISTS "Users can delete own restaurant templates" ON public.whatsapp_templates;

CREATE POLICY "Franchise-aware whatsapp_templates select"
  ON public.whatsapp_templates FOR SELECT TO authenticated
  USING (
    restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
    OR public.check_access('whatsapp_templates', restaurant_id)
  );

CREATE POLICY "Franchise-aware whatsapp_templates insert"
  ON public.whatsapp_templates FOR INSERT TO authenticated
  WITH CHECK (
    restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
    OR public.check_access('whatsapp_templates', restaurant_id)
  );

CREATE POLICY "Franchise-aware whatsapp_templates update"
  ON public.whatsapp_templates FOR UPDATE TO authenticated
  USING (
    restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
    OR public.check_access('whatsapp_templates', restaurant_id)
  )
  WITH CHECK (
    restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
    OR public.check_access('whatsapp_templates', restaurant_id)
  );

CREATE POLICY "Franchise-aware whatsapp_templates delete"
  ON public.whatsapp_templates FOR DELETE TO authenticated
  USING (
    (
      restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid()))
      OR public.check_access('whatsapp_templates', restaurant_id)
    )
    AND is_default = false
  );

COMMIT;
