-- ============================================================================
-- Migration: Unpartition audit_logs & inventory_transactions, Lean Audit System
-- Purpose:
--   1. Drop 50+ partition child tables bloating Supabase dashboard and DB metadata
--   2. Replace brute-force full JSON triggers with lean critical change triggers
--   3. Add auto-purge rolling retention (30 days) to prevent future storage exhaustion
--   4. Keep inventory_transactions as a clean, single relational table
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. DROP BRUTE-FORCE AUDIT TRIGGERS & FUNCTIONS
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS audit_orders ON public.orders;
DROP TRIGGER IF EXISTS audit_staff ON public.staff;
DROP TRIGGER IF EXISTS audit_expenses ON public.expenses;
DROP TRIGGER IF EXISTS audit_inventory_items ON public.inventory_items;
DROP FUNCTION IF EXISTS public.audit_log_changes() CASCADE;
DROP FUNCTION IF EXISTS public.maintain_monthly_partitions() CASCADE;

-- ----------------------------------------------------------------------------
-- 2. UNPARTITION & CLEAN: audit_logs (Single table, 14-day copy, auto-purge)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs_clean (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    user_id UUID,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    description TEXT,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Copy recent 14 days to preserve recent security context
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
        INSERT INTO public.audit_logs_clean (
            id, restaurant_id, user_id, action, table_name, record_id,
            description, changes, ip_address, user_agent, created_at
        )
        SELECT 
            id, 
            restaurant_id, 
            user_id, 
            action, 
            COALESCE(table_name, 'unknown'), 
            record_id,
            action || ' on ' || COALESCE(table_name, 'record'),
            new_values, 
            ip_address, 
            user_agent, 
            created_at
        FROM public.audit_logs
        WHERE created_at >= NOW() - INTERVAL '14 days';
    END IF;
END $$;

-- Drop partitioned audit_logs tree (drops all audit_logs_YYYY_MM partitions)
DROP TABLE IF EXISTS public.audit_logs CASCADE;

-- Rename clean table
ALTER TABLE public.audit_logs_clean RENAME TO audit_logs;

-- Rebuild indexes & RLS
CREATE INDEX idx_audit_logs_restaurant_created ON public.audit_logs (restaurant_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX idx_audit_logs_table ON public.audit_logs (table_name);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select_policy"
ON public.audit_logs FOR SELECT TO authenticated
USING (
    ((restaurant_id = ANY (get_user_accessible_restaurants((SELECT auth.uid())))) OR is_platform_admin())
);

CREATE POLICY "audit_logs_insert_policy"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (
    ((restaurant_id = ANY (get_user_accessible_restaurants((SELECT auth.uid())))) OR is_platform_admin())
);

-- Smart lean trigger: Only log DELETE operations to track data loss / security events
CREATE OR REPLACE FUNCTION public.audit_critical_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_headers text;
    v_ip inet;
    v_user_agent text;
BEGIN
    v_headers := current_setting('request.headers', true);
    IF v_headers IS NOT NULL AND v_headers <> '' THEN
        BEGIN
            v_ip := split_part(v_headers::json->>'x-forwarded-for', ',', 1)::inet;
        EXCEPTION WHEN OTHERS THEN
            v_ip := NULL;
        END;
        v_user_agent := v_headers::json->>'user-agent';
    END IF;

    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs (
            restaurant_id, user_id, action, table_name, record_id, description, ip_address, user_agent
        ) VALUES (
            OLD.restaurant_id,
            auth.uid(),
            'DELETE',
            TG_TABLE_NAME,
            OLD.id,
            'Deleted ' || TG_TABLE_NAME || ' record (' || OLD.id || ')',
            v_ip,
            v_user_agent
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach lean trigger only to deletes
CREATE TRIGGER audit_orders_delete AFTER DELETE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.audit_critical_changes();

CREATE TRIGGER audit_staff_delete AFTER DELETE ON public.staff
    FOR EACH ROW EXECUTE FUNCTION public.audit_critical_changes();

CREATE TRIGGER audit_expenses_delete AFTER DELETE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.audit_critical_changes();

-- Auto-purge logs older than 30 days via cron
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-purge-audit-logs') THEN
      PERFORM cron.unschedule('auto-purge-audit-logs');
    END IF;
    PERFORM cron.schedule(
      'auto-purge-audit-logs',
      '0 3 * * *',
      'DELETE FROM public.audit_logs WHERE created_at < NOW() - INTERVAL ''30 days'''
    );
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. UNPARTITION: inventory_transactions (Single clean table)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_transactions_clean (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    lot_id UUID REFERENCES public.inventory_lots(id) ON DELETE SET NULL,
    transaction_type TEXT NOT NULL,
    quantity_change NUMERIC NOT NULL,
    unit_cost_at_time NUMERIC,
    total_cost NUMERIC,
    reference_id UUID,
    reference_type TEXT,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Copy all transactions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_transactions') THEN
        INSERT INTO public.inventory_transactions_clean (
            id, restaurant_id, inventory_item_id, lot_id, transaction_type,
            quantity_change, unit_cost_at_time, total_cost, reference_id,
            reference_type, notes, created_by, created_at
        )
        SELECT 
            id, restaurant_id, inventory_item_id, lot_id, transaction_type,
            quantity_change, unit_cost_at_time, total_cost, reference_id,
            reference_type, notes, created_by, created_at
        FROM public.inventory_transactions;
    END IF;
END $$;

-- Drop partitioned inventory_transactions tree (drops all inventory_transactions_YYYY_MM partitions)
DROP TABLE IF EXISTS public.inventory_transactions CASCADE;

-- Rename clean table
ALTER TABLE public.inventory_transactions_clean RENAME TO inventory_transactions;

-- Indexes & RLS
CREATE INDEX idx_inv_tx_item_id ON public.inventory_transactions (inventory_item_id);
CREATE INDEX idx_inv_tx_lot ON public.inventory_transactions (lot_id) WHERE (lot_id IS NOT NULL);
CREATE INDEX idx_inv_tx_usage_date ON public.inventory_transactions (transaction_type, created_at) WHERE (transaction_type = 'usage');
CREATE INDEX idx_inv_tx_tenant_created ON public.inventory_transactions (restaurant_id, created_at DESC);
CREATE INDEX idx_inv_tx_tenant_item ON public.inventory_transactions (restaurant_id, inventory_item_id, created_at DESC);
CREATE INDEX idx_inv_tx_reference ON public.inventory_transactions (reference_id, transaction_type) WHERE (reference_id IS NOT NULL);

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franchise-aware inventory_transactions access"
ON public.inventory_transactions FOR ALL TO authenticated
USING (
    ((restaurant_id = ANY (get_user_accessible_restaurants((SELECT auth.uid())))) OR is_platform_admin())
)
WITH CHECK (
    ((restaurant_id = ANY (get_user_accessible_restaurants((SELECT auth.uid())))) OR is_platform_admin())
);

-- Reattach notification trigger if present
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_owner_notification') THEN
        DROP TRIGGER IF EXISTS trigger_inventory_owner_notification ON public.inventory_transactions;
        CREATE TRIGGER trigger_inventory_owner_notification
          AFTER INSERT ON public.inventory_transactions
          FOR EACH ROW
          EXECUTE FUNCTION generate_owner_notification();
    END IF;
END $$;
