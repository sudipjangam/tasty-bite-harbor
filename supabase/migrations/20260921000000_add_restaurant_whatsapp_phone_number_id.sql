-- Migration: Add WhatsApp custom sender columns to restaurants table
-- Allows restaurants to have their own Meta Phone Number ID & display number under shared WABA

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS whatsapp_phone_number TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS whatsapp_display_name TEXT DEFAULT NULL;

COMMENT ON COLUMN public.restaurants.whatsapp_phone_number_id IS 'Meta Cloud API Phone Number ID for restaurant-specific sender identity';
COMMENT ON COLUMN public.restaurants.whatsapp_phone_number IS 'Display phone number registered on Meta Cloud API (e.g. +91 98765 43210)';
COMMENT ON COLUMN public.restaurants.whatsapp_display_name IS 'Meta verified business display name (e.g. Kiwi Cafe)';
