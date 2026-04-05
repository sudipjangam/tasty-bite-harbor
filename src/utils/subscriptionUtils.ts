import { supabase } from "@/integrations/supabase/client";

export const checkSubscriptionStatus = async (restaurantId: string) => {
  try {
    // First, check if restaurant_id exists
    if (!restaurantId) {
      console.log("No restaurant ID provided");
      return false;
    }

    // Use maybeSingle instead of single to prevent error when no rows are found
    const { data: subscription, error } = await supabase
      .from("restaurant_subscriptions")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      console.error("Error checking subscription:", error);
      return false;
    }

    if (!subscription) {
      console.log("No active subscription found for restaurant:", restaurantId);
      return false;
    }

    const currentPeriodEnd = new Date(subscription.current_period_end);
    return currentPeriodEnd > new Date();
  } catch (error) {
    console.error("Error in checkSubscriptionStatus:", error);
    return false;
  }
};

export const fetchSubscriptionPlans = async () => {
  try {
    const { data: plans, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching plans:", error);
      return [];
    }

    return plans;
  } catch (error) {
    console.error("Error in fetchSubscriptionPlans:", error);
    return [];
  }
};

export const fetchAllowedComponents = async (restaurantId: string): Promise<string[]> => {
  try {
    if (!restaurantId) {
      console.log("fetchAllowedComponents: No restaurant ID provided");
      return [];
    }

    console.log("fetchAllowedComponents: Fetching for restaurant:", restaurantId);

    // Get active subscription with plan details
    const { data: subscription, error } = await supabase
      .from("restaurant_subscriptions")
      .select(`
        status,
        plan_id,
        subscription_plans:plan_id (
          components
        )
      `)
      .eq("restaurant_id", restaurantId)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      console.error("fetchAllowedComponents: Error fetching subscription:", error);
      return [];
    }

    console.log("fetchAllowedComponents: Raw subscription data:", JSON.stringify(subscription, null, 2));

    if (!subscription || !subscription.subscription_plans) {
      console.log("fetchAllowedComponents: No active subscription or plan found");
      return [];
    }

    // Fix: The subscription_plans might be returned as an array in some cases
    // We need to handle both cases (object or array) to safely access components
    let planComponents: any;
    
    if (Array.isArray(subscription.subscription_plans)) {
      // If it's an array, take the first item
      planComponents = subscription.subscription_plans[0];
      console.log("fetchAllowedComponents: Plan components (from array):", planComponents);
    } else {
      // Otherwise use it as is
      planComponents = subscription.subscription_plans;
      console.log("fetchAllowedComponents: Plan components (from object):", planComponents);
    }
    
    const componentsJson = planComponents?.components || [];
    console.log("fetchAllowedComponents: Components JSON:", componentsJson);
    
    // Safely convert the JSON array to string array with type checking
    const componentsArray: string[] = [];
    if (Array.isArray(componentsJson)) {
      componentsJson.forEach(item => {
        if (typeof item === 'string') {
          componentsArray.push(item);
        }
      });
    }
    
    console.log("fetchAllowedComponents: Final components array:", componentsArray);
    
    return componentsArray;
  } catch (error) {
    console.error("fetchAllowedComponents: Exception:", error);
    return [];
  }
};

// ─── Granular Feature Access (Dot-Notation + Wildcard) ──────────────────

/**
 * Check if a specific feature key is granted by the plan's feature list.
 * Supports:
 * - Exact match: 'reports.default.staff' is in the plan array
 * - Wildcard match: 'reports.*' grants 'reports.default.staff'
 * - Multi-level wildcard: 'reports.default.*' grants 'reports.default.staff'
 * 
 * @param featureKey - The dot-notation feature key to check (e.g., 'reports.default.staff')
 * @param planFeatures - The array of feature keys from the subscription plan
 * @returns true if the feature is accessible
 */
export const hasFeatureAccess = (featureKey: string, planFeatures: string[]): boolean => {
  if (!featureKey || !planFeatures || planFeatures.length === 0) return false;

  const normalizedKey = featureKey.toLowerCase().trim();
  const normalizedPlan = planFeatures.map((f) => f.toLowerCase().trim());

  // 1. Exact match
  if (normalizedPlan.includes(normalizedKey)) return true;

  // 2. Wildcard match — walk up the hierarchy
  // e.g., for 'reports.default.staff', check:
  //   'reports.default.*' → 'reports.*'
  const segments = normalizedKey.split('.');
  for (let i = segments.length - 1; i >= 1; i--) {
    const wildcardKey = segments.slice(0, i).join('.') + '.*';
    if (normalizedPlan.includes(wildcardKey)) return true;
  }

  // 3. Legacy flat-key fallback (e.g. if DB has 'reports' instead of 'reports.*')
  // This ensures live users aren't locked out before the migration script runs.
  const rootKey = segments[0];
  if (normalizedPlan.includes(rootKey)) return true;
  
  // Specific legacy mappings
  if (rootKey === 'users_permissions') {
    if (normalizedPlan.includes('user-management') || normalizedPlan.includes('permission-management')) return true;
  }
  if (rootKey === 'quickserve' && normalizedPlan.includes('qsr-pos')) return true;

  return false;
};

/**
 * Fetch the minimum plan name required for a given feature key.
 * Queries all active plans and returns the cheapest one that includes the feature.
 * Used by the upgrade toast to tell users which plan they need.
 * 
 * @param featureKey - The dot-notation feature key
 * @returns The plan name (e.g., 'Starter') or null if no plan includes it
 */
export const getRequiredPlanForFeature = async (featureKey: string): Promise<string | null> => {
  try {
    const { data: plans, error } = await supabase
      .from("subscription_plans")
      .select("name, price, components")
      .eq("is_active", true)
      .order("price", { ascending: true });

    if (error || !plans) return null;

    for (const plan of plans) {
      const components = Array.isArray(plan.components) ? plan.components : [];
      if (hasFeatureAccess(featureKey, components as string[])) {
        return plan.name;
      }
    }

    return null;
  } catch (error) {
    console.error("getRequiredPlanForFeature: Error:", error);
    return null;
  }
};
