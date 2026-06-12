-- Add name column to backups table
ALTER TABLE public.backups ADD COLUMN IF NOT EXISTS name TEXT;
