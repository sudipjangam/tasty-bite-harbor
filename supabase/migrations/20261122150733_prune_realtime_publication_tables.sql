-- Drop high-churn, non-realtime tables from supabase_realtime publication
-- to eliminate unnecessary WAL replication, realtime.list_changes calls, and log ingestion
DO $$
DECLARE
  r RECORD;
  tables_to_drop TEXT[] := ARRAY[
    'sync_logs', 'sync_retry_queue', 'night_audit_logs', 'daily_summary_reports',
    'financial_reports', 'chart_of_accounts', 'journal_entries', 'journal_entry_lines',
    'currencies', 'tax_configurations', 'budget_line_items', 'budgets',
    'monthly_budgets', 'backups', 'backup_settings', 'password_reset_tokens',
    'platform_config', 'gdpr_requests', 'rate_parity_checks', 'supplier_price_history',
    'competitor_pricing', 'ota_credentials', 'channel_restrictions', 'channel_rate_rules',
    'pool_inventory', 'channel_inventory', 'booking_channels', 'channel_room_mapping',
    'component_table_mapping', 'app_components',
    'whatsapp_campaign_sends', 'whatsapp_templates', 'scheduled_report_settings',
    'lost_found_items', 'staff_documents', 'invoice_line_items', 'invoices',
    'purchase_order_items', 'purchase_orders', 'supplier_order_items', 'operational_costs',
    'homemade_production_logs', 'homemade_production_log_items'
  ];
BEGIN
  -- 1. Schema-qualified removal of non-realtime tables from publication
  FOR r IN
    SELECT schemaname, tablename
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = ANY(tables_to_drop)
  LOOP
    EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE %I.%I;', r.schemaname, r.tablename);
  END LOOP;

  -- 2. Ensure kitchen_orders has REPLICA IDENTITY FULL so deletes carry restaurant_id for realtime filters
  ALTER TABLE IF EXISTS public.kitchen_orders REPLICA IDENTITY FULL;
END $$;
