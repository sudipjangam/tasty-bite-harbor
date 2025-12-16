-- Update remaining tables with component-based RLS policies

-- INVENTORY_TRANSACTIONS
DROP POLICY IF EXISTS "Users can view their restaurant's inventory transactions" ON public.inventory_transactions;
DROP POLICY IF EXISTS "Users can manage their restaurant's inventory transactions" ON public.inventory_transactions;

CREATE POLICY "Component-based inventory_transactions access"
ON public.inventory_transactions
FOR ALL
USING (public.check_access('inventory_transactions', restaurant_id))
WITH CHECK (public.check_access('inventory_transactions', restaurant_id));

-- INVENTORY_ALERTS
DROP POLICY IF EXISTS "Users can view their restaurant's inventory alerts" ON public.inventory_alerts;
DROP POLICY IF EXISTS "Users can manage their restaurant's inventory alerts" ON public.inventory_alerts;

CREATE POLICY "Component-based inventory_alerts access"
ON public.inventory_alerts
FOR ALL
USING (public.check_access('inventory_alerts', restaurant_id))
WITH CHECK (public.check_access('inventory_alerts', restaurant_id));

-- EXPENSE_CATEGORIES
DROP POLICY IF EXISTS "Users can view their restaurant's expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Users can manage their restaurant's expense categories" ON public.expense_categories;

CREATE POLICY "Component-based expense_categories access"
ON public.expense_categories
FOR ALL
USING (public.check_access('expense_categories', restaurant_id))
WITH CHECK (public.check_access('expense_categories', restaurant_id));

-- GUEST_FEEDBACK
DROP POLICY IF EXISTS "Users can view their restaurant's guest feedback" ON public.guest_feedback;
DROP POLICY IF EXISTS "Users can manage their restaurant's guest feedback" ON public.guest_feedback;

CREATE POLICY "Component-based guest_feedback access"
ON public.guest_feedback
FOR ALL
USING (public.check_access('guest_feedback', restaurant_id))
WITH CHECK (public.check_access('guest_feedback', restaurant_id));

-- GUEST_PREFERENCES
DROP POLICY IF EXISTS "Users can view their restaurant's guest preferences" ON public.guest_preferences;
DROP POLICY IF EXISTS "Users can manage their restaurant's guest preferences" ON public.guest_preferences;

CREATE POLICY "Component-based guest_preferences access"
ON public.guest_preferences
FOR ALL
USING (public.check_access('guest_preferences', restaurant_id))
WITH CHECK (public.check_access('guest_preferences', restaurant_id));

-- GUEST_PROFILES
DROP POLICY IF EXISTS "guest_profiles_policy" ON public.guest_profiles;

CREATE POLICY "Component-based guest_profiles access"
ON public.guest_profiles
FOR ALL
USING (public.check_access('guest_profiles', restaurant_id))
WITH CHECK (public.check_access('guest_profiles', restaurant_id));

-- ROOM_BILLINGS
DROP POLICY IF EXISTS "room_billings_policy" ON public.room_billings;

CREATE POLICY "Component-based room_billings access"
ON public.room_billings
FOR ALL
USING (public.check_access('room_billings', restaurant_id))
WITH CHECK (public.check_access('room_billings', restaurant_id));

-- ROOM_FOOD_ORDERS
DROP POLICY IF EXISTS "room_food_orders_policy" ON public.room_food_orders;

CREATE POLICY "Component-based room_food_orders access"
ON public.room_food_orders
FOR ALL
USING (public.check_access('room_food_orders', restaurant_id))
WITH CHECK (public.check_access('room_food_orders', restaurant_id));

-- CHECK_INS
DROP POLICY IF EXISTS "check_ins_policy" ON public.check_ins;

CREATE POLICY "Component-based check_ins access"
ON public.check_ins
FOR ALL
USING (public.check_access('check_ins', restaurant_id))
WITH CHECK (public.check_access('check_ins', restaurant_id));

-- BATCH_PRODUCTIONS
DROP POLICY IF EXISTS "Users can manage batch productions" ON public.batch_productions;
DROP POLICY IF EXISTS "Users can view batch productions for their restaurant" ON public.batch_productions;

