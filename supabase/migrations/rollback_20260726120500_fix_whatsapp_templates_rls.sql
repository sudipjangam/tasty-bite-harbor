-- ============================================================================
-- MIGRATION: Rollback Franchise Cross-Branch RLS for WhatsApp Templates
-- Description: Reverts whatsapp_templates RLS policies back to the original
-- profile-based policies.
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS "Franchise-aware whatsapp_templates select" ON public.whatsapp_templates;
DROP POLICY IF EXISTS "Franchise-aware whatsapp_templates insert" ON public.whatsapp_templates;
DROP POLICY IF EXISTS "Franchise-aware whatsapp_templates update" ON public.whatsapp_templates;
DROP POLICY IF EXISTS "Franchise-aware whatsapp_templates delete" ON public.whatsapp_templates;

CREATE POLICY "Users can view own restaurant templates"
  ON public.whatsapp_templates FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = (SELECT auth.uid())));

CREATE POLICY "Users can insert own restaurant templates"
  ON public.whatsapp_templates FOR INSERT TO authenticated
  WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = (SELECT auth.uid())));

CREATE POLICY "Users can update own restaurant templates"
  ON public.whatsapp_templates FOR UPDATE TO authenticated
  USING (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = (SELECT auth.uid())));

CREATE POLICY "Users can delete own restaurant templates"
  ON public.whatsapp_templates FOR DELETE TO authenticated
  USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = (SELECT auth.uid()))
    AND is_default = false
  );

COMMIT;
