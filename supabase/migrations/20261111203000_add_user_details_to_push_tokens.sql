-- Migration: Add user_name and user_email to user_push_tokens for easy identification in Supabase Studio

-- 1. Add columns to user_push_tokens
ALTER TABLE public.user_push_tokens 
  ADD COLUMN IF NOT EXISTS user_name TEXT,
  ADD COLUMN IF NOT EXISTS user_email TEXT,
  ADD COLUMN IF NOT EXISTS device_name TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Backfill existing records from profiles table
UPDATE public.user_push_tokens upt
SET 
  user_name = COALESCE(NULLIF(TRIM(p.first_name || ' ' || COALESCE(p.last_name, '')), ''), p.email, 'User'),
  user_email = p.email,
  updated_at = NOW()
FROM public.profiles p
WHERE upt.user_id = p.id;

-- 3. Trigger function to automatically populate user_name and user_email on new inserts
CREATE OR REPLACE FUNCTION public.autofill_push_token_user_info()
RETURNS TRIGGER AS $$
DECLARE
  v_name TEXT;
  v_email TEXT;
BEGIN
  -- Look up user name and email from profiles
  SELECT 
    COALESCE(NULLIF(TRIM(first_name || ' ' || COALESCE(last_name, '')), ''), email, 'User'),
    email
  INTO v_name, v_email
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF NEW.user_name IS NULL THEN
    NEW.user_name := v_name;
  END IF;

  IF NEW.user_email IS NULL THEN
    NEW.user_email := v_email;
  END IF;

  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Attach trigger to user_push_tokens
DROP TRIGGER IF EXISTS trigger_autofill_push_token_user_info ON public.user_push_tokens;
CREATE TRIGGER trigger_autofill_push_token_user_info
  BEFORE INSERT OR UPDATE ON public.user_push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.autofill_push_token_user_info();
