-- Migration: Add promotion tracking columns to orders table
-- This enables preserving the exact promotion name and code when a bill is printed or paid,
-- rather than losing the promotion context if the dialog is closed.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS promotion_code text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS promotion_name text DEFAULT NULL;
