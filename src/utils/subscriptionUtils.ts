
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
      console.log("No restaurant ID provided");
      return [];
    }

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
      console.error("Error fetching allowed components:", error);
      return [];
    }

    if (!subscription || !subscription.subscription_plans) {
      console.log("No active subscription or plan found for restaurant:", restaurantId);
      return [];
    }

    // Extract components array from the plan
    const components = subscription.subscription_plans.components || [];
    return Array.isArray(components) ? components : [];
  } catch (error) {
    console.error("Error in fetchAllowedComponents:", error);
    return [];
  }
};
