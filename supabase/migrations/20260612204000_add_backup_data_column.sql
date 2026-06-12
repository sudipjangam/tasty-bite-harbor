-- Add backup_data column to backups table
ALTER TABLE public.backups ADD COLUMN IF NOT EXISTS backup_data JSONB;
