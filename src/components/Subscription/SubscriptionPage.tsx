import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSubscriptionPlans } from '@/utils/subscriptionUtils';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useRestaurantId } from '@/hooks/useRestaurantId';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  CreditCard,
  Shield,
  Headphones,
  Home,
  LayoutDashboard,
  Building2,
  User as UserIcon,
} from 'lucide-react';
import CurrentPlanBanner from './CurrentPlanBanner';
import PlanCard from './PlanCard';

const SubscriptionPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { restaurantName } = useRestaurantId();
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

  // Clear any stale branch override from previous sessions if it doesn't belong to current restaurant
  useEffect(() => {
    if (user?.restaurant_id && typeof window !== 'undefined') {
      const activeBranch = localStorage.getItem('active_branch_id');
      if (activeBranch && activeBranch !== user.restaurant_id) {
        localStorage.removeItem('active_branch_id');
      }
    }
  }, [user?.restaurant_id]);

  // Fetch the primary restaurant associated with the user/subscription
  const targetRestaurantId = user?.restaurant_id || subscription?.restaurant_id;
  const { data: primaryRestaurant } = useQuery({
    queryKey: ['subscription-primary-restaurant', targetRestaurantId],
    queryFn: async () => {
      if (!targetRestaurantId) return null;
      const { data } = await supabase
        .from('restaurants')
        .select('id, name')
        .eq('id', targetRestaurantId)
        .maybeSingle();
      return data;
    },
    enabled: !!targetRestaurantId,
  });

  const currentRestaurantName = primaryRestaurant?.name || restaurantName || 'My Restaurant';
  const userFullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ');

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
      {/* Top Navigation Header — Always visible */}
      <header className="sticky top-0 z-40 w-full border-b bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand & Main Navigation */}
          <div className="flex items-center gap-3 sm:gap-6">
            <button
              onClick={() => navigate('/website')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
              title="Go to Home Website"
            >
              <img
                src="/swadeshi-logo2.png"
                alt="Swadeshi Solutions"
                className="w-8 h-8 object-contain transition-transform group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="font-bold text-lg md:text-xl tracking-tight text-gray-900 dark:text-white">
                Swadeshi <span className="text-[#F26722]">Solutions</span>
              </span>
            </button>

            <div className="h-5 w-[1px] bg-gray-200 dark:bg-gray-700 hidden sm:block" />

            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/website')}
                className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 font-medium"
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </Button>

              {isActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50 font-medium"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </Button>
              )}
            </div>
          </div>

          {/* Account Info */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Restaurant & User detail */}
            <div className="flex flex-col items-end text-xs">
              <div className="flex items-center gap-1.5 font-medium text-gray-800 dark:text-gray-200">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="max-w-[140px] md:max-w-[200px] truncate">{currentRestaurantName}</span>
                {isExpired && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                    Expired
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <UserIcon className="w-3 h-3 text-muted-foreground" />
                {userFullName && (
                  <span className="font-semibold text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
                    {userFullName}
                  </span>
                )}
                {user?.email && (
                  <span className="max-w-[150px] md:max-w-[200px] truncate">
                    ({user.email})
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 md:px-8 md:py-8 space-y-8">
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
