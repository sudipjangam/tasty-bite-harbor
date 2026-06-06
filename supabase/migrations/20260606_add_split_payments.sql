-- Add split_payments JSONB column to orders and pos_transactions
-- Run this in your Supabase SQL editor: https://supabase.com/dashboard/project/clmsoetktmvhazctlans/sql/new
ALTER TABLE orders ADD COLUMN IF NOT EXISTS split_payments jsonb;
ALTER TABLE pos_transactions ADD COLUMN IF NOT EXISTS split_payments jsonb;
