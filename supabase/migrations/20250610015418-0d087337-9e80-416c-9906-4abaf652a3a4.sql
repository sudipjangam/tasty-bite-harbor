
-- Create chart of accounts table
CREATE TABLE public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  account_subtype TEXT,
  parent_account_id UUID REFERENCES chart_of_accounts(id),
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, account_code)
);

-- Create journal entries table for double-entry bookkeeping
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  entry_number TEXT NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT NOT NULL,
  reference_type TEXT, -- 'invoice', 'payment', 'expense', 'manual'
  reference_id UUID,
  total_amount NUMERIC(12,2) NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, entry_number)
);

-- Create journal entry lines for debits and credits
CREATE TABLE public.journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  debit_amount NUMERIC(12,2) DEFAULT 0,
  credit_amount NUMERIC(12,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  invoice_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  payment_terms TEXT DEFAULT 'net_30',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, invoice_number)
);

-- Create invoice line items
CREATE TABLE public.invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  total_price NUMERIC(12,2) NOT NULL,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  payment_number TEXT NOT NULL,
  invoice_id UUID REFERENCES invoices(id),
  payment_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'cheque', 'online', 'upi')),
  reference_number TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, payment_number)
);

-- Create tax configurations table
CREATE TABLE public.tax_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  tax_name TEXT NOT NULL,
  tax_rate NUMERIC(5,2) NOT NULL,
  tax_type TEXT NOT NULL CHECK (tax_type IN ('gst', 'vat', 'service_tax', 'other')),
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create budgets table
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  budget_name TEXT NOT NULL,
  budget_year INTEGER NOT NULL,
  budget_type TEXT NOT NULL CHECK (budget_type IN ('annual', 'quarterly', 'monthly')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create budget line items
CREATE TABLE public.budget_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  budgeted_amount NUMERIC(12,2) NOT NULL,
  actual_amount NUMERIC(12,2) DEFAULT 0,
  variance_amount NUMERIC(12,2) DEFAULT 0,
  variance_percentage NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create financial reports table for caching
CREATE TABLE public.financial_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('profit_loss', 'balance_sheet', 'cash_flow', 'budget_variance')),
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,
  report_data JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_by UUID
);

-- Enable RLS on all tables
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for restaurant-based access
CREATE POLICY "chart_of_accounts_policy" ON public.chart_of_accounts FOR ALL USING (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "journal_entries_policy" ON public.journal_entries FOR ALL USING (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "journal_entry_lines_policy" ON public.journal_entry_lines FOR ALL USING (
  EXISTS (
    SELECT 1 FROM journal_entries je 
    WHERE je.id = journal_entry_lines.journal_entry_id 
    AND je.restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "invoices_policy" ON public.invoices FOR ALL USING (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "invoice_line_items_policy" ON public.invoice_line_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM invoices i 
    WHERE i.id = invoice_line_items.invoice_id 
    AND i.restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "payments_policy" ON public.payments FOR ALL USING (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "tax_configurations_policy" ON public.tax_configurations FOR ALL USING (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "budgets_policy" ON public.budgets FOR ALL USING (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "budget_line_items_policy" ON public.budget_line_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM budgets b 
    WHERE b.id = budget_line_items.budget_id 
    AND b.restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "financial_reports_policy" ON public.financial_reports FOR ALL USING (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chart_of_accounts_updated_at BEFORE UPDATE ON chart_of_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON journal_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tax_configurations_updated_at BEFORE UPDATE ON tax_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budget_line_items_updated_at BEFORE UPDATE ON budget_line_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default chart of accounts for restaurants
INSERT INTO public.chart_of_accounts (restaurant_id, account_code, account_name, account_type, account_subtype, description) 
SELECT 
  r.id as restaurant_id,
  unnest(ARRAY['1000', '1100', '1200', '1300', '2000', '2100', '2200', '3000', '4000', '4100', '4200', '5000', '5100', '5200', '5300', '5400', '6000', '6100', '6200']) as account_code,
  unnest(ARRAY[
    'Assets', 'Cash and Bank', 'Accounts Receivable', 'Inventory', 
    'Liabilities', 'Accounts Payable', 'Short-term Loans', 
    'Equity', 'Revenue', 'Food Sales', 'Room Revenue', 
    'Cost of Goods Sold', 'Food Costs', 'Beverage Costs', 'Room Supplies', 'Cleaning Supplies',
    'Operating Expenses', 'Staff Salaries', 'Utilities'
  ]) as account_name,
  unnest(ARRAY[
    'asset', 'asset', 'asset', 'asset', 
    'liability', 'liability', 'liability', 
    'equity', 'revenue', 'revenue', 'revenue', 
    'expense', 'expense', 'expense', 'expense', 'expense',
    'expense', 'expense', 'expense'
  ]) as account_type,
  unnest(ARRAY[
    'current', 'current', 'current', 'current', 
    'current', 'current', 'current', 
    'owner', 'operating', 'operating', 'operating', 
    'direct', 'direct', 'direct', 'direct', 'direct',
    'operating', 'operating', 'operating'
  ]) as account_subtype,
  unnest(ARRAY[
    'Total Assets', 'Cash and bank accounts', 'Money owed by customers', 'Inventory and stock', 
    'Total Liabilities', 'Money owed to suppliers', 'Short-term borrowings', 
    'Owner Equity', 'Total Revenue', 'Revenue from food sales', 'Revenue from room bookings', 
    'Cost of Goods Sold', 'Cost of food ingredients', 'Cost of beverages', 'Cost of room supplies', 'Cost of cleaning supplies',
    'Operating Expenses', 'Staff wages and salaries', 'Electricity, water, gas bills'
  ]) as description
FROM restaurants r;

-- Insert default tax configurations
INSERT INTO public.tax_configurations (restaurant_id, tax_name, tax_rate, tax_type, description)
SELECT 
  r.id as restaurant_id,
  unnest(ARRAY['GST 5%', 'GST 12%', 'GST 18%', 'Service Tax']) as tax_name,
  unnest(ARRAY[5.00, 12.00, 18.00, 10.00]) as tax_rate,
  unnest(ARRAY['gst', 'gst', 'gst', 'service_tax']) as tax_type,
  unnest(ARRAY['5% GST for restaurants', '12% GST for AC restaurants', '18% GST for hotels', 'Service tax on room service']) as description
FROM restaurants r;