CREATE POLICY "Component-based batch_productions access"
ON public.batch_productions
FOR ALL
USING (public.check_access('batch_productions', restaurant_id))
WITH CHECK (public.check_access('batch_productions', restaurant_id));

-- RECIPE_INGREDIENTS - needs to join via recipe table
DROP POLICY IF EXISTS "recipe_ingredients_policy" ON public.recipe_ingredients;

-- SENT_PROMOTIONS
DROP POLICY IF EXISTS "sent_promotions_policy" ON public.sent_promotions;

CREATE POLICY "Component-based sent_promotions access"
ON public.sent_promotions
FOR ALL
USING (public.check_access('sent_promotions', restaurant_id))
WITH CHECK (public.check_access('sent_promotions', restaurant_id));

-- SUPPLIER_ORDERS
DROP POLICY IF EXISTS "supplier_orders_policy" ON public.supplier_orders;

CREATE POLICY "Component-based supplier_orders access"
ON public.supplier_orders
FOR ALL
USING (public.check_access('supplier_orders', restaurant_id))
WITH CHECK (public.check_access('supplier_orders', restaurant_id));

-- BOOKING_SOURCES
DROP POLICY IF EXISTS "booking_sources_policy" ON public.booking_sources;

CREATE POLICY "Component-based booking_sources access"
ON public.booking_sources
FOR ALL
USING (public.check_access('booking_sources', restaurant_id))
WITH CHECK (public.check_access('booking_sources', restaurant_id));

-- CHANNEL_INVENTORY
DROP POLICY IF EXISTS "channel_inventory_policy" ON public.channel_inventory;

CREATE POLICY "Component-based channel_inventory access"
ON public.channel_inventory
FOR ALL
USING (public.check_access('channel_inventory', restaurant_id))
WITH CHECK (public.check_access('channel_inventory', restaurant_id));

-- DEMAND_FORECAST
DROP POLICY IF EXISTS "demand_forecast_policy" ON public.demand_forecast;

CREATE POLICY "Component-based demand_forecast access"
ON public.demand_forecast
FOR ALL
USING (public.check_access('demand_forecast', restaurant_id))
WITH CHECK (public.check_access('demand_forecast', restaurant_id));

-- COMPETITOR_PRICING
DROP POLICY IF EXISTS "competitor_pricing_policy" ON public.competitor_pricing;

CREATE POLICY "Component-based competitor_pricing access"
ON public.competitor_pricing
FOR ALL
USING (public.check_access('competitor_pricing', restaurant_id))
WITH CHECK (public.check_access('competitor_pricing', restaurant_id));

-- AUDIT_LOGS
DROP POLICY IF EXISTS "restaurant_audit_logs_policy" ON public.audit_logs;

CREATE POLICY "Component-based audit_logs access"
ON public.audit_logs
FOR ALL
USING (public.check_access('audit_logs', restaurant_id))
WITH CHECK (public.check_access('audit_logs', restaurant_id));

-- BACKUPS
DROP POLICY IF EXISTS "restaurant_backups_policy" ON public.backups;

CREATE POLICY "Component-based backups access"
ON public.backups
FOR ALL
USING (public.check_access('backups', restaurant_id))
WITH CHECK (public.check_access('backups', restaurant_id));

-- BACKUP_SETTINGS
DROP POLICY IF EXISTS "backup_settings_policy" ON public.backup_settings;

CREATE POLICY "Component-based backup_settings access"
ON public.backup_settings
FOR ALL
USING (public.check_access('backup_settings', restaurant_id))
WITH CHECK (public.check_access('backup_settings', restaurant_id));

-- BUDGETS
DROP POLICY IF EXISTS "budgets_policy" ON public.budgets;

CREATE POLICY "Component-based budgets access"
ON public.budgets
FOR ALL
USING (public.check_access('budgets', restaurant_id))
WITH CHECK (public.check_access('budgets', restaurant_id));

-- CHART_OF_ACCOUNTS
DROP POLICY IF EXISTS "chart_of_accounts_policy" ON public.chart_of_accounts;

