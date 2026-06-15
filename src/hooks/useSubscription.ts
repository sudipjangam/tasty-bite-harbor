import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/components/ui/use-toast';
import {
  openRazorpayCheckout,
  type RazorpayResponse,
  type CreateOrderResponse,
  type VerifyPaymentResponse,
} from '@/utils/razorpayUtils';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SubscriptionDetails {
  id: string;
  restaurant_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  amount_paid: number;
  currency: string;
  payment_method: string | null;
  paid_at: string | null;
  refund_status: string;
  refund_amount: number;
  refunded_at: string | null;
  plan_name?: string;
  plan_price?: string;
  plan_interval?: string;
  plan_features?: string[];
  plan_components?: string[];
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export const useSubscription = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const restaurantId = user?.restaurant_id;

  // ── Query: Active Discount ──
  const { data: activeDiscount } = useQuery({
    queryKey: ['active-discount', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      const { data, error } = await supabase
        .from('subscription_discounts')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) return null;
      return data;
    },
    enabled: !!restaurantId,
  });

  // ── Query: Current subscription + plan details ──
  const {
    data: subscription,
    isLoading: isLoadingSubscription,
    refetch: refetchSubscription,
  } = useQuery<SubscriptionDetails | null>({
    queryKey: ['subscription', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;

      const { data, error } = await supabase
        .from('restaurant_subscriptions')
        .select(`
          *,
          subscription_plans:plan_id (
            name,
            price,
            interval,
            features,
            components
          )
        `)
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      if (error) {
        console.error('[useSubscription] Error:', error);
        return null;
      }

      if (!data) return null;

      // Normalize the joined plan data
      const plan = Array.isArray(data.subscription_plans)
        ? data.subscription_plans[0]
        : data.subscription_plans;

      return {
        ...data,
        plan_name: plan?.name || 'Unknown',
        plan_price: plan?.price || '0',
        plan_interval: plan?.interval || 'monthly',
        plan_features: plan?.features || [],
        plan_components: plan?.components || [],
      } as SubscriptionDetails;
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // ── Derived status ──
  // Active = DB status is 'active' AND period hasn't ended
  const isActive =
    subscription?.status === 'active' &&
    new Date(subscription.current_period_end) > new Date();

  // Expired = any non-active state, or active but period has ended
  const isExpired =
    !!subscription && (
      subscription.status === 'inactive' ||
      subscription.status === 'expired' ||
      subscription.status === 'cancelled' ||
      (subscription.status === 'active' &&
        new Date(subscription.current_period_end) <= new Date())
    );

  const isPending = subscription?.status === 'pending';

  // ── Mutation: Create Razorpay Order ──
  const createOrderMutation = useMutation({
    mutationFn: async ({
      planId,
    }: {
      planId: string;
    }): Promise<CreateOrderResponse> => {
      if (!restaurantId) throw new Error('No restaurant ID');

      const { data, error } = await supabase.functions.invoke(
        'create-razorpay-order',
        {
          body: { planId, restaurantId },
        }
      );

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to create order');

      return data as CreateOrderResponse;
    },
  });

  // ── Mutation: Verify Payment ──
  const verifyPaymentMutation = useMutation({
    mutationFn: async ({
      razorpayResponse,
      planId,
    }: {
      razorpayResponse: RazorpayResponse;
      planId: string;
    }): Promise<VerifyPaymentResponse> => {
      if (!restaurantId) throw new Error('No restaurant ID');

      const { data, error } = await supabase.functions.invoke(
        'verify-razorpay-payment',
        {
          body: {
            razorpay_payment_id: razorpayResponse.razorpay_payment_id,
            razorpay_order_id: razorpayResponse.razorpay_order_id,
            razorpay_signature: razorpayResponse.razorpay_signature,
            plan_id: planId,
            restaurant_id: restaurantId,
          },
        }
      );

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Payment verification failed');

      return data as VerifyPaymentResponse;
    },
    onSuccess: () => {
      // Invalidate all subscription-related queries
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptionPlans'] });
      queryClient.invalidateQueries({ queryKey: ['plan-type'] });
      queryClient.invalidateQueries();
    },
  });

  // ── Mutation: Activate Free Trial ──
  const activateFreeTrial = useMutation({
    mutationFn: async ({
      planId,
      interval,
    }: {
      planId: string;
      interval: string;
    }) => {
      if (!restaurantId) throw new Error('No restaurant ID');

      const now = new Date();
      const endDate = new Date(now);

      // Free trials are always 14 days
      endDate.setDate(endDate.getDate() + 14);

      const { error } = await supabase
        .from('restaurant_subscriptions')
        .upsert(
          {
            restaurant_id: restaurantId,
            plan_id: planId,
            status: 'active',
            current_period_start: now.toISOString(),
            current_period_end: endDate.toISOString(),
            cancel_at_period_end: false,
            amount_paid: 0,
            currency: 'INR',
            payment_method: 'free_trial',
            paid_at: now.toISOString(),
            refund_status: 'none',
            refund_amount: 0,
          },
          { onConflict: 'restaurant_id' }
        );

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: 'Free Trial Activated! 🎉',
        description: 'You have 14 days of full access. Enjoy!',
      });
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      console.error('Free trial error:', error);
      toast({
        title: 'Error',
        description: 'Failed to activate free trial. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // ── Combined: Full Razorpay Subscribe Flow ──
  const handleSubscribe = async (
    planId: string,
    planPrice: string,
    planName: string,
    onSuccess?: () => void
  ) => {
    // Free trial bypass
    if (planPrice === '0' || parseFloat(planPrice) === 0) {
      await activateFreeTrial.mutateAsync({
        planId,
        interval: 'monthly',
      });
      onSuccess?.();
      return;
    }

    try {
      // 1. Create Razorpay order
      const orderData = await createOrderMutation.mutateAsync({ planId });

      // 2. Open Razorpay checkout
      await openRazorpayCheckout({
        key: orderData.key_id,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'Swadeshi Solutions',
        description: `${orderData.plan.name} Subscription`,
        order_id: orderData.order.id,
        handler: async (response: RazorpayResponse) => {
          try {
            // 3. Verify payment
            await verifyPaymentMutation.mutateAsync({
              razorpayResponse: response,
              planId,
            });

            toast({
              title: 'Payment Successful! 🎉',
              description: `Your ${planName} subscription is now active.`,
            });

            onSuccess?.();
          } catch (err: any) {
            console.error('Payment verification failed:', err);
            toast({
              title: 'Payment Verification Issue',
              description:
                'Payment was received but verification failed. Please contact support if your subscription is not activated.',
              variant: 'destructive',
            });
          }
        },
        prefill: orderData.prefill,
        theme: {
          color: '#7c3aed', // Purple to match brand
        },
        modal: {
          ondismiss: () => {
            toast({
              title: 'Payment Cancelled',
              description: 'You can try again anytime.',
            });
          },
          escape: true,
          backdropclose: false,
        },
      });
    } catch (err: any) {
      console.error('Subscribe flow error:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to initiate payment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // ── Mutation: Process Refund ──
  const processRefund = useMutation({
    mutationFn: async ({
      subscriptionId,
      amount,
      reason,
    }: {
      subscriptionId: string;
      amount?: number;
      reason?: string;
    }) => {
      if (!restaurantId) throw new Error('No restaurant ID');

      const { data, error } = await supabase.functions.invoke(
        'process-razorpay-refund',
        {
          body: {
            subscription_id: subscriptionId,
            restaurant_id: restaurantId,
            amount,
            reason,
          },
        }
      );

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Refund failed');
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Refund Processed',
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Refund Failed',
        description: error.message || 'Could not process refund',
        variant: 'destructive',
      });
    },
  });

  return {
    // Data
    subscription,
    isActive,
    isExpired,
    isPending,
    isLoadingSubscription,
    activeDiscount,

    // Actions
    handleSubscribe,
    processRefund,
    refetchSubscription,

    // Loading states
    isCreatingOrder: createOrderMutation.isPending,
    isVerifyingPayment: verifyPaymentMutation.isPending,
    isActivatingTrial: activateFreeTrial.isPending,
    isProcessingRefund: processRefund.isPending,
    isProcessing:
      createOrderMutation.isPending ||
      verifyPaymentMutation.isPending ||
      activateFreeTrial.isPending,
  };
};
