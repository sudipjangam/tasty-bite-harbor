-- ============================================================================
-- Migration: Partition High-Volume Growth Tables (audit_logs & inventory_transactions)
-- Strategy: Declarative Range Partitioning by Month on created_at
-- Safety: Preserves original tables as backup/archive (audit_logs_backup & inventory_transactions_backup)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'audit_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.audit_logs;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'inventory_transactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.inventory_transactions;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 1. PARTITION public.audit_logs
-- ----------------------------------------------------------------------------

-- Rename old table to backup
ALTER TABLE IF EXISTS public.audit_logs RENAME TO audit_logs_backup;

-- Rename primary key constraint and indexes on old table
ALTER TABLE IF EXISTS public.audit_logs_backup RENAME CONSTRAINT audit_logs_pkey TO audit_logs_backup_pkey;
ALTER INDEX IF EXISTS public.idx_audit_logs_restaurant_id RENAME TO idx_audit_logs_backup_restaurant_id;
ALTER INDEX IF EXISTS public.idx_audit_logs_user_id RENAME TO idx_audit_logs_backup_user_id;

-- Create partitioned master table
CREATE TABLE public.audit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    user_id UUID,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT audit_logs_pkey PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Generate monthly partitions from 2025-10 to 2027-12
DO $$
DECLARE
    start_date DATE := '2025-10-01';
    end_date DATE := '2027-12-01';
    curr_date DATE := start_date;
    next_date DATE;
    part_name TEXT;
BEGIN
    WHILE curr_date <= end_date LOOP
        next_date := curr_date + INTERVAL '1 month';
        part_name := 'audit_logs_' || to_char(curr_date, 'YYYY_MM');
        
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.audit_logs FOR VALUES FROM (%L) TO (%L);',
            part_name,
            curr_date,
            next_date
        );
        
        curr_date := next_date;
    END LOOP;
END $$;

-- Create DEFAULT partition to catch any out-of-range timestamps safely
CREATE TABLE IF NOT EXISTS public.audit_logs_default PARTITION OF public.audit_logs DEFAULT;

-- Migrate all rows from backup table into partitioned table
INSERT INTO public.audit_logs (
    id, restaurant_id, user_id, action, table_name, record_id,
    old_values, new_values, ip_address, user_agent, created_at
)
SELECT 
    id, restaurant_id, user_id, action, table_name, record_id,
    old_values, new_values, ip_address, user_agent, created_at
FROM public.audit_logs_backup;

