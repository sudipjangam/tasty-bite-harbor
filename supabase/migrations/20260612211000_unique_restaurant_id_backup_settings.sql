-- Migration to add a unique constraint on restaurant_id in the backup_settings table
-- to allow ON CONFLICT (restaurant_id) DO UPDATE (upsert) queries.

ALTER TABLE public.backup_settings 
ADD CONSTRAINT backup_settings_restaurant_id_key UNIQUE (restaurant_id);
