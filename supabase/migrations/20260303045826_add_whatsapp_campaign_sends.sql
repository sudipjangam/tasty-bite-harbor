-- WhatsApp Campaign Sends tracking table
CREATE TABLE IF NOT EXISTS whatsapp_campaign_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES promotion_campaigns(id) ON DELETE SET NULL,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_phone TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  template_name TEXT NOT NULL DEFAULT 'invoice_with_contact',
  msg91_request_id TEXT,
  status TEXT DEFAULT 'pending',
  failure_reason TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE whatsapp_campaign_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own restaurant wa sends"
  ON whatsapp_campaign_sends FOR SELECT
  USING (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = (SELECT auth.uid())));

CREATE POLICY "Users can insert own restaurant wa sends"
  ON whatsapp_campaign_sends FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = (SELECT auth.uid())));

CREATE POLICY "Users can update own restaurant wa sends"
  ON whatsapp_campaign_sends FOR UPDATE
  USING (restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = (SELECT auth.uid())));

-- Indexes
CREATE INDEX idx_wa_sends_campaign ON whatsapp_campaign_sends(campaign_id);
CREATE INDEX idx_wa_sends_restaurant ON whatsapp_campaign_sends(restaurant_id);
CREATE INDEX idx_wa_sends_status ON whatsapp_campaign_sends(status);
CREATE INDEX idx_wa_sends_sent_at ON whatsapp_campaign_sends(sent_at);
