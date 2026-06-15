import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { formatPrice, formatInterval } from "@/utils/razorpayUtils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Check,
  Loader2,
  Shield,
  CreditCard,
  Headphones,
  Sparkles,
  Clock,
  ArrowRight,
  LogIn,
} from "lucide-react";
import AuthForm from "@/components/Auth/AuthForm";
import type { AuthMode } from "@/pages/Auth";

const SpecialOfferPage = () => {
  const { discountId } = useParams<{ discountId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [authMode, setAuthMode] = useState<AuthMode>("signin");

  const {
    handleSubscribe,
    isProcessing,
  } = useSubscription();

  // Fetch the discount + plan info
  const {
    data: offerData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["special-offer", discountId],
    queryFn: async () => {
      if (!discountId) throw new Error("No discount ID");

      const { data, error } = await supabase
        .from("subscription_discounts")
        .select("*, subscription_plans:plan_id(*)")
        .eq("id", discountId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Offer not found");

      return data;
    },
    enabled: !!discountId,
  });

  const plan = offerData?.subscription_plans
    ? Array.isArray(offerData.subscription_plans)
      ? offerData.subscription_plans[0]
      : offerData.subscription_plans
    : null;

  const isExpired =
    offerData?.status !== "active" ||
    (offerData?.expires_at && new Date(offerData.expires_at) <= new Date());

  const isUsed = offerData?.status === "used";

  // Calculate days remaining
  const daysRemaining = offerData?.expires_at
    ? Math.max(
        0,
        Math.ceil(
          (new Date(offerData.expires_at).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  // Clean display name
  const displayName = plan
    ? plan.name
        .replace(
          / - (Monthly|Quarterly|Half-Yearly|Yearly|Half_Yearly)/gi,
          ""
        )
        .replace("Food Truck ", "")
        .trim()
    : "";

  const handleClaimOffer = () => {
    if (!plan || !offerData) return;
    handleSubscribe(
      plan.id,
      offerData.discounted_price.toString(),
      plan.name,
      () => navigate("/dashboard")
    );
  };

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-rose-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-200 border-t-rose-600" />
          <p className="text-muted-foreground">Loading offer...</p>
        </div>
      </div>
    );
  }

  // Error / not found
  if (error || !offerData || !plan) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-rose-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <Card className="max-w-md mx-4 p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">😕</span>
          </div>
          <h2 className="text-xl font-bold">Offer Not Found</h2>
          <p className="text-muted-foreground text-sm">
            This offer link is invalid or has been removed.
          </p>
          <Button onClick={() => navigate("/subscription")} className="mt-4">
            Browse All Plans <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Card>
      </div>
    );
  }

  // Expired / used
  if (isExpired || isUsed) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-rose-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <Card className="max-w-md mx-4 p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold">
            {isUsed ? "Offer Already Used" : "Offer Expired"}
          </h2>
          <p className="text-muted-foreground text-sm">
            {isUsed
              ? "This special offer has already been claimed."
              : "This special offer has expired. Check out our other plans!"}
          </p>
          <Button onClick={() => navigate("/subscription")} className="mt-4">
            Browse All Plans <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Card>
      </div>
    );
  }

  // Not logged in — show auth form alongside the offer preview
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-16">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-4">
              <img
                src="/swadeshi-logo2.png"
                alt="Swadeshi Solutions"
                className="w-10 h-10"
              />
              <span className="text-2xl font-extrabold text-[#2E3192]">
                Swadeshi
              </span>
              <span className="text-2xl font-extrabold text-[#F26722]">
                Solutions
              </span>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-10 items-start">
            {/* Left — Offer Preview */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 font-semibold text-sm">
                <Sparkles className="w-4 h-4" /> Exclusive Offer for{" "}
                {offerData.restaurant_name}
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
                {displayName}
              </h1>
              <p className="text-muted-foreground">{plan.description}</p>

              {/* Pricing */}
              <div className="space-y-3">
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-extrabold text-rose-600">
                    {formatPrice(offerData.discounted_price.toString())}
                  </span>
                  <span className="text-2xl text-slate-400 line-through decoration-rose-300 decoration-2">
                    {formatPrice(offerData.original_price.toString())}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-white bg-rose-500 px-3 py-1 rounded-full">
                    Save{" "}
                    {formatPrice(offerData.discount_amount.toString())}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    / {formatInterval(plan.interval)}
                  </span>
                </div>
                {daysRemaining > 0 && (
                  <p className="text-sm text-rose-500 font-medium flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {daysRemaining === 1
                      ? "Expires today!"
                      : `${daysRemaining} days remaining`}
                  </p>
                )}
              </div>

              {/* Features */}
              {plan.features && Array.isArray(plan.features) && (
                <ul className="space-y-2.5 pt-4 border-t">
                  {plan.features.map((feature: string, index: number) => (
                    <li key={index} className="flex items-start gap-2.5">
                      <div className="mt-0.5 p-0.5 rounded-full bg-gradient-to-r from-rose-500 to-purple-600">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Right — Login Form */}
            <div>
              <Card className="shadow-2xl border-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-rose-500 via-purple-500 to-[#2E3192]" />
                <div className="p-6 pb-2 text-center">
                  <LogIn className="w-8 h-8 text-rose-600 mx-auto mb-3" />
                  <h3 className="text-lg font-bold">
                    Login to Claim Your Offer
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sign in to your account to activate this special price
                  </p>
                </div>
                <AuthForm 
                  authMode={authMode} 
                  setAuthMode={setAuthMode} 
                  onSuccess={() => {
                    // Do nothing — the user state will update and the component will re-render
                    // to show the logged-in Offer page instead of redirecting to dashboard
                  }}
                />
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Logged in — show the full offer page with Claim button
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <img
              src="/swadeshi-logo2.png"
              alt="Swadeshi Solutions"
              className="w-10 h-10"
            />
            <span className="text-2xl font-extrabold text-[#2E3192]">
              Swadeshi
            </span>
            <span className="text-2xl font-extrabold text-[#F26722]">
              Solutions
            </span>
          </div>
        </div>

        {/* Offer Card */}
        <Card className="overflow-hidden border-2 border-rose-200 dark:border-rose-800 shadow-2xl shadow-rose-100/40">
          {/* Top gradient bar */}
          <div className="h-2 bg-gradient-to-r from-rose-500 via-purple-500 to-[#2E3192]" />

          <div className="p-6 md:p-10">
            {/* Exclusive badge */}
            <div className="flex items-center justify-between mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 font-semibold text-sm">
                <Sparkles className="w-4 h-4" /> Exclusive Offer
              </div>
              {daysRemaining > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-rose-500 font-medium">
                  <Clock className="w-4 h-4" />
                  {daysRemaining === 1
                    ? "Expires today!"
                    : `${daysRemaining} days remaining`}
                </div>
              )}
            </div>

            {/* Plan name + description */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {displayName}
            </h1>
            <p className="text-muted-foreground mb-8">{plan.description}</p>

            {/* Pricing section */}
            <div className="bg-gradient-to-r from-rose-50 to-purple-50 dark:from-rose-950/30 dark:to-purple-950/30 rounded-2xl p-6 md:p-8 mb-8">
              <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Special Price</p>
                  <span className="text-5xl md:text-6xl font-extrabold text-rose-600">
                    {formatPrice(offerData.discounted_price.toString())}
                  </span>
                </div>
                <div className="flex flex-col gap-1 pb-2">
                  <span className="text-xl text-slate-400 line-through decoration-rose-300 decoration-2">
                    {formatPrice(offerData.original_price.toString())}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    / {formatInterval(plan.interval)}
                  </span>
                </div>
                <div className="md:ml-auto">
                  <span className="inline-flex items-center text-sm font-bold text-white bg-gradient-to-r from-rose-500 to-purple-600 px-4 py-2 rounded-full shadow-md">
                    Save {formatPrice(offerData.discount_amount.toString())} (
                    {offerData.discount_percentage?.toFixed(0)}% off)
                  </span>
                </div>
              </div>
            </div>

            {/* Features */}
            {plan.features && Array.isArray(plan.features) && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
                  Everything included
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {plan.features.map((feature: string, index: number) => (
                    <div key={index} className="flex items-start gap-2.5">
                      <div className="mt-0.5 p-0.5 rounded-full bg-gradient-to-r from-rose-500 to-purple-600">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleClaimOffer}
                disabled={isProcessing}
                className="w-full h-14 text-lg font-bold bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white shadow-lg shadow-rose-200 dark:shadow-none transition-all"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Claim Offer & Pay{" "}
                    {formatPrice(offerData.discounted_price.toString())}
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/subscription")}
              >
                Check Other Plans <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Trust Indicators */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-green-50 dark:bg-green-950 rounded-xl">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <h4 className="font-semibold text-sm">Secure Payments</h4>
            <p className="text-xs text-muted-foreground">
              Powered by Razorpay. PCI DSS compliant.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-xl">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <h4 className="font-semibold text-sm">Multiple Payment Methods</h4>
            <p className="text-xs text-muted-foreground">
              UPI, Cards, Netbanking, Wallets
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-xl">
              <Headphones className="w-6 h-6 text-purple-600" />
            </div>
            <h4 className="font-semibold text-sm">24/7 Support</h4>
            <p className="text-xs text-muted-foreground">
              Dedicated support for all paid plans
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpecialOfferPage;
