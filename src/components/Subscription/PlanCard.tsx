import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Sparkles, Zap, Star, Loader2 } from 'lucide-react';
import { formatPrice, formatInterval } from '@/utils/razorpayUtils';

interface PlanCardProps {
  plan: {
    id: string;
    name: string;
    description: string;
    price: string;
    interval: string;
    features: string[];
  };
  isCurrentPlan: boolean;
  isProcessing: boolean;
  billingCycle: string;
  onSubscribe: (planId: string, price: string, name: string) => void;
}

export const TIER_CONFIG: Record<string, {
  gradient: string;
  icon: React.ReactNode;
  badge: string;
  ring: string;
  buttonClass: string;
}> = {
  free: {
    gradient: 'from-emerald-500 to-teal-600',
    icon: <Zap className="w-5 h-5" />,
    badge: '14-Day Evaluation',
    ring: 'ring-emerald-200 dark:ring-emerald-800',
    buttonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
  starter: {
    gradient: 'from-slate-600 to-slate-700 dark:from-slate-500 dark:to-slate-600',
    icon: <Zap className="w-5 h-5" />,
    badge: 'Essential',
    ring: 'ring-slate-200 dark:ring-slate-800',
    buttonClass: 'bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700 text-white',
  },
  growth: {
    gradient: 'from-blue-500 to-indigo-600',
    icon: <Sparkles className="w-5 h-5" />,
    badge: 'Popular',
    ring: 'ring-blue-200 dark:ring-blue-800',
    buttonClass: 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90 text-white',
  },
  pro: {
    gradient: 'from-purple-600 via-indigo-600 to-purple-700',
    icon: <Crown className="w-5 h-5" />,
    badge: '⭐ HERO PLAN — BEST VALUE',
    ring: 'ring-purple-400 ring-2 shadow-lg shadow-purple-500/10',
    buttonClass: 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:opacity-95 shadow-md shadow-purple-500/25 text-white',
  },
  professional: {
    gradient: 'from-purple-600 via-indigo-600 to-purple-700',
    icon: <Crown className="w-5 h-5" />,
    badge: '⭐ HERO PLAN — BEST VALUE',
    ring: 'ring-purple-400 ring-2 shadow-lg shadow-purple-500/10',
    buttonClass: 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:opacity-95 shadow-md shadow-purple-500/25 text-white',
  },
  business: {
    gradient: 'from-blue-600 via-sky-600 to-indigo-700',
    icon: <Sparkles className="w-5 h-5" />,
    badge: 'Multi-Terminal Scale',
    ring: 'ring-blue-300 dark:ring-blue-800',
    buttonClass: 'bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-700 hover:opacity-90 text-white',
  },
  franchise: {
    gradient: 'from-amber-500 via-orange-600 to-amber-600',
    icon: <Star className="w-5 h-5" />,
    badge: 'Central Multi-Outlet HQ',
    ring: 'ring-amber-300 dark:ring-amber-800',
    buttonClass: 'bg-gradient-to-r from-amber-500 via-orange-600 to-amber-600 hover:opacity-90 text-white',
  },
  enterprise: {
    gradient: 'from-amber-500 to-orange-600',
    icon: <Star className="w-5 h-5" />,
    badge: 'Enterprise',
    ring: 'ring-amber-200 dark:ring-amber-800',
    buttonClass: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90 text-white',
  },
};

export const getTierKey = (planName: string): string => {
  const name = planName.toLowerCase();
  if (name.includes('free') || name.includes('trial')) return 'free';
  if (name.includes('franchise')) return 'franchise';
  if (name.includes('business')) return 'business';
  if (name.includes('professional') || name.includes('pro')) return 'pro';
  if (name.includes('growth')) return 'growth';
  if (name.includes('enterprise')) return 'enterprise';
  return 'starter';
};

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  isCurrentPlan,
  isProcessing,
  billingCycle,
  onSubscribe,
}) => {
  const tierKey = getTierKey(plan.name);
  const tier = TIER_CONFIG[tierKey] || TIER_CONFIG.starter;

  // Clean display name (remove business prefix and interval suffix)
  const displayName = plan.name
    .replace(/ - (Monthly|Quarterly|Half-Yearly|Yearly|Half_Yearly)/gi, '')
    .replace(/^(Food Truck|Restaurant \+ Hotel|Restaurant|Hotel|All-in-One)\s+/i, '')
    .trim();

  const isTrial =
    plan.price === '1' ||
    plan.price === '0' ||
    parseFloat(plan.price) <= 1 ||
    plan.name.toLowerCase().includes('trial') ||
    plan.name.toLowerCase().includes('free');

  const isPro = tierKey === 'pro' || tierKey === 'professional';

  // Compute interval label and monthly breakdown
  const priceNum = parseFloat(plan.price) || 0;
  let intervalLabel = formatInterval(billingCycle);
  let perMonthBreakdown = '';

  if (isTrial) {
    intervalLabel = '14-day evaluation';
  } else if (billingCycle === 'quarterly') {
    intervalLabel = '3 months';
    perMonthBreakdown = `(~${formatPrice(Math.round(priceNum / 3))}/mo)`;
  } else if (billingCycle === 'half_yearly') {
    intervalLabel = '6 months';
    perMonthBreakdown = `(~${formatPrice(Math.round(priceNum / 6))}/mo)`;
  } else if (billingCycle === 'yearly') {
    intervalLabel = '1 year';
    perMonthBreakdown = `(~${formatPrice(Math.round(priceNum / 12))}/mo)`;
  } else {
    intervalLabel = 'month';
  }

  return (
    <Card
      className={`
        relative overflow-hidden flex flex-col
        transition-all duration-300 ease-out
        hover:shadow-2xl hover:-translate-y-1
        border-2
        ${isCurrentPlan
          ? 'border-emerald-400 ring-2 ring-emerald-100 dark:ring-emerald-950 shadow-lg shadow-emerald-100/50'
          : isPro
            ? `border-purple-300 dark:border-purple-600 ring-2 ring-purple-200 dark:ring-purple-900 shadow-xl shadow-purple-500/10`
            : 'border-transparent hover:border-gray-200 dark:hover:border-gray-800'
        }
      `}
    >
      {/* Top accent bar */}
      {isCurrentPlan ? (
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-400 to-green-500" />
      ) : isPro ? (
        <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${tier.gradient}`} />
      ) : (
        <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${tier.gradient} opacity-50`} />
      )}

      {/* Badge label */}
      {(isCurrentPlan || tier.badge) && (
        <div className="absolute top-3 right-3 z-10">
          {isCurrentPlan ? (
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-200 text-xs font-bold">
              ✓ Current Plan
            </Badge>
          ) : tier.badge ? (
            <Badge className={`bg-gradient-to-r ${tier.gradient} text-white border-0 text-xs font-bold tracking-wide shadow-sm`}>
              {tier.badge}
            </Badge>
          ) : null}
        </div>
      )}

      <div className="p-6 flex flex-col flex-grow">
        {/* Plan header */}
        <div className="mb-4">
          <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-r ${tier.gradient} text-white mb-3 shadow-sm`}>
            {tier.icon}
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            {displayName}
            {isPro && <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
          </h3>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed min-h-[40px]">
            {plan.description}
          </p>
        </div>

        {/* Price display */}
        <div className="flex flex-col mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
              {formatPrice(plan.price)}
            </span>
            <span className="text-sm text-muted-foreground font-medium">
              / {intervalLabel}
            </span>
          </div>
          {perMonthBreakdown && (
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 mt-1.5">
              Billed upfront {perMonthBreakdown}
            </span>
          )}
          {isTrial && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-1.5">
              Full access evaluation • Instant activation
            </span>
          )}
        </div>

        {/* Features list */}
        <div className="flex-grow mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            What's Included:
          </p>
          {plan.features && Array.isArray(plan.features) && (
            <ul className="space-y-2.5">
              {plan.features.map((feature: string, index: number) => (
                <li key={index} className="flex items-start gap-2.5">
                  <div className={`mt-0.5 p-0.5 rounded-full bg-gradient-to-r ${tier.gradient} flex-shrink-0`}>
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-300 leading-snug">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* CTA Button */}
        <Button
          className={`w-full font-semibold h-11 ${tier.buttonClass} transition-all duration-200`}
          size="lg"
          onClick={() => onSubscribe(plan.id, plan.price, plan.name)}
          disabled={isProcessing || isCurrentPlan}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : isCurrentPlan ? (
            'Current Plan'
          ) : isTrial ? (
            'Start Free Trial (₹1)'
          ) : (
            'Subscribe Now'
          )}
        </Button>
      </div>
    </Card>
  );
};

export default PlanCard;
