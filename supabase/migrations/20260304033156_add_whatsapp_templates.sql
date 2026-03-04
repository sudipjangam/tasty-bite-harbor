-- WhatsApp Templates table for template management & approval workflow
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  name TEXT NOT NULL,                    -- Template name (slug-style for MSG91)
  display_name TEXT NOT NULL,            -- Human-readable name
  category TEXT NOT NULL DEFAULT 'UTILITY',  -- UTILITY | MARKETING
  language TEXT NOT NULL DEFAULT 'en',
  body TEXT NOT NULL,                    -- Template body with {{1}}, {{2}} etc
  variables JSONB DEFAULT '[]',          -- Array of variable mappings [{position: 1, name: "customer_name", sample: "John"}]
  header_text TEXT,                      -- Optional header
  footer_text TEXT,                      -- Optional footer
  buttons JSONB DEFAULT '[]',            -- Button config
  status TEXT NOT NULL DEFAULT 'draft',  -- draft | pending_admin | admin_approved | admin_rejected | meta_pending | meta_approved | meta_rejected
  admin_notes TEXT,                      -- Rejection/approval notes from Swadeshi admin
  meta_response JSONB,                   -- Raw response from MSG91/Meta
  is_default BOOLEAN DEFAULT false,      -- true for invoice_with_contact (non-deletable)
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own restaurant templates"
  ON whatsapp_templates FOR SELECT
  USING (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = (SELECT auth.uid())));

CREATE POLICY "Users can insert own restaurant templates"
  ON whatsapp_templates FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = (SELECT auth.uid())));

CREATE POLICY "Users can update own restaurant templates"
  ON whatsapp_templates FOR UPDATE
  USING (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = (SELECT auth.uid())));

CREATE POLICY "Users can delete own restaurant templates"
  ON whatsapp_templates FOR DELETE
  USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = (SELECT auth.uid()))
    AND is_default = false
  );

-- Platform admins can view all templates for approval
CREATE POLICY "Platform admins can view all templates"
  ON whatsapp_templates FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- Platform admins can update any template (for approval actions)
CREATE POLICY "Platform admins can update all templates"
  ON whatsapp_templates FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- Indexes
CREATE INDEX idx_wa_templates_restaurant ON whatsapp_templates(restaurant_id);
CREATE INDEX idx_wa_templates_status ON whatsapp_templates(status);
CREATE INDEX idx_wa_templates_default ON whatsapp_templates(is_default) WHERE is_default = true;
