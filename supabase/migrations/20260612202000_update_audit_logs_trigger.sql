-- Update audit_log_changes trigger function to capture IP address and User Agent
CREATE OR REPLACE FUNCTION public.audit_log_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_headers text;
  v_ip inet;
  v_user_agent text;
BEGIN
    -- Get request headers from Supabase request context
    v_headers := current_setting('request.headers', true);
    
    IF v_headers IS NOT NULL AND v_headers <> '' THEN
        BEGIN
            -- Extract IP address (handle potential comma-separated list from proxies)
            v_ip := split_part(v_headers::json->>'x-forwarded-for', ',', 1)::inet;
        EXCEPTION WHEN OTHERS THEN
            v_ip := NULL;
        END;
        -- Extract User Agent
        v_user_agent := v_headers::json->>'user-agent';
    END IF;

    INSERT INTO public.audit_logs (
        restaurant_id,
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        ip_address,
        user_agent
    )
    VALUES (
        COALESCE(NEW.restaurant_id, OLD.restaurant_id),
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
        v_ip,
        v_user_agent
    );
    RETURN COALESCE(NEW, OLD);
END;
$function$;