CREATE POLICY "Component-based chart_of_accounts access"
ON public.chart_of_accounts
FOR ALL
USING (public.check_access('chart_of_accounts', restaurant_id))
WITH CHECK (public.check_access('chart_of_accounts', restaurant_id));

-- JOURNAL_ENTRIES
DROP POLICY IF EXISTS "journal_entries_policy" ON public.journal_entries;

CREATE POLICY "Component-based journal_entries access"
ON public.journal_entries
FOR ALL
USING (public.check_access('journal_entries', restaurant_id))
WITH CHECK (public.check_access('journal_entries', restaurant_id));

-- FINANCIAL_REPORTS
DROP POLICY IF EXISTS "financial_reports_policy" ON public.financial_reports;

CREATE POLICY "Component-based financial_reports access"
ON public.financial_reports
FOR ALL
USING (public.check_access('financial_reports', restaurant_id))
WITH CHECK (public.check_access('financial_reports', restaurant_id));

-- LOYALTY_PROGRAMS
DROP POLICY IF EXISTS "loyalty_programs_policy" ON public.loyalty_programs;

CREATE POLICY "Component-based loyalty_programs access"
ON public.loyalty_programs
FOR ALL
USING (public.check_access('loyalty_programs', restaurant_id))
WITH CHECK (public.check_access('loyalty_programs', restaurant_id));

-- LOYALTY_TIERS
DROP POLICY IF EXISTS "loyalty_tiers_policy" ON public.loyalty_tiers;

CREATE POLICY "Component-based loyalty_tiers access"
ON public.loyalty_tiers
FOR ALL
USING (public.check_access('loyalty_tiers', restaurant_id))
WITH CHECK (public.check_access('loyalty_tiers', restaurant_id));

-- LOYALTY_REWARDS
DROP POLICY IF EXISTS "loyalty_rewards_policy" ON public.loyalty_rewards;

CREATE POLICY "Component-based loyalty_rewards access"
ON public.loyalty_rewards
FOR ALL
USING (public.check_access('loyalty_rewards', restaurant_id))
WITH CHECK (public.check_access('loyalty_rewards', restaurant_id));

-- LOYALTY_TRANSACTIONS
DROP POLICY IF EXISTS "loyalty_transactions_policy" ON public.loyalty_transactions;

CREATE POLICY "Component-based loyalty_transactions access"
ON public.loyalty_transactions
FOR ALL
USING (public.check_access('loyalty_transactions', restaurant_id))
WITH CHECK (public.check_access('loyalty_transactions', restaurant_id));

-- LOYALTY_REDEMPTIONS
DROP POLICY IF EXISTS "loyalty_redemptions_policy" ON public.loyalty_redemptions;

CREATE POLICY "Component-based loyalty_redemptions access"
ON public.loyalty_redemptions
FOR ALL
USING (public.check_access('loyalty_redemptions', restaurant_id))
WITH CHECK (public.check_access('loyalty_redemptions', restaurant_id));

-- CUSTOMER_ACTIVITIES
DROP POLICY IF EXISTS "Users can view their restaurant's customer activities" ON public.customer_activities;
DROP POLICY IF EXISTS "Users can insert their restaurant's customer activities" ON public.customer_activities;

CREATE POLICY "Component-based customer_activities access"
ON public.customer_activities
FOR ALL
USING (public.check_access('customer_activities', restaurant_id))
WITH CHECK (public.check_access('customer_activities', restaurant_id));

-- CUSTOMER_NOTES
DROP POLICY IF EXISTS "Users can view their restaurant's customer notes" ON public.customer_notes;
DROP POLICY IF EXISTS "Users can insert their restaurant's customer notes" ON public.customer_notes;

CREATE POLICY "Component-based customer_notes access"
ON public.customer_notes
FOR ALL
USING (public.check_access('customer_notes', restaurant_id))
WITH CHECK (public.check_access('customer_notes', restaurant_id));

-- ROLE_COMPONENTS
DROP POLICY IF EXISTS "role_components_policy" ON public.role_components;

CREATE POLICY "Component-based role_components access"
ON public.role_components
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.roles r
    WHERE r.id = role_components.role_id
    AND public.check_access('role_components', r.restaurant_id)
  )
);