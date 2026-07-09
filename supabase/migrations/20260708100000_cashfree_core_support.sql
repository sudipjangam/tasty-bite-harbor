-- ═══════════════════════════════════════════════════════════════
-- Cashfree Payment Gateway Core Integration
-- Adds Cashfree credential columns to payment_settings and transaction tracking
-- ═══════════════════════════════════════════════════════════════

-- 1. Add Cashfree credentials and settings to payment_settings
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS cashfree_app_id text;
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS cashfree_secret_key text;
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS cashfree_sub_merchant_id text;
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS cashfree_test_mode boolean DEFAULT true;
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS cashfree_webhook_secret text;

-- 2. Add Cashfree tracking columns to payment_transactions (unified tracking)
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS cashfree_order_id text;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS cashfree_payment_session_id text;
