-- ============================================================================
-- Migration: Franchise Enterprise Modules
-- 1. Inter-Branch Stock Transfers & Indenting (Central Kitchen / Commissary)
-- 2. Franchise Royalty & Billing Engine
-- 3. Inter-Branch Loyalty Clearinghouse Ledger
-- 4. Branch Compliance & Quality Audits (FSSAI, QSC Checklists)
-- ============================================================================

-- 1. Stock Transfers (Indents)
CREATE TABLE IF NOT EXISTS public.branch_transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_number TEXT NOT NULL,
  source_branch_id UUID REFERENCES public.restaurants(id) ON DELETE RESTRICT,
  destination_branch_id UUID REFERENCES public.restaurants(id) ON DELETE RESTRICT,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'dispatched', 'partially_received', 'completed', 'cancelled')),
  expected_delivery_date TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.branch_transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES public.branch_transfer_requests(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT,
  unit TEXT NOT NULL DEFAULT 'units',
  requested_quantity NUMERIC NOT NULL CHECK (requested_quantity >= 0),
  dispatched_quantity NUMERIC NOT NULL DEFAULT 0 CHECK (dispatched_quantity >= 0),
  received_quantity NUMERIC NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
  damaged_quantity NUMERIC NOT NULL DEFAULT 0 CHECK (damaged_quantity >= 0),
  unit_cost NUMERIC NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_branch_transfers_org ON public.branch_transfer_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_branch_transfers_source ON public.branch_transfer_requests(source_branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_transfers_dest ON public.branch_transfer_requests(destination_branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_transfers_status ON public.branch_transfer_requests(status);
CREATE INDEX IF NOT EXISTS idx_branch_transfer_items_transfer ON public.branch_transfer_items(transfer_id);

-- 2. Franchise Royalty & Billing Engine
CREATE TABLE IF NOT EXISTS public.franchise_royalty_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  royalty_percentage NUMERIC NOT NULL DEFAULT 5.0 CHECK (royalty_percentage >= 0 AND royalty_percentage <= 100),
  marketing_fee_percentage NUMERIC NOT NULL DEFAULT 2.0 CHECK (marketing_fee_percentage >= 0 AND marketing_fee_percentage <= 100),
  fixed_monthly_fee NUMERIC NOT NULL DEFAULT 0 CHECK (fixed_monthly_fee >= 0),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly')),
  due_days INTEGER NOT NULL DEFAULT 7 CHECK (due_days >= 1),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_branch_royalty_settings UNIQUE (organization_id, branch_id)
);

CREATE TABLE IF NOT EXISTS public.franchise_royalty_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gross_sales NUMERIC NOT NULL DEFAULT 0,
  net_sales NUMERIC NOT NULL DEFAULT 0,
  royalty_amount NUMERIC NOT NULL DEFAULT 0,
  marketing_fee_amount NUMERIC NOT NULL DEFAULT 0,
  fixed_fee_amount NUMERIC NOT NULL DEFAULT 0,
  total_due NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'overdue', 'waived')),
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_royalty_invoices_org ON public.franchise_royalty_invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_royalty_invoices_branch ON public.franchise_royalty_invoices(branch_id);
CREATE INDEX IF NOT EXISTS idx_royalty_invoices_status ON public.franchise_royalty_invoices(status);

-- 3. Inter-Branch Loyalty Clearinghouse
CREATE TABLE IF NOT EXISTS public.inter_branch_loyalty_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  earned_branch_id UUID REFERENCES public.restaurants(id) ON DELETE SET NULL,
  redeemed_branch_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  points_redeemed NUMERIC NOT NULL CHECK (points_redeemed > 0),
  currency_value NUMERIC NOT NULL DEFAULT 0 CHECK (currency_value >= 0),
  settlement_status TEXT NOT NULL DEFAULT 'pending' CHECK (settlement_status IN ('pending', 'settled', 'waived')),
  settled_at TIMESTAMPTZ,
  order_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_org ON public.inter_branch_loyalty_ledger(organization_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_earned ON public.inter_branch_loyalty_ledger(earned_branch_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_redeemed ON public.inter_branch_loyalty_ledger(redeemed_branch_id);

-- 4. Branch Compliance & Store Audits
CREATE TABLE IF NOT EXISTS public.branch_compliance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('fssai_license', 'fire_noc', 'trade_license', 'gst_certificate', 'lease_agreement', 'health_trade', 'liquor_license', 'other')),
  document_name TEXT NOT NULL,
  license_number TEXT,
  issue_date DATE,
  expiry_date DATE NOT NULL,
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expiring_soon', 'expired')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.branch_audit_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  auditor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  audit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  audit_type TEXT NOT NULL DEFAULT 'qsc' CHECK (audit_type IN ('qsc', 'food_safety', 'brand_standards', 'equipment_maintenance')),
  score_percentage NUMERIC NOT NULL DEFAULT 0 CHECK (score_percentage >= 0 AND score_percentage <= 100),
  total_checks INTEGER NOT NULL DEFAULT 0,
  passed_checks INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('scheduled', 'in_progress', 'completed')),
  feedback TEXT,
  checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_compliance_records_branch ON public.branch_compliance_records(branch_id);
CREATE INDEX IF NOT EXISTS idx_compliance_records_expiry ON public.branch_compliance_records(expiry_date);
CREATE INDEX IF NOT EXISTS idx_audit_checklists_branch ON public.branch_audit_checklists(branch_id);

-- Enable RLS on all 6 tables
ALTER TABLE public.branch_transfer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.franchise_royalty_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.franchise_royalty_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inter_branch_loyalty_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_compliance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_audit_checklists ENABLE ROW LEVEL SECURITY;

-- Helper RLS policy for organization members
CREATE POLICY "Org members access branch_transfers"
ON public.branch_transfer_requests FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org members access branch_transfer_items"
ON public.branch_transfer_items FOR ALL
USING (
  transfer_id IN (
    SELECT t.id FROM public.branch_transfer_requests t
    JOIN public.organization_members om ON om.organization_id = t.organization_id
    WHERE om.user_id = auth.uid()
  )
);

CREATE POLICY "Org members access franchise_royalty_settings"
ON public.franchise_royalty_settings FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org members access franchise_royalty_invoices"
ON public.franchise_royalty_invoices FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org members access inter_branch_loyalty_ledger"
ON public.inter_branch_loyalty_ledger FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org members access branch_compliance_records"
ON public.branch_compliance_records FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org members access branch_audit_checklists"
ON public.branch_audit_checklists FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);
