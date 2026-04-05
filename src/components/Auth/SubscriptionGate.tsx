import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PageLoader } from '@/components/ui/page-loader';

/**
 * SubscriptionGate wraps the dashboard routes.
 * If the user's restaurant has no active subscription (expired/inactive/missing),
 * they are redirected to the standalone /subscription page.
 *
 * Bypassed for:
 * - Users without a restaurant_id (new signups or platform-only admins)
 * - Admin system routes (/platform, /security, /settings) — these are
 *   admin-only tools, not restaurant operations, and should remain accessible
 *   so admins can always manage the platform and fix subscription issues.
 *
 * NOT bypassed for:
 * - Admins operating restaurant features (dashboard, POS, orders, etc.)
 *   The restaurant must have a valid subscription for these to work.
 */

// Admin-only system paths that bypass the subscription gate
const ADMIN_BYPASS_PATHS = ['/platform', '/security', '/settings'];

const SubscriptionGate = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [status, setStatus] = useState<'loading' | 'active' | 'expired'>('loading');

  // Check if current path is an admin system route
  const isAdminSystemRoute = ADMIN_BYPASS_PATHS.some(
    (path) => location.pathname === path || location.pathname.startsWith(path + '/')
  );

  useEffect(() => {
    const checkSubscription = async () => {
      // No restaurant linked yet — let them through (they'll hit onboarding)
      if (!user?.restaurant_id) {
        setStatus('active');
        return;
      }

      // Admin system routes bypass subscription check
      // (these are platform admin tools, not restaurant operations)
      if (isAdminSystemRoute && user?.role_has_full_access) {
        setStatus('active');
        return;
      }

      try {
        // Fetch the LATEST subscription for this restaurant
        const { data, error } = await supabase
          .from('restaurant_subscriptions')
          .select('status, current_period_end')
          .eq('restaurant_id', user.restaurant_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('[SubscriptionGate] Error:', error);
          setStatus('active');
          return;
        }

        // No subscription record at all
        if (!data) {
          setStatus('expired');
          return;
        }

        // Check both DB status and date
        const isActive =
          data.status === 'active' &&
          new Date(data.current_period_end) > new Date();

        setStatus(isActive ? 'active' : 'expired');
      } catch (err) {
        console.error('[SubscriptionGate] Exception:', err);
        setStatus('active');
      }
    };

    if (user) {
      checkSubscription();
    }
  }, [user?.restaurant_id, location.pathname]);

  if (status === 'loading') {
    return <PageLoader />;
  }

  if (status === 'expired') {
    return <Navigate to="/subscription" replace />;
  }

  return <>{children}</>;
};

export default SubscriptionGate;

