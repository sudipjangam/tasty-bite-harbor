import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSubscriptionPlans } from '@/utils/subscriptionUtils';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CreditCard, Shield, Headphones } from 'lucide-react';
import CurrentPlanBanner from './CurrentPlanBanner';
import PlanCard from './PlanCard';

const SubscriptionPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const plansRef = useRef<HTMLDivElement>(null);

  const {
    subscription,
    isActive,
    isExpired,
    isPending,
    isLoadingSubscription,
    handleSubscribe,
    isProcessing,
  } = useSubscription();

  const [planType, setPlanType] = useState<
    'food_truck' | 'restaurant' | 'hotel' | 'all_in_one'
  >('restaurant');
  const [billingCycle, setBillingCycle] = useState<
    'monthly' | 'quarterly' | 'half_yearly' | 'yearly'
  >('monthly');

  const { data: plans = [] } = useQuery({
    queryKey: ['subscriptionPlans'],
    queryFn: fetchSubscriptionPlans,
  });

  // Filter plans based on selection
  const filteredPlans = plans.filter((plan: any) => {
    const name = plan.name.toLowerCase();

    let typeMatch = false;
    if (planType === 'food_truck') typeMatch = name.includes('food truck');
    else if (planType === 'restaurant')
      typeMatch = name.includes('restaurant') && !name.includes('hotel') && !name.includes('food truck');
    else if (planType === 'hotel')
      typeMatch = name.includes('hotel') && !name.includes('restaurant');
    else if (planType === 'all_in_one')
      typeMatch = name.includes('all-in-one') || (name.includes('restaurant') && name.includes('hotel'));

    const isFree = plan.price === '0';
    const intervalMatch = plan.interval === billingCycle;

    return typeMatch && (isFree || intervalMatch);
  });

  const scrollToPlans = () => {
    plansRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onSubscribeClick = async (planId: string, price: string, planName: string) => {
    await handleSubscribe(planId, price, planName, () => {
      navigate('/dashboard');
    });
  };

  if (isLoadingSubscription) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600" />
          <p className="text-muted-foreground">Loading subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-7xl mx-auto px-4 py-6 md:px-8 md:py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        {/* Current Plan Banner */}
        <CurrentPlanBanner
          subscription={subscription}
          isActive={isActive}
          isExpired={isExpired}
          isPending={isPending}
          onRenew={scrollToPlans}
        />

        {/* Plans Section */}
        <div ref={plansRef} className="scroll-mt-20">
          <div className="text-center space-y-4 mb-8 pt-4">
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-purple-800 to-gray-900 dark:from-gray-100 dark:via-purple-300 dark:to-gray-100 bg-clip-text text-transparent">
              {isActive ? 'Change Your Plan' : 'Choose Your Plan'}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Tailored solutions for Food Trucks, Restaurants, and Hotels.
              {isExpired && ' Renew now to restore access to all features.'}
            </p>

            {/* Plan Type Toggles */}
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {[
                { id: 'food_truck', label: '🚚 Food Truck' },
                { id: 'restaurant', label: '🍽️ Restaurant' },
                { id: 'hotel', label: '🏨 Hotel' },
                { id: 'all_in_one', label: '🏢 All-in-One' },
              ].map((type) => (
                <Button
                  key={type.id}
                  variant={planType === type.id ? 'default' : 'outline'}
                  onClick={() => setPlanType(type.id as any)}
                  className={`rounded-full px-5 transition-all duration-200 ${
                    planType === type.id
                      ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200'
                      : 'hover:border-purple-300'
                  }`}
                >
                  {type.label}
                </Button>
              ))}
            </div>

            {/* Billing Cycle Toggles */}
            <div className="flex flex-wrap justify-center gap-1 mt-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit mx-auto">
              {[
                { id: 'monthly', label: 'Monthly' },
                { id: 'quarterly', label: 'Quarterly', save: '10%' },
                { id: 'half_yearly', label: 'Half-Yearly', save: '15%' },
                { id: 'yearly', label: 'Yearly', save: '20%' },
              ].map((cycle) => (
                <button
                  key={cycle.id}
                  onClick={() => setBillingCycle(cycle.id as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    billingCycle === cycle.id
                      ? 'bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-300 shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {cycle.label}
                  {cycle.save && billingCycle === cycle.id && (
                    <span className="ml-1 text-xs text-emerald-600 font-bold">
                      -{cycle.save}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Plan Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlans.map((plan: any) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrentPlan={subscription?.plan_id === plan.id && isActive}
                isProcessing={isProcessing}
                billingCycle={billingCycle}
                onSubscribe={onSubscribeClick}
              />
            ))}
          </div>

          {filteredPlans.length === 0 && (
            <div className="text-center py-16">
              <div className="inline-flex p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                <CreditCard className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-lg">
                No plans available for this selection.
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                Try a different plan type or billing cycle.
              </p>
            </div>
          )}
        </div>

        {/* Trust Indicators */}
        <div className="border-t pt-8 mt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
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
    </div>
  );
};

export default SubscriptionPage;
