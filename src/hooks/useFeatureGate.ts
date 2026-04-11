import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import { fetchAllowedComponents, hasFeatureAccess, getRequiredPlanForFeature } from '@/utils/subscriptionUtils';
import { getFeatureLabel } from '@/constants/featureRegistry';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Cache for subscription components to avoid repeated DB calls.
 * Shared across all useFeatureGate instances for the same restaurant.
 */
let cachedRestaurantId: string | null = null;
let cachedComponents: string[] | null = null;
let cachePromise: Promise<string[]> | null = null;

/** Listeners that get called when cache is invalidated (for re-renders) */
const cacheListeners = new Set<() => void>();

const fetchWithCache = async (restaurantId: string): Promise<string[]> => {
  if (cachedRestaurantId === restaurantId && cachedComponents !== null) {
    return cachedComponents;
  }

  // If already fetching for this restaurant, reuse the in-flight promise
  if (cachedRestaurantId === restaurantId && cachePromise) {
    return cachePromise;
  }

  cachedRestaurantId = restaurantId;
  cachePromise = fetchAllowedComponents(restaurantId).then((components) => {
    cachedComponents = components;
    cachePromise = null;
    return components;
  });

  return cachePromise;
};

/**
 * Invalidate the feature cache. Call this when plans are updated in admin.
 * Notifies all mounted useFeatureGate hooks to re-fetch.
 */
export const invalidateFeatureCache = () => {
  cachedRestaurantId = null;
  cachedComponents = null;
  cachePromise = null;
  // Notify all listeners to re-fetch
  cacheListeners.forEach((listener) => listener());
};

// ─── Supabase Realtime: auto-invalidate on plan changes ─────────────────
// Single shared channel across all hook instances
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let realtimeSubscriberCount = 0;

const subscribeToRealtimeUpdates = () => {
  realtimeSubscriberCount++;
  if (realtimeChannel) return; // Already subscribed

  realtimeChannel = supabase
    .channel('feature-gate-plan-changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'subscription_plans',
      },
      (payload) => {
        console.log('[useFeatureGate] Plan updated via Realtime, invalidating cache:', payload.new?.id);
        invalidateFeatureCache();
      }
    )
    .subscribe((status) => {
      console.log('[useFeatureGate] Realtime subscription status:', status);
    });
};

const unsubscribeFromRealtimeUpdates = () => {
  realtimeSubscriberCount--;
  if (realtimeSubscriberCount <= 0 && realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
    realtimeSubscriberCount = 0;
  }
};

interface UseFeatureGateResult {
  /** Whether this feature is locked (no access) */
  isLocked: boolean;
  /** Whether the access check is still loading */
  loading: boolean;
  /** Show the upgrade toast with the correct plan name */
  showUpgradeToast: () => void;
  /** The plan name required to unlock this feature (or null if loading/available) */
  requiredPlan: string | null;
}

/**
 * Hook to check if a granular feature is accessible for the current user's plan.
 * 
 * Includes Supabase Realtime subscription: when an admin updates plan features,
 * all connected users' FeatureLock components update immediately.
 * 
 * Usage:
 * ```tsx
 * const { isLocked, showUpgradeToast } = useFeatureGate('reports.default.staff');
 * 
 * if (isLocked) {
 *   showUpgradeToast();
 *   return;
 * }
 * ```
 * 
 * @param featureKey - Dot-notation feature key from the registry (e.g., 'pos.whatsapp_billing')
 */
export const useFeatureGate = (featureKey: string): UseFeatureGateResult => {
  const { user } = useAuth();
  const [planComponents, setPlanComponents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [requiredPlan, setRequiredPlan] = useState<string | null>(null);
  const [, forceUpdate] = useState(0); // Trigger re-render on cache invalidation

  // Subscribe to Realtime updates
  useEffect(() => {
    subscribeToRealtimeUpdates();
    return () => unsubscribeFromRealtimeUpdates();
  }, []);

  // Listen for cache invalidations → re-fetch
  useEffect(() => {
    const listener = () => {
      forceUpdate((n) => n + 1);
      setLoading(true);
    };
    cacheListeners.add(listener);
    return () => {
      cacheListeners.delete(listener);
    };
  }, []);

  // Fetch plan components
  useEffect(() => {
    const load = async () => {
      if (!user?.restaurant_id) {
        setPlanComponents([]);
        setLoading(false);
        return;
      }

      try {
        const components = await fetchWithCache(user.restaurant_id);
        setPlanComponents(components);
      } catch (error) {
        console.error('[useFeatureGate] Error loading components:', error);
        setPlanComponents([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.restaurant_id, forceUpdate]);

  // Determine if locked
  const isLocked = useMemo(() => {
    if (loading) return false; // Don't lock while loading
    if (!featureKey) return false;
    return !hasFeatureAccess(featureKey, planComponents);
  }, [featureKey, planComponents, loading]);

  // Fetch required plan name when locked
  useEffect(() => {
    if (isLocked && featureKey) {
      getRequiredPlanForFeature(featureKey).then(setRequiredPlan);
    } else {
      setRequiredPlan(null);
    }
  }, [isLocked, featureKey]);

  // Show upgrade toast
  const showUpgradeToast = useCallback(() => {
    const featureLabel = getFeatureLabel(featureKey);
    const planName = requiredPlan || 'a higher';

    toast.error('🔒 Upgrade Required', {
      description: `"${featureLabel}" is available on the ${planName} plan. Contact your admin or call +91 884-567-4567 to upgrade.`,
      duration: 6000,
      action: {
        label: 'Dismiss',
        onClick: () => {},
      },
    });
  }, [featureKey, requiredPlan]);

  return {
    isLocked,
    loading,
    showUpgradeToast,
    requiredPlan,
  };
};

