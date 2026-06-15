import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSubscriptionPlans } from "@/utils/subscriptionUtils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { formatPrice, formatInterval } from "@/utils/razorpayUtils";

interface SubscriptionPlansProps {
  restaurantId?: string | null;
}

const SubscriptionPlans = ({ restaurantId }: SubscriptionPlansProps) => {
  const navigate = useNavigate();

  const {
    subscription,
    isActive,
    handleSubscribe,
    isProcessing,
    activeDiscount,
  } = useSubscription();

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

  const onSubscribeClick = (planId: string, price: string, planName: string) => {
    if (!restaurantId) {
      return;
    }
    handleSubscribe(planId, price, planName, () => {
      navigate("/dashboard");
    });
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
              { id: "hotel", label: "🏨 Hotel" },
              { id: "all_in_one", label: "🏢 All-in-One" },
            ].map((type) => (
              <Button
                key={type.id}
                variant={planType === type.id ? "default" : "outline"}
                onClick={() => setPlanType(type.id as any)}
                className="rounded-full px-6"
              >
                {type.label}
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
            const displayName = plan.name
              .replace(
                / - (Monthly|Quarterly|Half-Yearly|Yearly|Half_Yearly)/gi,
                "",
              )
              .replace("Food Truck ", "");

            const isFree = plan.price === "0";
            const isCurrentPlan = subscription?.plan_id === plan.id && isActive;
            
            // Apply active discount if available for this plan and not expired
            const discount = activeDiscount?.plan_id === plan.id && 
              new Date(activeDiscount.expires_at) > new Date() ? activeDiscount : null;

            return (
              <Card
                key={plan.id}
                className={`p-6 flex flex-col hover:shadow-xl transition-all duration-300 relative overflow-hidden border-2 ${
                  isCurrentPlan
                    ? "border-emerald-400 ring-2 ring-emerald-100"
                    : plan.name.toLowerCase().includes("pro")
                      ? "border-primary/50"
                      : "border-transparent"
                } ${discount ? "border-rose-400 ring-2 ring-rose-100" : ""}`}
              >
                {isCurrentPlan && (
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white px-4 py-1 rounded-bl-xl text-xs font-bold uppercase tracking-wider">
                    Current Plan
                  </div>
                )}
                {!isCurrentPlan && plan.name.toLowerCase().includes("pro") && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 rounded-bl-xl text-xs font-bold uppercase tracking-wider">
                    Best Value
                  </div>
                )}
                {!isCurrentPlan && isFree && (
                  <div className="absolute top-0 right-0 bg-green-500 text-white px-4 py-1 rounded-bl-xl text-xs font-bold uppercase tracking-wider">
                    Free Trial
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold text-primary">
                    {displayName}
                  </h3>
                  <div className="mt-4 flex flex-col gap-1">
                    {discount ? (
                      <>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-rose-600">
                            {formatPrice(discount.discounted_price.toString())}
                          </span>
                          <span className="text-lg text-slate-400 line-through">
                            {formatPrice(plan.price)}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-md w-fit">
                          Special Offer • Save {formatPrice((parseFloat(plan.price) - discount.discounted_price).toString())}
                        </span>
                      </>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">{formatPrice(plan.price)}</span>
                        <span className="text-sm text-muted-foreground font-medium">
                          / {isFree ? "14 days" : formatInterval(billingCycle)}
                        </span>
                      </div>
                    )}
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
                    isCurrentPlan
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 cursor-default"
                      : discount
                        ? "bg-rose-600 hover:bg-rose-700 text-white"
                      : plan.name.toLowerCase().includes("pro")
                        ? "bg-primary hover:bg-primary/90"
                        : "bg-secondary hover:bg-secondary/80 text-foreground"
                  }`}
                  size="lg"
                  onClick={() => onSubscribeClick(plan.id, discount ? discount.discounted_price.toString() : plan.price, plan.name)}
                  disabled={isProcessing || isCurrentPlan}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : isCurrentPlan ? (
                    "✓ Current Plan"
                  ) : discount ? (
                    "Claim Special Offer"
                  ) : isFree ? (
                    "Start Free Trial"
                  ) : (
                    "Subscribe Now"
                  )}
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