-- Recreate indexes on partitioned audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_restaurant_id ON public.audit_logs (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON public.audit_logs (restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON public.audit_logs (table_name, record_id);

-- Enable RLS and re-attach policy
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Franchise-aware audit_logs access" ON public.audit_logs;
CREATE POLICY "Franchise-aware audit_logs access"
ON public.audit_logs
FOR ALL
TO authenticated
USING (
    ((restaurant_id = ANY (get_user_accessible_restaurants((SELECT auth.uid())))) OR is_platform_admin())
)
WITH CHECK (
    ((restaurant_id = ANY (get_user_accessible_restaurants((SELECT auth.uid())))) OR is_platform_admin())
);


-- ----------------------------------------------------------------------------
-- 2. PARTITION public.inventory_transactions
-- ----------------------------------------------------------------------------

-- Rename old table to backup
ALTER TABLE IF EXISTS public.inventory_transactions RENAME TO inventory_transactions_backup;

-- Rename primary key constraint and indexes on old table
ALTER TABLE IF EXISTS public.inventory_transactions_backup RENAME CONSTRAINT inventory_transactions_pkey TO inventory_transactions_backup_pkey;
ALTER INDEX IF EXISTS public.idx_inventory_transactions_item_id RENAME TO idx_inv_tx_backup_item_id;
ALTER INDEX IF EXISTS public.idx_inventory_transactions_lot RENAME TO idx_inv_tx_backup_lot;
ALTER INDEX IF EXISTS public.idx_inventory_transactions_usage_date RENAME TO idx_inv_tx_backup_usage_date;

-- Create partitioned master table
CREATE TABLE public.inventory_transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    inventory_item_id UUID NOT NULL CONSTRAINT fk_inv_tx_item REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    lot_id UUID CONSTRAINT fk_inv_tx_lot REFERENCES public.inventory_lots(id) ON DELETE SET NULL,
    transaction_type TEXT NOT NULL,
    quantity_change NUMERIC NOT NULL,
    unit_cost_at_time NUMERIC,
    total_cost NUMERIC,
    reference_id UUID,
    reference_type TEXT,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Generate monthly partitions from 2025-10 to 2027-12
DO $$
DECLARE
    start_date DATE := '2025-10-01';
    end_date DATE := '2027-12-01';
    curr_date DATE := start_date;
    next_date DATE;
    part_name TEXT;
BEGIN
    WHILE curr_date <= end_date LOOP
        next_date := curr_date + INTERVAL '1 month';
        part_name := 'inventory_transactions_' || to_char(curr_date, 'YYYY_MM');
        
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.inventory_transactions FOR VALUES FROM (%L) TO (%L);',
            part_name,
            curr_date,
            next_date
        );
        
        curr_date := next_date;
    END LOOP;
END $$;

-- Create DEFAULT partition to catch any out-of-range timestamps safely
CREATE TABLE IF NOT EXISTS public.inventory_transactions_default PARTITION OF public.inventory_transactions DEFAULT;

-- Migrate all rows from backup table into partitioned table
INSERT INTO public.inventory_transactions (
    id, restaurant_id, inventory_item_id, lot_id, transaction_type,
    quantity_change, unit_cost_at_time, total_cost, reference_id,
    reference_type, notes, created_by, created_at
)
SELECT 
    id, restaurant_id, inventory_item_id, lot_id, transaction_type,
    quantity_change, unit_cost_at_time, total_cost, reference_id,
    reference_type, notes, created_by, created_at
FROM public.inventory_transactions_backup;

-- Recreate indexes on partitioned inventory_transactions
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id ON public.inventory_transactions (inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_lot ON public.inventory_transactions (lot_id) WHERE (lot_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_usage_date ON public.inventory_transactions (transaction_type, created_at) WHERE (transaction_type = 'usage');
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_tenant_created ON public.inventory_transactions (restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_tenant_item ON public.inventory_transactions (restaurant_id, inventory_item_id, created_at DESC);

-- Enable RLS and re-attach policy
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Franchise-aware inventory_transactions access" ON public.inventory_transactions;
CREATE POLICY "Franchise-aware inventory_transactions access"
ON public.inventory_transactions
FOR ALL
TO authenticated
USING (
    ((restaurant_id = ANY (get_user_accessible_restaurants((SELECT auth.uid())))) OR is_platform_admin())
)
WITH CHECK (
    ((restaurant_id = ANY (get_user_accessible_restaurants((SELECT auth.uid())))) OR is_platform_admin())
);

-- Reattach trigger on partitioned inventory_transactions if notification function exists
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

-- ----------------------------------------------------------------------------
-- 3. Automated Partition Maintenance Function (creates rolling 3 months ahead)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.maintain_monthly_partitions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_date DATE;
    next_month DATE;
    part_suffix TEXT;
BEGIN
    FOR i IN 0..3 LOOP
        target_date := date_trunc('month', CURRENT_DATE + (i || ' month')::interval)::date;
        next_month := (target_date + INTERVAL '1 month')::date;
        part_suffix := to_char(target_date, 'YYYY_MM');

        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS public.audit_logs_%s PARTITION OF public.audit_logs FOR VALUES FROM (%L) TO (%L);',
            part_suffix, target_date, next_month
        );

        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS public.inventory_transactions_%s PARTITION OF public.inventory_transactions FOR VALUES FROM (%L) TO (%L);',
            part_suffix, target_date, next_month
        );
    END LOOP;
END;
$$;
