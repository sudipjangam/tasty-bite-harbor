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

const TIER_CONFIG: Record<string, {
  gradient: string;
  icon: React.ReactNode;
  badge: string;
  ring: string;
  buttonClass: string;
}> = {
  starter: {
    gradient: 'from-slate-500 to-slate-600',
    icon: <Zap className="w-5 h-5" />,
    badge: '',
    ring: 'ring-slate-200',
    buttonClass: 'bg-slate-600 hover:bg-slate-700',
  },
  growth: {
    gradient: 'from-blue-500 to-indigo-600',
    icon: <Sparkles className="w-5 h-5" />,
    badge: 'Popular',
    ring: 'ring-blue-200',
    buttonClass: 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90',
  },
  pro: {
    gradient: 'from-violet-500 to-purple-600',
    icon: <Crown className="w-5 h-5" />,
    badge: 'Best Value',
    ring: 'ring-purple-200',
    buttonClass: 'bg-gradient-to-r from-violet-500 to-purple-600 hover:opacity-90',
  },
  professional: {
    gradient: 'from-violet-500 to-purple-600',
    icon: <Crown className="w-5 h-5" />,
    badge: 'Best Value',
    ring: 'ring-purple-200',
    buttonClass: 'bg-gradient-to-r from-violet-500 to-purple-600 hover:opacity-90',
  },
  enterprise: {
    gradient: 'from-amber-500 to-orange-600',
    icon: <Star className="w-5 h-5" />,
    badge: 'Premium',
    ring: 'ring-amber-200',
    buttonClass: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90',
  },
  free: {
    gradient: 'from-emerald-500 to-green-600',
    icon: <Zap className="w-5 h-5" />,
    badge: 'Free Trial',
    ring: 'ring-emerald-200',
    buttonClass: 'bg-emerald-600 hover:bg-emerald-700',
  },
};

const getTierKey = (planName: string): string => {
  const name = planName.toLowerCase();
  if (name.includes('free') || name.includes('trial')) return 'free';
  if (name.includes('enterprise')) return 'enterprise';
  if (name.includes('professional') || name.includes('pro')) return 'pro';
  if (name.includes('growth')) return 'growth';
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

  // Clean display name
  const displayName = plan.name
    .replace(/ - (Monthly|Quarterly|Half-Yearly|Yearly|Half_Yearly)/gi, '')
    .replace('Food Truck ', '')
    .trim();

  const isFree = plan.price === '0' || parseFloat(plan.price) === 0;
  const isPro = tierKey === 'pro' || tierKey === 'professional';

  return (
    <Card
      className={`
        relative overflow-hidden flex flex-col
        transition-all duration-300 ease-out
        hover:shadow-2xl hover:-translate-y-1
        border-2
        ${isCurrentPlan
          ? 'border-emerald-400 ring-2 ring-emerald-100 shadow-lg shadow-emerald-100/50'
          : isPro
            ? `border-purple-200 ring-1 ${tier.ring}`
            : 'border-transparent hover:border-gray-200'
        }
      `}
    >
      {/* Top badge */}
      {isCurrentPlan ? (
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 to-green-500" />
      ) : isPro ? (
        <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${tier.gradient}`} />
      ) : null}

      {/* Badge label */}
      {(isCurrentPlan || tier.badge) && (
        <div className="absolute top-3 right-3">
          {isCurrentPlan ? (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs font-semibold">
              ✓ Current Plan
            </Badge>
          ) : tier.badge ? (
            <Badge className={`bg-gradient-to-r ${tier.gradient} text-white border-0 text-xs font-semibold`}>
              {tier.badge}
            </Badge>
          ) : null}
        </div>
      )}

      <div className="p-6 flex flex-col flex-grow">
        {/* Plan header */}
        <div className="mb-5">
          <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-r ${tier.gradient} text-white mb-3`}>
            {tier.icon}
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {displayName}
          </h3>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            {plan.description}
          </p>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1 mb-6">
          <span className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            {formatPrice(plan.price)}
          </span>
          <span className="text-sm text-muted-foreground font-medium">
            / {isFree ? '14 days' : formatInterval(billingCycle)}
          </span>
        </div>

        {/* Features */}
        <div className="flex-grow mb-6">
          {plan.features && Array.isArray(plan.features) && (
            <ul className="space-y-2.5">
              {plan.features.map((feature: string, index: number) => (
                <li key={index} className="flex items-start gap-2.5">
                  <div className={`mt-0.5 p-0.5 rounded-full bg-gradient-to-r ${tier.gradient}`}>
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
          className={`w-full text-white font-semibold h-11 ${tier.buttonClass}`}
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
          ) : isFree ? (
            'Start Free Trial'
          ) : (
            'Subscribe Now'
          )}
        </Button>
      </div>
    </Card>
  );
};

export default PlanCard;
