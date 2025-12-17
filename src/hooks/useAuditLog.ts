import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AuditAction = 
  | 'create' 
  | 'read'
  | 'update' 
  | 'delete' 
  | 'login' 
  | 'logout' 
  | 'login_failed'
  | 'export'
  | 'import'
  | 'backup'
  | 'restore'
  | 'settings_change'
  | 'permission_change';

interface AuditLogEntry {
  action: AuditAction;
  table_name: string;
  record_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  description?: string;
}

interface UseAuditLogReturn {
  logAction: (entry: AuditLogEntry) => Promise<void>;
  logCreate: (tableName: string, recordId: string, newValues: Record<string, any>) => Promise<void>;
  logUpdate: (tableName: string, recordId: string, oldValues: Record<string, any>, newValues: Record<string, any>) => Promise<void>;
  logDelete: (tableName: string, recordId: string, oldValues: Record<string, any>) => Promise<void>;
  logLogin: (success: boolean, email?: string) => Promise<void>;
  logExport: (tableName: string, recordCount?: number) => Promise<void>;
}

/**
 * Gets the client's IP address using multiple methods
 */
const getClientIP = async (): Promise<string | null> => {
  try {
    // Try to get IP from a public API
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    const data = await response.json();
    return data.ip;
  } catch {
    // Fallback: return null if we can't get the IP
    return null;
  }
};

/**
 * Gets browser/user agent information
 */
const getUserAgent = (): string => {
  if (typeof navigator !== 'undefined') {
    return navigator.userAgent;
  }
  return 'Unknown';
};

/**
 * Custom hook for audit logging with automatic user, IP, and metadata capture
 */
export const useAuditLog = (): UseAuditLogReturn => {
  const { user } = useAuth();
  const ipCache = useRef<string | null>(null);
  const ipFetchPromise = useRef<Promise<string | null> | null>(null);

  // Lazy load IP address (cache it for the session)
  const getIP = useCallback(async (): Promise<string | null> => {
    if (ipCache.current) {
      return ipCache.current;
    }
    
    if (!ipFetchPromise.current) {
      ipFetchPromise.current = getClientIP().then(ip => {
        ipCache.current = ip;
        return ip;
      });
    }
    
    return ipFetchPromise.current;
  }, []);

  /**
   * Main logging function - creates an audit log entry
   */
  const logAction = useCallback(async (entry: AuditLogEntry): Promise<void> => {
    try {
      // Skip if no restaurant context
      if (!user?.restaurant_id) {
        console.warn('Audit log skipped: No restaurant_id in user context');
        return;
      }

      // Get IP address (non-blocking, use cached value if available)
      const ipAddress = await getIP();
      const userAgent = getUserAgent();

      // Sanitize values to remove sensitive data
      const sanitizeValues = (values: Record<string, any> | undefined) => {
        if (!values) return null;
        const sanitized = { ...values };
        // Remove sensitive fields
        delete sanitized.password;
        delete sanitized.password_hash;
        delete sanitized.api_key;
        delete sanitized.api_secret;
        delete sanitized.token;
        return sanitized;
      };

      const { error } = await supabase
        .from('audit_logs')
        .insert({
          action: entry.action,
          table_name: entry.table_name,
          record_id: entry.record_id || null,
          old_values: sanitizeValues(entry.old_values),
          new_values: sanitizeValues(entry.new_values),
          user_id: user.id,
          restaurant_id: user.restaurant_id,
          ip_address: ipAddress,
          user_agent: userAgent
        });

      if (error) {
        console.error('Failed to create audit log:', error);
      }
    } catch (err) {
      // Don't throw - audit logging should never break the main flow
      console.error('Audit log error:', err);
    }
  }, [user, getIP]);

  /**
   * Log a CREATE action
   */
  const logCreate = useCallback(async (
    tableName: string,
    recordId: string,
    newValues: Record<string, any>
  ): Promise<void> => {
    await logAction({
      action: 'create',
      table_name: tableName,
      record_id: recordId,
      new_values: newValues
    });
  }, [logAction]);

  /**
   * Log an UPDATE action with old and new values
   */
  const logUpdate = useCallback(async (
    tableName: string,
    recordId: string,
    oldValues: Record<string, any>,
    newValues: Record<string, any>
  ): Promise<void> => {
    await logAction({
      action: 'update',
      table_name: tableName,
      record_id: recordId,
      old_values: oldValues,
      new_values: newValues
    });
  }, [logAction]);

  /**
   * Log a DELETE action
   */
  const logDelete = useCallback(async (
    tableName: string,
    recordId: string,
    oldValues: Record<string, any>
  ): Promise<void> => {
    await logAction({
      action: 'delete',
      table_name: tableName,
      record_id: recordId,
      old_values: oldValues
    });
  }, [logAction]);

  /**
   * Log login attempts (success or failure)
   */
  const logLogin = useCallback(async (
    success: boolean,
    email?: string
  ): Promise<void> => {
    // For login, we might not have user context yet
    const ipAddress = await getIP();
    const userAgent = getUserAgent();

    try {
      // Get restaurant_id from profiles if we have user context
      let restaurantId = user?.restaurant_id;
      
      if (!restaurantId && email) {
        // Try to get restaurant_id from the email's profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('restaurant_id')
          .eq('email', email)
          .single();
        restaurantId = profile?.restaurant_id;
      }

      if (!restaurantId) {
        console.warn('Audit log skipped for login: No restaurant_id found');
        return;
      }

      await supabase
        .from('audit_logs')
        .insert({
          action: success ? 'login' : 'login_failed',
          table_name: 'auth',
          record_id: email || null,
          new_values: { email, success },
          user_id: user?.id || null,
          restaurant_id: restaurantId,
          ip_address: ipAddress,
          user_agent: userAgent
        });
    } catch (err) {
      console.error('Login audit log error:', err);
    }
  }, [user, getIP]);

  /**
   * Log data export actions
   */
  const logExport = useCallback(async (
    tableName: string,
    recordCount?: number
  ): Promise<void> => {
    await logAction({
      action: 'export',
      table_name: tableName,
      new_values: { record_count: recordCount, exported_at: new Date().toISOString() }
    });
  }, [logAction]);

  return {
    logAction,
    logCreate,
    logUpdate,
    logDelete,
    logLogin,
    logExport
  };
};

export default useAuditLog;
