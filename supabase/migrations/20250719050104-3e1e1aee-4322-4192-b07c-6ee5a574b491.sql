-- Create configuration tables for dynamic data

-- Currencies table
CREATE TABLE public.currencies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    symbol TEXT NOT NULL,
    commonly_used_in TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Staff roles table
CREATE TABLE public.staff_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Expense categories table (replace hardcoded ones)
CREATE TABLE public.expense_categories_config (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color_code TEXT DEFAULT '#6B7280',
    budget_limit NUMERIC,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Payment methods table
CREATE TABLE public.payment_methods (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- cash, card, digital, etc.
    is_active BOOLEAN DEFAULT true,
    processing_fee_percentage NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Shift types table
CREATE TABLE public.shift_types (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL,
    name TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Room amenities table
CREATE TABLE public.room_amenities_config (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Restaurant settings for currency and other global configs
CREATE TABLE public.restaurant_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL UNIQUE,
    currency_id UUID,
    timezone TEXT DEFAULT 'UTC',
    date_format TEXT DEFAULT 'DD/MM/YYYY',
    time_format TEXT DEFAULT '24h',
    backup_frequency TEXT DEFAULT 'daily',
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Audit log table for tracking critical operations
CREATE TABLE public.audit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL,
    user_id UUID,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Backups table for tracking backup operations
CREATE TABLE public.backups (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL,
    backup_type TEXT NOT NULL, -- full, incremental
    file_path TEXT,
    file_size BIGINT,
    status TEXT DEFAULT 'in_progress', -- in_progress, completed, failed
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_amenities_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for currencies (public read, admin write)
CREATE POLICY "Anyone can view currencies" ON public.currencies FOR SELECT USING (true);
CREATE POLICY "Only admins can manage currencies" ON public.currencies FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for restaurant-specific tables
CREATE POLICY "restaurant_staff_roles_policy" ON public.staff_roles FOR ALL USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "restaurant_expense_categories_config_policy" ON public.expense_categories_config FOR ALL USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "restaurant_payment_methods_policy" ON public.payment_methods FOR ALL USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "restaurant_shift_types_policy" ON public.shift_types FOR ALL USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "restaurant_amenities_config_policy" ON public.room_amenities_config FOR ALL USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "restaurant_settings_policy" ON public.restaurant_settings FOR ALL USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "restaurant_audit_logs_policy" ON public.audit_logs FOR ALL USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "restaurant_backups_policy" ON public.backups FOR ALL USING (
    restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
);

-- Insert default currencies
INSERT INTO public.currencies (name, code, symbol, commonly_used_in) VALUES
('United States Dollar', 'USD', '$', 'USA, global trade, reserves'),
('Euro', 'EUR', '€', 'Eurozone (e.g., Germany, France, Italy, etc.)'),
('British Pound Sterling', 'GBP', '£', 'United Kingdom'),
('Japanese Yen', 'JPY', '¥', 'Japan'),
('Swiss Franc', 'CHF', 'CHF', 'Switzerland'),
('Canadian Dollar', 'CAD', 'C$', 'Canada'),
('Australian Dollar', 'AUD', 'A$', 'Australia'),
('Chinese Yuan (Renminbi)', 'CNY', '¥', 'China'),
('Indian Rupee', 'INR', '₹', 'India'),
('Singapore Dollar', 'SGD', 'S$', 'Singapore'),
('Hong Kong Dollar', 'HKD', 'HK$', 'Hong Kong'),
('New Zealand Dollar', 'NZD', 'NZ$', 'New Zealand'),
('South Korean Won', 'KRW', '₩', 'South Korea'),
('Russian Ruble', 'RUB', '₽', 'Russia'),
('Brazilian Real', 'BRL', 'R$', 'Brazil'),
('Mexican Peso', 'MXN', '$', 'Mexico'),
('South African Rand', 'ZAR', 'R', 'South Africa'),
('Turkish Lira', 'TRY', '₺', 'Turkey'),
('UAE Dirham', 'AED', 'د.إ', 'United Arab Emirates'),
('Saudi Riyal', 'SAR', '﷼', 'Saudi Arabia');

-- Create function for audit logging
CREATE OR REPLACE FUNCTION public.audit_log_changes()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit triggers to critical tables
CREATE TRIGGER audit_orders AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER audit_staff AFTER INSERT OR UPDATE OR DELETE ON staff
    FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER audit_expenses AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER audit_inventory_items AFTER INSERT OR UPDATE OR DELETE ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

-- Add updated_at triggers
CREATE TRIGGER update_currencies_updated_at BEFORE UPDATE ON currencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_roles_updated_at BEFORE UPDATE ON staff_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expense_categories_config_updated_at BEFORE UPDATE ON expense_categories_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shift_types_updated_at BEFORE UPDATE ON shift_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_room_amenities_config_updated_at BEFORE UPDATE ON room_amenities_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurant_settings_updated_at BEFORE UPDATE ON restaurant_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();