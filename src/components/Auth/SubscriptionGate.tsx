import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PageLoader } from '@/components/ui/page-loader';

/**
 * SubscriptionGate wraps the dashboard routes.
 * If the user's restaurant has no active subscription (expired/inactive/missing),
 * they are redirected to the standalone /subscription page.
 *
 * Bypassed for:
 * - Platform admins (role_has_full_access)
 * - Users without a restaurant_id (new signups still setting up)
 */
const SubscriptionGate = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'active' | 'expired'>('loading');

  useEffect(() => {
    const checkSubscription = async () => {
      // Admins bypass subscription check
      if (user?.role_has_full_access) {
        setStatus('active');
        return;
      }

      // No restaurant linked yet — let them through (they'll hit onboarding)
      if (!user?.restaurant_id) {
        setStatus('active');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('restaurant_subscriptions')
          .select('status, current_period_end')
          .eq('restaurant_id', user.restaurant_id)
          .maybeSingle();

        if (error) {
          console.error('[SubscriptionGate] Error:', error);
          // On error, allow through to avoid locking users out
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
        setStatus('active'); // Fail open to avoid lockout
      }
    };

    if (user) {
      checkSubscription();
    }
  }, [user?.restaurant_id, user?.role_has_full_access]);

  if (status === 'loading') {
    return <PageLoader />;
  }

  if (status === 'expired') {
    return <Navigate to="/subscription" replace />;
  }

  return <>{children}</>;
};

export default SubscriptionGate;
