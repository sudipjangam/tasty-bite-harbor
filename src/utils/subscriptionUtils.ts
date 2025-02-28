
import { supabase } from "@/integrations/supabase/client";

export const checkSubscriptionStatus = async (restaurantId: string) => {
  try {
    // First, check if restaurant_id exists
    if (!restaurantId) {
      console.log("No restaurant ID provided");
      return false;
    }

    // Check for cached result
    const cachedResult = localStorage.getItem(`subscription_${restaurantId}`);
    const cachedTimestamp = localStorage.getItem(`subscription_timestamp_${restaurantId}`);
    
    // If we have a cached result and it's less than 5 minutes old, use it
    if (cachedResult && cachedTimestamp) {
      const now = new Date().getTime();
      const timestamp = parseInt(cachedTimestamp, 10);
      
      // Cache valid for 5 minutes (300000 ms)
      if (now - timestamp < 300000) {
        return cachedResult === 'true';
      }
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

    let result = false;
    
    if (subscription) {
      const currentPeriodEnd = new Date(subscription.current_period_end);
      result = currentPeriodEnd > new Date();
    } else {
      console.log("No active subscription found for restaurant:", restaurantId);
    }
    
    // Cache the result
    localStorage.setItem(`subscription_${restaurantId}`, result.toString());
    localStorage.setItem(`subscription_timestamp_${restaurantId}`, new Date().getTime().toString());
    
    return result;
  } catch (error) {
    console.error("Error in checkSubscriptionStatus:", error);
    return false;
  }
};

export const fetchSubscriptionPlans = async () => {
  try {
    // Check for cached plans
    const cachedPlans = localStorage.getItem('subscription_plans');
    const cachedTimestamp = localStorage.getItem('subscription_plans_timestamp');
    
    // If we have cached plans and they're less than 10 minutes old, use them
    if (cachedPlans && cachedTimestamp) {
      const now = new Date().getTime();
      const timestamp = parseInt(cachedTimestamp, 10);
      
      // Cache valid for 10 minutes (600000 ms)
      if (now - timestamp < 600000) {
        return JSON.parse(cachedPlans);
      }
    }

    const { data: plans, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching plans:", error);
      return [];
    }
    
    // Cache the plans
    localStorage.setItem('subscription_plans', JSON.stringify(plans));
    localStorage.setItem('subscription_plans_timestamp', new Date().getTime().toString());

    return plans;
  } catch (error) {
    console.error("Error in fetchSubscriptionPlans:", error);
    return [];
  }
};
