-- Create table to store FCM push tokens
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    device_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Make sure we don't store the exact same token multiple times for the same user
CREATE UNIQUE INDEX IF NOT EXISTS user_push_tokens_user_id_token_idx ON public.user_push_tokens (user_id, token);

-- Enable RLS
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own tokens
CREATE POLICY "Users can manage their own push tokens" 
    ON public.user_push_tokens 
    FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- Create a generic function to call our edge function for any notification
CREATE OR REPLACE FUNCTION notify_push_edge_function()
RETURNS TRIGGER AS $$
DECLARE
  endpoint TEXT;
  headers JSONB;
  payload JSONB;
BEGIN
  -- We assume Edge Function is deployed to the current Supabase project
  -- In local dev, this would need to point to the local edge function URL. 
  -- But usually, pg_net is used to hit the deployed URL.
  -- For maximum compatibility between environments, we'll use a webhook payload
  
  endpoint := current_setting('app.settings.edge_function_url', true) || '/send-push-notification';
  
  -- If the setting isn't set, fallback to a sensible default or skip
  IF endpoint IS NULL OR endpoint = '/send-push-notification' THEN
    -- Try to construct it from standard env vars if available, otherwise skip
    -- (In production, you'd set app.settings.edge_function_url via supabase secrets/settings)
    RETURN NEW;
  END IF;

  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
  );

  payload := jsonb_build_object(
    'record', row_to_json(NEW),
    'table', TG_TABLE_NAME
  );

  -- We need pg_net extension to make async HTTP requests from Postgres
  -- Ensure it's enabled: CREATE EXTENSION IF NOT EXISTS pg_net;
  PERFORM net.http_post(
      url := endpoint,
      headers := headers,
      body := payload
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Failed to trigger push notification webhook: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for staff_notifications
DROP TRIGGER IF EXISTS staff_notifications_push_trigger ON public.staff_notifications;
CREATE TRIGGER staff_notifications_push_trigger
    AFTER INSERT ON public.staff_notifications
    FOR EACH ROW
    EXECUTE FUNCTION notify_push_edge_function();

-- Add trigger for owner_notifications
DROP TRIGGER IF EXISTS owner_notifications_push_trigger ON public.owner_notifications;
CREATE TRIGGER owner_notifications_push_trigger
    AFTER INSERT ON public.owner_notifications
    FOR EACH ROW
    EXECUTE FUNCTION notify_push_edge_function();
