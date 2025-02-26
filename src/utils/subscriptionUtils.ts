
import { supabase } from "@/integrations/supabase/client";

export const checkSubscriptionStatus = async (restaurantId: string) => {
  const { data: subscription, error } = await supabase
    .from("restaurant_subscriptions")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("status", "active")
    .single();

  if (error) {
    console.error("Error checking subscription:", error);
    return false;
  }

  if (!subscription) {
    return false;
  }

  const currentPeriodEnd = new Date(subscription.current_period_end);
  return currentPeriodEnd > new Date();
};

export const fetchSubscriptionPlans = async () => {
  const { data: plans, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching plans:", error);
    return [];
  }

  return plans;
};
