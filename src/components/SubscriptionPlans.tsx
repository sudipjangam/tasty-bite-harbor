import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchSubscriptionPlans } from "@/utils/subscriptionUtils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface SubscriptionPlansProps {
  restaurantId?: string | null;
}

const SubscriptionPlans = ({ restaurantId }: SubscriptionPlansProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [planType, setPlanType] = useState<
    "food_truck" | "restaurant" | "hotel" | "all_in_one"
  >("food_truck");
  const [billingCycle, setBillingCycle] = useState<
    "monthly" | "quarterly" | "half_yearly" | "yearly"
  >("monthly");

  const { data: plans = [] } = useQuery({
    queryKey: ["subscriptionPlans"],
    queryFn: fetchSubscriptionPlans,
  });

  // Filter plans based on selection
  const filteredPlans = plans.filter((plan) => {
    const name = plan.name.toLowerCase();

    // 1. Filter by Plan Type
    let typeMatch = false;
    if (planType === "food_truck") typeMatch = name.includes("food truck");
    else if (planType === "restaurant")
      typeMatch =
        name.includes("restaurant") &&
        !name.includes("hotel") &&
        !name.includes("food truck");
    else if (planType === "hotel")
      typeMatch = name.includes("hotel") && !name.includes("restaurant");
    else if (planType === "all_in_one")
      typeMatch =
        name.includes("all-in-one") ||
        (name.includes("restaurant") && name.includes("hotel"));

    // 2. Filter by Interval (Always show free trials regardless of cycle selection if they belong to the type)
    const isFree = plan.price === "0";
    const intervalMatch = plan.interval === billingCycle;

    return typeMatch && (isFree || intervalMatch);
  });

  const subscribeMutation = useMutation({
    mutationFn: async ({
      planId,
      restaurantId,
      interval,
    }: {
      planId: string;
      restaurantId: string;
      interval: string;
    }) => {
      // Calculate dates for subscription period based on interval
      const now = new Date();
      const endDate = new Date(now);

      switch (interval) {
        case "monthly":
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case "quarterly":
          endDate.setMonth(endDate.getMonth() + 3);
          break;
        case "half_yearly":
          endDate.setMonth(endDate.getMonth() + 6);
          break;
        case "yearly":
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
        default: // Default to monthly if unknown
          endDate.setMonth(endDate.getMonth() + 1);
      }

      const { error } = await supabase.from("restaurant_subscriptions").insert([
        {
          restaurant_id: restaurantId,
          plan_id: planId,
          status: "active",
          current_period_start: now.toISOString(),
          current_period_end: endDate.toISOString(),
          cancel_at_period_end: false,
        },
      ]);

      if (error) throw error;

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Subscription activated successfully",
      });
      queryClient.invalidateQueries();
      navigate("/");
    },
    onError: (error) => {
      console.error("Subscription error:", error);
      toast({
        title: "Error",
        description: "Failed to activate subscription. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = (planId: string, interval: string) => {
    if (!restaurantId) {
      toast({
        title: "Error",
        description: "No restaurant ID found. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    subscribeMutation.mutate({ planId, restaurantId, interval });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/50 to-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/auth")}
          className="flex items-center gap-2 mb-2 hover:bg-secondary/80"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Button>

        <div className="text-center space-y-4 mb-8">
          <h1 className="text-3xl md:text-5xl font-bold text-primary">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Tailored solutions for Food Trucks, Restaurants, and Hotels.
          </p>

          {/* Plan Type Toggles */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {[
              { id: "food_truck", label: "🚚 Food Truck" },
              { id: "restaurant", label: "🍽️ Restaurant" },
              { id: "hotel", label: "hotel" }, // Using lowercase to match state, but label should be "🏨 Hotel"
              { id: "all_in_one", label: "🏢 All-in-One" },
            ].map((type) => (
              <Button
                key={type.id}
                variant={planType === type.id ? "default" : "outline"}
                onClick={() => setPlanType(type.id as any)}
                className="rounded-full px-6"
              >
                {type.id === "hotel" ? "🏨 Hotel" : type.label}
              </Button>
            ))}
          </div>

          {/* Billing Cycle Toggles */}
          <div className="flex flex-wrap justify-center gap-2 mt-4 bg-secondary/30 p-1.5 rounded-full w-fit mx-auto">
            {[
              { id: "monthly", label: "Monthly" },
              { id: "quarterly", label: "Quarterly (-10%)" },
              { id: "half_yearly", label: "Half-Yearly (-15%)" },
              { id: "yearly", label: "Yearly (-20%)" },
            ].map((cycle) => (
              <button
                key={cycle.id}
                onClick={() => setBillingCycle(cycle.id as any)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  billingCycle === cycle.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {cycle.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => {
            // Clean up name for display (remove "- Monthly", "Food Truck", etc if desired, or keep as is)
            // Keeping as is for clarity for now, or maybe just simple mapping
            const displayName = plan.name
              .replace(
                / - (Monthly|Quarterly|Half-Yearly|Yearly|Half_Yearly)/gi,
                "",
              )
              .replace("Food Truck ", "");

            return (
              <Card
                key={plan.id}
                className={`p-6 flex flex-col hover:shadow-xl transition-all duration-300 relative overflow-hidden border-2 ${
                  plan.name.toLowerCase().includes("pro")
                    ? "border-primary/50"
                    : "border-transparent"
                }`}
              >
                {plan.name.toLowerCase().includes("pro") && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 rounded-bl-xl text-xs font-bold uppercase tracking-wider">
                    Best Value
                  </div>
                )}
                {plan.price === "0" && (
                  <div className="absolute top-0 right-0 bg-green-500 text-white px-4 py-1 rounded-bl-xl text-xs font-bold uppercase tracking-wider">
                    Free Trial
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold text-primary">
                    {displayName}
                  </h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold">₹{plan.price}</span>
                    <span className="text-sm text-muted-foreground font-medium">
                      /
                      {plan.price === "0"
                        ? "14 days"
                        : billingCycle.replace("_", "-")}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                    {plan.description}
                  </p>
                </div>

                <div className="flex-grow">
                  {plan.features && Array.isArray(plan.features) && (
                    <ul className="space-y-3">
                      {plan.features.map((feature: string, index: number) => (
                        <li key={index} className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <Button
                  className={`mt-6 w-full ${
                    plan.name.toLowerCase().includes("pro")
                      ? "bg-primary hover:bg-primary/90"
                      : "bg-secondary hover:bg-secondary/80 text-foreground"
                  }`}
                  size="lg"
                  onClick={() => handleSubscribe(plan.id, plan.interval)}
                  disabled={subscribeMutation.isPending}
                >
                  {subscribeMutation.isPending
                    ? "Processing..."
                    : plan.price === "0"
                      ? "Start Free Trial"
                      : "Subscribe Now"}
                </Button>
              </Card>
            );
          })}
        </div>

        {filteredPlans.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No plans available for this selection.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionPlans;
