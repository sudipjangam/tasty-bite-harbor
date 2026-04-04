-- ============================================================================
-- GRANULAR FEATURE PERMISSIONS MIGRATION
-- ============================================================================
-- PURPOSE: Convert flat subscription component keys to dot-notation feature keys
-- 
-- ⚠️  WARNING: DO NOT RUN THIS ON PRODUCTION DURING PEAK HOURS
--    Schedule for early morning (e.g., 5:00 AM IST) when traffic is lowest.
--
-- WHAT THIS DOES:
-- 1. Adds a `components_backup` column to save current flat keys (safety net)
-- 2. Backs up the current `components` column
-- 3. Maps old flat keys → new dot-notation keys for each plan type
-- 4. Updates the `components` column with granular feature keys
--
-- ROLLBACK: If something goes wrong, run:
--   UPDATE subscription_plans 
--   SET components = components_backup 
--   WHERE components_backup IS NOT NULL;
-- ============================================================================

-- Step 1: Add backup column if not exists
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS components_backup jsonb;

-- Step 2: Backup current components
UPDATE subscription_plans 
SET components_backup = components
WHERE components IS NOT NULL;

-- ============================================================================
-- Step 3: Mapping Logic
-- ============================================================================
-- We use the plan name to determine the tier (Free Trial / Growth / Starter / Professional)
-- and then assign the appropriate dot-notation keys.
--
-- Key design principles:
-- - Professional does NOT auto-get everything (all plans are explicitly configured)
-- - Free Trial plans get basic features only
-- - Growth gets moderate features
-- - Starter adds more advanced features  
-- - Professional gets the most features but each is explicitly listed
-- ============================================================================

-- ─── FREE TRIAL PLANS ──────────────────────────────────────────────────
-- Minimal feature set to let users explore the tool
UPDATE subscription_plans 
SET components = '[
  "pos.basic",
  "orders.view",
  "menu.basic",
  "inventory.overview",
  "recipes.view",
  "tables.grid",
  "reports.tabs.default",
  "reports.default.orders_sales",
  "reports.default.menu_items",
  "customers.basic",
  "staff.roster",
  "expenses.basic",
  "suppliers.basic",
  "settings.basic"
]'::jsonb
WHERE name ILIKE '%free trial%'
  AND components IS NOT NULL;

-- ─── GROWTH PLANS ──────────────────────────────────────────────────────
-- Core features + some extras for growing businesses
UPDATE subscription_plans 
SET components = '[
  "pos.basic",
  "pos.hold_orders",
  "orders.view",
  "menu.basic",
  "menu.modifiers",
  "inventory.overview",
  "inventory.alerts",
  "inventory.transactions",
  "recipes.view",
  "recipes.costing",
  "tables.grid",
  "tables.timers",
  "reports.tabs.default",
  "reports.default.orders_sales",
  "reports.default.menu_items",
  "reports.default.inventory",
  "reports.default.customers",
  "customers.basic",
  "customers.loyalty",
  "staff.roster",
  "staff.attendance",
  "expenses.basic",
  "suppliers.basic",
  "suppliers.orders",
  "marketing.campaigns",
  "settings.basic",
  "settings.security"
]'::jsonb
WHERE (name ILIKE '%growth%')
  AND name NOT ILIKE '%free trial%'
  AND components IS NOT NULL;

-- ─── STARTER PLANS ─────────────────────────────────────────────────────
-- Mid-tier with analytics, more reports, financial tools
UPDATE subscription_plans 
SET components = '[
  "pos.basic",
  "pos.hold_orders",
  "pos.custom_items",
  "orders.view",
  "orders.analytics",
  "menu.basic",
  "menu.modifiers",
  "inventory.overview",
  "inventory.alerts",
  "inventory.purchase_orders",
  "inventory.transactions",
  "inventory.stocktake",
  "recipes.view",
  "recipes.costing",
  "tables.grid",
  "tables.timers",
  "reports.tabs.default",
  "reports.tabs.export_center",
  "reports.default.orders_sales",
  "reports.default.menu_items",
  "reports.default.inventory",
  "reports.default.expenses",
  "reports.default.staff",
  "reports.default.customers",
  "customers.basic",
  "customers.loyalty",
  "staff.roster",
  "staff.attendance",
  "staff.shifts",
  "financial.dashboard",
  "expenses.basic",
  "expenses.advanced",
  "suppliers.basic",
  "suppliers.orders",
  "marketing.campaigns",
  "marketing.whatsapp",
  "marketing.segments",
  "settings.basic",
  "settings.security"
]'::jsonb
WHERE (name ILIKE '%starter%')
  AND name NOT ILIKE '%free trial%'
  AND components IS NOT NULL;

