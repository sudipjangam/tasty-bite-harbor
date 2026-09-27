import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSubscriptionPlans } from "@/utils/subscriptionUtils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, Loader2, Sparkles } from "lucide-react";
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
    activeDiscounts,
  } = useSubscription();

  const [planType, setPlanType] = useState<
    "food_truck" | "restaurant" | "hotel" | "all_in_one"
  >("restaurant");
  const [billingCycle, setBillingCycle] = useState<
    "quarterly" | "half_yearly" | "yearly" | "monthly"
  >("quarterly");

  const { data: plans = [] } = useQuery({
    queryKey: ["subscriptionPlans"],
    queryFn: fetchSubscriptionPlans,
  });

  const TIER_ORDER: Record<string, number> = {
    free: 0,
    starter: 1,
    growth: 2,
    pro: 3,
    professional: 3,
    business: 4,
    franchise: 5,
    enterprise: 6,
  };

  const getTier = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('free') || n.includes('trial')) return 'free';
    if (n.includes('franchise')) return 'franchise';
    if (n.includes('business')) return 'business';
    if (n.includes('professional') || n.includes('pro')) return 'pro';
    if (n.includes('growth')) return 'growth';
    return 'starter';
  };

  // Filter regular plans based on selection
  const filteredPlans = plans
    .filter((plan) => {
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

      // 2. Filter by Interval (Always show free trials regardless of cycle selection)
      const isTrial =
        plan.price === "1" ||
        plan.price === "0" ||
        parseFloat(plan.price) <= 1 ||
        name.includes("trial") ||
        name.includes("free");
      const intervalMatch = plan.interval === billingCycle;

      return typeMatch && (isTrial || intervalMatch);
    })
    .sort((a, b) => {
      const rankA = TIER_ORDER[getTier(a.name)] ?? 99;
      const rankB = TIER_ORDER[getTier(b.name)] ?? 99;
      return rankA - rankB;
    });

  const onSubscribeClick = (planId: string, price: string, planName: string) => {
    if (!restaurantId) {
      return;
    }
    handleSubscribe(planId, price, planName, () => {
      navigate("/dashboard");
    });
  };

  // Find all plans that have a valid discount
  const validDiscounts = (activeDiscounts || []).filter(d => new Date(d.expires_at) > new Date());
  
  const discountedPlans = plans.filter(plan => 
    validDiscounts.some(d => d.plan_id === plan.id)
  );

  // Remove discounted plans from the regular grid so they aren't duplicated
  const regularPlansToDisplay = filteredPlans.filter(plan => 
    !validDiscounts.some(d => d.plan_id === plan.id)
  );

  const renderPlanCard = (plan: any, discountRecord: any) => {
    const displayName = plan.name
      .replace(/ - (Monthly|Quarterly|Half-Yearly|Yearly|Half_Yearly)/gi, "")
      .replace(/^(Food Truck|Restaurant \+ Hotel|Restaurant|Hotel|All-in-One)\s+/i, "")
      .trim();

    const isTrial =
      plan.price === "1" ||
      plan.price === "0" ||
      parseFloat(plan.price) <= 1 ||
      plan.name.toLowerCase().includes("trial");

    const isCurrentPlan = subscription?.plan_id === plan.id && isActive;
    const isPro = plan.name.toLowerCase().includes("pro") || plan.name.toLowerCase().includes("professional");

    const priceNum = parseFloat(plan.price) || 0;
    let intervalLabel = formatInterval(plan.interval);
    let perMonthBreakdown = "";

    if (isTrial) {
      intervalLabel = "14-day evaluation";
    } else if (plan.interval === "quarterly") {
      intervalLabel = "3 months";
      perMonthBreakdown = `(~${formatPrice(Math.round(priceNum / 3))}/mo)`;
    } else if (plan.interval === "half_yearly") {
      intervalLabel = "6 months";
      perMonthBreakdown = `(~${formatPrice(Math.round(priceNum / 6))}/mo)`;
    } else if (plan.interval === "yearly") {
      intervalLabel = "1 year";
      perMonthBreakdown = `(~${formatPrice(Math.round(priceNum / 12))}/mo)`;
    }

    return (
      <Card
        key={plan.id}
        className={`p-6 flex flex-col hover:shadow-xl transition-all duration-300 relative overflow-hidden border-2 ${
          isCurrentPlan
            ? "border-emerald-400 ring-2 ring-emerald-100"
            : discountRecord
              ? "border-rose-400 ring-2 ring-rose-100 scale-[1.02] shadow-lg"
              : isPro
                ? "border-purple-300 ring-2 ring-purple-100 shadow-md"
                : "border-transparent hover:border-gray-200"
        }`}
      >
        {isCurrentPlan && (
          <div className="absolute top-0 right-0 bg-emerald-500 text-white px-4 py-1 rounded-bl-xl text-xs font-bold uppercase tracking-wider">
            Current Plan
          </div>
        )}
        {!isCurrentPlan && discountRecord && (
          <div className="absolute top-0 right-0 bg-rose-500 text-white px-4 py-1 rounded-bl-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
            <Sparkles className="w-3 h-3" /> Special Offer
          </div>
        )}
        {!isCurrentPlan && !discountRecord && isPro && (
          <div className="absolute top-0 right-0 bg-purple-600 text-white px-4 py-1 rounded-bl-xl text-xs font-bold uppercase tracking-wider">
            ⭐ Hero Plan
          </div>
        )}
        {!isCurrentPlan && !discountRecord && isTrial && (
          <div className="absolute top-0 right-0 bg-emerald-600 text-white px-4 py-1 rounded-bl-xl text-xs font-bold uppercase tracking-wider">
            ₹1 Evaluation
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {displayName}
            {discountRecord && <span className="block text-sm font-normal text-rose-500 mt-1">Exclusive Discount Applied</span>}
          </h3>
          <div className="mt-4 flex flex-col gap-1">
            {discountRecord ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-rose-600">
                    {formatPrice(discountRecord.discounted_price.toString())}
                  </span>
                  <span className="text-xl text-slate-400 line-through decoration-rose-200 decoration-2">
                    {formatPrice(plan.price)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm font-bold text-rose-600 bg-rose-100 dark:bg-rose-900/50 px-2.5 py-1 rounded-md">
                    Save {formatPrice((parseFloat(plan.price) - discountRecord.discounted_price).toString())}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    / {formatInterval(plan.interval)}
                  </span>
                </div>
                <p className="text-xs text-rose-500/80 mt-2 font-medium">
                  Offer valid until {new Date(discountRecord.expires_at).toLocaleDateString()}
                </p>
              </>
            ) : (
              <div className="flex flex-col">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold">{formatPrice(plan.price)}</span>
                  <span className="text-sm text-muted-foreground font-medium">
                    / {intervalLabel}
                  </span>
                </div>
                {perMonthBreakdown && (
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 mt-1">
                    Billed upfront {perMonthBreakdown}
                  </span>
                )}
                {isTrial && (
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-1">
                    Full access evaluation • Instant activation
                  </span>
                )}
              </div>
            )}
          </div>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed min-h-[38px]">
            {plan.description}
          </p>
        </div>

        <div className="flex-grow">
          {plan.features && Array.isArray(plan.features) && (
            <ul className="space-y-3">
              {plan.features.map((feature: string, index: number) => (
                <li key={index} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
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
              : discountRecord
                ? "bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-200 dark:shadow-none"
              : isPro
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900"
          }`}
          size="lg"
          onClick={() => onSubscribeClick(plan.id, discountRecord ? discountRecord.discounted_price.toString() : plan.price, plan.name)}
          disabled={isProcessing || isCurrentPlan}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : isCurrentPlan ? (
            "✓ Current Plan"
          ) : discountRecord ? (
            "Claim Special Offer"
          ) : isTrial ? (
            "Start Free Trial (₹1)"
          ) : (
            "Subscribe Now"
          )}
        </Button>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/50 to-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 mb-2 hover:bg-secondary/80"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>

        <div className="text-center space-y-4 mb-8">
          <h1 className="text-3xl md:text-5xl font-bold text-primary">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Tailored solutions for Food Trucks, Restaurants, and Hotels.
          </p>
        </div>

        {/* --- SPECIAL OFFERS SECTION --- */}
        {discountedPlans.length > 0 && (
          <div className="mb-12">
            <div className="text-center mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-semibold text-sm">
                <Sparkles className="w-4 h-4" /> Special Offers For You
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 justify-center">
              {discountedPlans.map(plan => {
                const discountRecord = validDiscounts.find(d => d.plan_id === plan.id);
                return renderPlanCard(plan, discountRecord);
              })}
            </div>
            
            <div className="mt-12 border-b border-border/50 max-w-3xl mx-auto"></div>
          </div>
        )}

        {/* --- REGULAR PLANS SECTION --- */}
        <div className="text-center space-y-4 mb-8">
          {discountedPlans.length > 0 && (
            <h2 className="text-2xl font-semibold text-slate-700 dark:text-slate-300">
              Other Available Plans
            </h2>
          )}
          
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
              { id: "quarterly", label: "3 Months" },
              { id: "half_yearly", label: "6 Months (-15%)" },
              { id: "yearly", label: "1 Year (-30% ⭐ Best Value)" },
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
          {regularPlansToDisplay.map((plan) => renderPlanCard(plan, null))}
        </div>

        {regularPlansToDisplay.length === 0 && discountedPlans.length === 0 && (
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
