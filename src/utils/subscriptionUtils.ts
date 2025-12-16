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
