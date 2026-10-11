-- ============================================================================
-- Migration: DB Cleanup & Cron Fix
-- Problem: DB at 461/500 MB (92%), Log Ingestion at 306% overage
-- Root Cause: send-daily-reports cron running every minute, stale backup tables
-- Expected Recovery: ~277 MB freed → DB drops to ~37%
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. FIX: send-daily-reports cron (EVERY MINUTE → once daily at 11 PM IST)
-- This is the #1 cause of log ingestion overage (306%)
-- Was: '* * * * *' (1,440 calls/day) → Now: '0 23 * * *' (1 call/day)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-daily-reports') THEN
    PERFORM cron.alter_job(
      (SELECT jobid FROM cron.job WHERE jobname = 'send-daily-reports'),
      schedule := '0 23 * * *'
    );
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. PURGE: cron.job_run_details (184 MB, 197K rows — never cleaned)
-- Every cron execution writes here. Safe to truncate entirely.
-- ----------------------------------------------------------------------------
TRUNCATE cron.job_run_details;

-- ----------------------------------------------------------------------------
-- 3. ADD: Auto-cleanup cron for cron history (keep 7 days, runs daily at 3 AM)
-- Prevents this bloat from recurring
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-cron-history') THEN
    PERFORM cron.unschedule('cleanup-cron-history');
  END IF;
  PERFORM cron.schedule(
    'cleanup-cron-history',
    '0 3 * * *',
    'DELETE FROM cron.job_run_details WHERE end_time < NOW() - INTERVAL ''7 days'''
  );
END $$;

-- ----------------------------------------------------------------------------
-- 4. DROP: audit_logs_backup (94 MB, 81K rows)
-- Created by migration 20260925 — data already lives in monthly partitions
-- This is pure dead weight
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.audit_logs_backup CASCADE;

-- ----------------------------------------------------------------------------
-- 5. DROP: inventory_transactions_backup (2 MB)
-- Same migration, same situation — data already in partitions
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.inventory_transactions_backup CASCADE;

-- ----------------------------------------------------------------------------
-- 6. DROP: orders_unified_backup_20260111_000000 (864 KB)
-- Stale backup from Jan 2026 schema change
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.orders_unified_backup_20260111_000000 CASCADE;

-- ----------------------------------------------------------------------------
-- 7. DROP: Old 2025 audit log partitions (< 1 MB each, over 10 months old)
-- Keeping all 2026+ partitions intact
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.audit_logs_2025_10;
DROP TABLE IF EXISTS public.audit_logs_2025_11;
DROP TABLE IF EXISTS public.audit_logs_2025_12;

-- ----------------------------------------------------------------------------
-- 8. CLEAN: auth.audit_log_entries (6 MB, 19K rows → keep 30 days)
-- Supabase auth login/logout logs
-- ----------------------------------------------------------------------------
DELETE FROM auth.audit_log_entries
WHERE created_at < NOW() - INTERVAL '30 days';

-- ----------------------------------------------------------------------------
-- 9. CLEAN: net._http_response (824 KB → keep 3 days)
-- HTTP response cache from cron edge function calls
-- ----------------------------------------------------------------------------
DELETE FROM net._http_response
WHERE created < NOW() - INTERVAL '3 days';

-- ----------------------------------------------------------------------------
-- 10. VACUUM: Reclaim disk space after deletes
-- Required for Postgres to actually free the space
-- ----------------------------------------------------------------------------
-- NOTE: VACUUM FULL locks tables. Run these one at a time if needed.
-- On Supabase free tier, regular VACUUM runs automatically.
-- The space will be reclaimed by autovacuum within ~1 hour.
