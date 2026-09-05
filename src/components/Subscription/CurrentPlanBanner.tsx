import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Crown,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Zap,
  FileText,
} from 'lucide-react';
import { getDaysRemaining, isExpiringSoon, formatPrice, formatInterval } from '@/utils/razorpayUtils';
import type { SubscriptionDetails } from '@/hooks/useSubscription';
import { useRestaurantId } from '@/hooks/useRestaurantId';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SubscriberInvoiceModal } from './SubscriberInvoiceModal';

interface CurrentPlanBannerProps {
  subscription: SubscriptionDetails | null;
  isActive: boolean;
  isExpired: boolean;
  isPending: boolean;
  onRenew?: () => void;
}

const CurrentPlanBanner: React.FC<CurrentPlanBannerProps> = ({
  subscription,
  isActive,
  isExpired,
  isPending,
  onRenew,
}) => {
  const { restaurantId } = useRestaurantId();

  const { data: restaurant } = useQuery({
    queryKey: ['restaurant-invoice-profile', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      const { data } = await supabase
        .from('restaurants')
        .select('name, address, phone, email, gstin, owner_name, city, state, pincode')
        .eq('id', restaurantId)
        .maybeSingle();
      return data;
    },
    enabled: !!restaurantId,
  });

  if (!subscription) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/15 rounded-xl backdrop-blur-sm">
              <Zap className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold">No Active Subscription</h3>
              <p className="text-white/80 text-sm mt-1">
                Choose a plan to unlock all features and grow your business
              </p>
            </div>
          </div>
          <Button 
            onClick={onRenew}
            className="bg-white text-purple-700 hover:bg-white/90 font-semibold px-6 shadow-lg"
          >
            View Plans
          </Button>
        </div>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining(subscription.current_period_end);
  const expiringSoon = isExpiringSoon(subscription.current_period_end);
  const progressPercent = (() => {
    const start = new Date(subscription.current_period_start).getTime();
    const end = new Date(subscription.current_period_end).getTime();
    const now = Date.now();
    const total = end - start;
    const elapsed = now - start;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  })();

  // Expired state
  if (isExpired) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/15 rounded-xl backdrop-blur-sm animate-pulse">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">{subscription.plan_name}</h3>
                <Badge className="bg-white/20 text-white border-0">Expired</Badge>
              </div>
              <p className="text-white/80 text-sm mt-1">
                Your subscription expired on{' '}
                {new Date(subscription.current_period_end).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
          <Button 
            onClick={onRenew}
            className="bg-white text-rose-600 hover:bg-white/90 font-semibold px-6 shadow-lg gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Renew Now
          </Button>
        </div>
      </div>
    );
  }

  // Pending state
  if (isPending) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />

        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 bg-white/15 rounded-xl backdrop-blur-sm animate-spin">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Payment Pending</h3>
            <p className="text-white/80 text-sm mt-1">
              Your payment is being processed. This page will update automatically.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Active — Expiring Soon
  if (expiringSoon) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-400 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/15 rounded-xl backdrop-blur-sm">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold">{subscription.plan_name}</h3>
                  <Badge className="bg-white/20 text-white border-0">
                    {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
                  </Badge>
                </div>
                <p className="text-white/80 text-sm mt-1">
                  Renew now to avoid service interruption
                </p>
              </div>
            </div>
            <Button
              onClick={onRenew}
              className="bg-white text-amber-600 hover:bg-white/90 font-semibold px-6 shadow-lg gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Renew Now
            </Button>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-xs text-white/60">
              <span>
                {new Date(subscription.current_period_start).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              </span>
              <span>
                {new Date(subscription.current_period_end).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const invoiceRestaurant = {
    name: restaurant?.name || 'Restaurant Subscriber',
    address: restaurant?.address || '',
    city: restaurant?.city || '',
    state: restaurant?.state || 'Maharashtra',
    pincode: restaurant?.pincode || '',
    phone: restaurant?.phone || '',
    email: restaurant?.email || '',
    gstin: restaurant?.gstin || '',
    owner_name: restaurant?.owner_name || '',
  };

  const invoicePlan = {
    name: subscription?.plan_name || 'Standard Plan',
    interval: subscription?.plan_interval || 'monthly',
    price: subscription?.amount_paid || 0,
    features: subscription?.plan_features || [],
  };

  const invoicePayment = {
    invoice_number: subscription?.razorpay_order_id
      ? `INV-${subscription.razorpay_order_id.replace(/^order_/, '').slice(-8).toUpperCase()}`
      : `INV-SUB-${subscription?.id?.slice(0, 8).toUpperCase() || 'NEW'}`,
    issue_date: subscription?.paid_at || subscription?.current_period_start || new Date().toISOString(),
    due_date: subscription?.current_period_end || new Date().toISOString(),
    status: (isActive ? 'PAID' : 'DUE') as 'PAID' | 'DUE',
    payment_method: subscription?.payment_method || 'Online',
    razorpay_payment_id: subscription?.razorpay_payment_id,
    razorpay_order_id: subscription?.razorpay_order_id,
    period_start: subscription?.current_period_start || new Date().toISOString(),
    period_end: subscription?.current_period_end || new Date().toISOString(),
    amount_paid: subscription?.amount_paid || 0,
  };

  // Active — Healthy
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 p-6 md:p-8 text-white shadow-xl">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />

      <div className="relative z-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/15 rounded-xl backdrop-blur-sm">
              <Crown className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold">{subscription.plan_name}</h3>
                <Badge className="bg-white/20 text-white border-0 gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Active
                </Badge>
              </div>
              <p className="text-white/80 text-sm mt-1">
                {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                {subscription.payment_method && subscription.payment_method !== 'free_trial' && (
                  <> · Paid {formatPrice(subscription.amount_paid)} via {subscription.payment_method.toUpperCase()}</>
                )}
                {subscription.payment_method === 'free_trial' && (
                  <> · Free Trial</>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <SubscriberInvoiceModal
              restaurant={invoiceRestaurant}
              plan={invoicePlan}
              payment={invoicePayment}
              trigger={
                <Button
                  variant="secondary"
                  className="bg-white text-emerald-800 hover:bg-white/90 font-semibold px-4 shadow-md gap-1.5"
                >
                  <FileText className="w-4 h-4 text-emerald-700" />
                  Tax Invoice / Bill
                </Button>
              }
            />
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-white/60">
            <span>
              {new Date(subscription.current_period_start).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
            </span>
            <span>
              Expires {new Date(subscription.current_period_end).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurrentPlanBanner;