-- ─── PROFESSIONAL PLANS ────────────────────────────────────────────────
-- Full feature set — each feature explicitly listed (no wildcard)
UPDATE subscription_plans 
SET components = '[
  "pos.basic",
  "pos.whatsapp_billing",
  "pos.offline_mode",
  "pos.advanced_discounts",
  "pos.custom_items",
  "pos.hold_orders",
  "pos.daily_summary",
  "quickserve.basic",
  "quickserve.custom_widgets",
  "quickserve.live_metrics",
  "quickserve.loyalty_integration",
  "quickserve.coupon_engine",
  "orders.view",
  "orders.analytics",
  "orders.third_party_sync",
  "orders.nc_orders",
  "kitchen.kds",
  "kitchen.multi_station",
  "kitchen.analytics",
  "menu.basic",
  "menu.modifiers",
  "menu.dynamic_pricing",
  "menu.multi_location",
  "inventory.overview",
  "inventory.alerts",
  "inventory.stocktake",
  "inventory.purchase_orders",
  "inventory.suggestions",
  "inventory.forecasting",
  "inventory.transactions",
  "inventory.lots",
  "inventory.bill_scan",
  "recipes.view",
  "recipes.costing",
  "recipes.menu_engineering",
  "recipes.batch_processing",
  "tables.grid",
  "tables.timers",
  "tables.optimization",
  "reports.tabs.analytics",
  "reports.tabs.default",
  "reports.tabs.custom_builder",
  "reports.tabs.export_center",
  "reports.default.orders_sales",
  "reports.default.menu_items",
  "reports.default.inventory",
  "reports.default.customers",
  "reports.default.staff",
  "reports.default.suppliers",
  "reports.default.expenses",
  "reports.default.recipes",
  "reports.default.promotions",
  "customers.basic",
  "customers.crm",
  "customers.loyalty",
  "staff.roster",
  "staff.attendance",
  "staff.shifts",
  "staff.payroll",
  "financial.dashboard",
  "financial.budget",
  "financial.invoicing",
  "expenses.basic",
  "expenses.advanced",
  "suppliers.basic",
  "suppliers.orders",
  "marketing.campaigns",
  "marketing.whatsapp",
  "marketing.segments",
  "marketing.analytics",
  "marketing.loyalty",
  "reservations.basic",
  "rooms.management",
  "rooms.housekeeping",
  "rooms.channel_mgmt",
  "gate.access",
  "gate.valet",
  "gate.vip",
  "ai.assistant",
  "ai.analytics",
  "settings.basic",
  "settings.security",
  "settings.gdpr"
]'::jsonb
WHERE (name ILIKE '%professional%' OR name ILIKE '%pro %' OR name ILIKE '%pro-%')
  AND name NOT ILIKE '%free trial%'
  AND components IS NOT NULL;


-- ============================================================================
-- Step 4: Verification Queries (run manually after migration)
-- ============================================================================

-- Check that all plans have been updated:
-- SELECT id, name, 
--        jsonb_array_length(components) as new_feature_count,
--        jsonb_array_length(components_backup) as old_feature_count
-- FROM subscription_plans
-- ORDER BY price;

-- Check if any plans were NOT updated (still have flat keys):
-- SELECT id, name, components 
-- FROM subscription_plans 
-- WHERE components IS NOT NULL 
--   AND NOT EXISTS (
--     SELECT 1 FROM jsonb_array_elements_text(components) elem 
--     WHERE elem LIKE '%.%'
--   );

-- Find plans that may have been missed (no dot-notation keys):
-- SELECT name, components FROM subscription_plans 
-- WHERE components_backup IS NULL;
