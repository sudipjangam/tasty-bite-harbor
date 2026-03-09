import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from './useAuth';

/**
 * Business category types for the application.
 * Each category determines what components, expense categories,
 * report types, and financial tabs are shown to the user.
 */
export type BusinessCategory = 'food_truck' | 'restaurant' | 'hotel' | 'restaurant_hotel' | 'all_in_one';

/**
 * Detect the business category from the subscription plan name.
 * Plan name patterns (confirmed from subscription_plans table):
 * - "Food Truck Starter", "Food Truck Pro", etc → food_truck
 * - "Restaurant + Hotel ...", "Restaurant+Hotel ..." → restaurant_hotel
 * - "All-in-One ...", "All in One ..." → all_in_one
 * - "Hotel ..." (without restaurant) → hotel
 * - Everything else → restaurant (most common default)
 */
export const detectBusinessCategory = (planName: string): BusinessCategory => {
  const name = planName.toLowerCase().trim();

  // Check food truck first (plans start with "Food Truck")
  if (name.startsWith('food truck') || name.includes('food truck')) {
    return 'food_truck';
  }

  // Check combined plans (Restaurant + Hotel)
  if (name.includes('restaurant + hotel') || name.includes('restaurant+hotel') || name.includes('restaurant & hotel')) {
    return 'restaurant_hotel';
  }

  // Check all-in-one plans
  if (name.includes('all-in-one') || name.includes('all in one') || name.includes('allinone')) {
    return 'all_in_one';
  }

  // Check hotel-only (must not include restaurant)
  if (name.includes('hotel') && !name.includes('restaurant')) {
    return 'hotel';
  }

  // Default to restaurant
  return 'restaurant';
};

/**
 * Access helper functions derived from the business category.
 */
export const getCategoryAccess = (category: BusinessCategory) => {
  const isFoodTruck = category === 'food_truck';
  const isRestaurant = category === 'restaurant';
  const isHotel = category === 'hotel';
  const isRestaurantHotel = category === 'restaurant_hotel';
  const isAllInOne = category === 'all_in_one';

  // Hotels can have their own restaurant, so food/kitchen features apply to hotel too
  const hasRestaurantFeatures = ['food_truck', 'restaurant', 'restaurant_hotel', 'hotel', 'all_in_one'].includes(category);
  const hasHotelFeatures = ['hotel', 'restaurant_hotel', 'all_in_one'].includes(category);
  const hasFoodTruckFeatures = category === 'food_truck';

  return {
    isFoodTruck,
    isRestaurant,
    isHotel,
    isRestaurantHotel,
    isAllInOne,
    hasRestaurantFeatures,
    hasHotelFeatures,
    hasFoodTruckFeatures,
  };
};

/**
 * Get the display label for a business category.
 */
export const getCategoryLabel = (category: BusinessCategory): string => {
  switch (category) {
    case 'food_truck': return 'Food Truck';
    case 'restaurant': return 'Restaurant';
    case 'hotel': return 'Hotel';
    case 'restaurant_hotel': return 'Restaurant + Hotel';
    case 'all_in_one': return 'All-in-One';
  }
};

// ─── Expense Category Filtering ─────────────────────────────────────────

/** Expense categories hidden per business category */
const HIDDEN_EXPENSE_CATEGORIES: Record<BusinessCategory, string[]> = {
  food_truck: ['rent'],                    // Food trucks move, no fixed rent
  restaurant: ['transport'],               // Restaurants don't have transport/fuel
  hotel: ['transport'],                    // Hotels don't have transport/fuel  
  restaurant_hotel: ['transport'],         // Combined don't have transport/fuel
  all_in_one: [],                          // All-in-one sees everything
};

export const isExpenseCategoryVisible = (categorySlug: string, businessCategory: BusinessCategory): boolean => {
  const hidden = HIDDEN_EXPENSE_CATEGORIES[businessCategory] || [];
  return !hidden.includes(categorySlug);
};

// ─── Report Category Filtering ──────────────────────────────────────────

/** Report categories hidden per business category */
const HIDDEN_REPORT_CATEGORIES: Record<BusinessCategory, string[]> = {
  food_truck: ['rooms'],                   // Food trucks have no rooms
  restaurant: ['rooms'],                   // Restaurants have no rooms
  hotel: [],                               // Hotels see everything (they can have restaurant)
  restaurant_hotel: [],                    // Combined sees everything
  all_in_one: [],                          // All-in-one sees everything
};

export const isReportCategoryVisible = (reportId: string, businessCategory: BusinessCategory): boolean => {
  const hidden = HIDDEN_REPORT_CATEGORIES[businessCategory] || [];
  return !hidden.includes(reportId);
};

// ─── Smart Insights per Category ────────────────────────────────────────

export interface PlanInsight {
  title: string;
  description: string;
  icon: 'tip' | 'benchmark' | 'alert' | 'info';
  color: string;
}

export const getCategoryInsights = (category: BusinessCategory): PlanInsight[] => {
  switch (category) {
    case 'food_truck':
      return [
        {
          title: 'Fuel Cost Tracking',
          description: 'Track transport & fuel costs separately to understand your true mobile operating costs.',
          icon: 'tip',
          color: 'from-orange-500 to-amber-500',
        },
        {
          title: 'Location Performance',
          description: 'Compare revenue across different locations to find your most profitable spots.',
          icon: 'benchmark',
          color: 'from-blue-500 to-cyan-500',
        },
        {
          title: 'Food Cost Benchmark',
          description: 'Food trucks typically target 28-32% food cost. Check your P&L for your current ratio.',
          icon: 'benchmark',
          color: 'from-emerald-500 to-green-500',
        },
      ];
    case 'restaurant':
      return [
        {
          title: 'Food Cost Ratio',
          description: 'Industry standard for restaurants is 28-35% food cost. Monitor this in your P&L statement.',
          icon: 'benchmark',
          color: 'from-emerald-500 to-green-500',
        },
        {
          title: 'Labor Cost Tracking',
          description: 'Staff costs should ideally be 25-35% of revenue. Track salaries in your expenses.',
          icon: 'tip',
          color: 'from-blue-500 to-indigo-500',
        },
        {
          title: 'Peak Hour Insights',
          description: 'Use Analytics to identify your busiest hours and optimize staffing accordingly.',
          icon: 'info',
          color: 'from-purple-500 to-pink-500',
        },
      ];
    case 'hotel':
      return [
        {
          title: 'Occupancy Rate',
          description: 'Track room occupancy trends in Reports → Rooms/Hotel to optimize pricing.',
          icon: 'benchmark',
          color: 'from-blue-500 to-cyan-500',
        },
        {
          title: 'RevPAR Tracking',
          description: 'Revenue Per Available Room is a key hotel metric. Monitor it in your Financial overview.',
          icon: 'tip',
          color: 'from-emerald-500 to-green-500',
        },
        {
          title: 'Housekeeping Costs',
          description: 'Track maintenance & cleaning costs to understand per-room operating expenses.',
          icon: 'info',
          color: 'from-purple-500 to-pink-500',
        },
      ];
    case 'restaurant_hotel':
      return [
        {
          title: 'Combined Revenue View',
          description: 'Your Analytics shows consolidated restaurant + hotel revenue for a complete business picture.',
          icon: 'info',
          color: 'from-indigo-500 to-purple-500',
        },
        {
          title: 'Cross-Selling Opportunity',
          description: 'Track room service orders alongside restaurant orders to identify upsell potential.',
          icon: 'tip',
          color: 'from-orange-500 to-amber-500',
        },
        {
          title: 'Dual Cost Centers',
          description: 'Separate restaurant and hotel expenses for accurate P&L analysis per division.',
          icon: 'benchmark',
          color: 'from-emerald-500 to-green-500',
        },
      ];
    case 'all_in_one':
      return [
        {
          title: 'Full Business Overview',
          description: 'You have access to all features. Use the Financial dashboard for a complete picture.',
          icon: 'info',
          color: 'from-purple-500 to-pink-500',
        },
      ];
  }
};

// ─── Main Hook ──────────────────────────────────────────────────────────

export const usePlanType = () => {
  const { user } = useAuth();

  const { data: planData, isLoading } = useQuery({
    queryKey: ['plan-type', user?.restaurant_id],
    queryFn: async () => {
      if (!user?.restaurant_id) return null;

      const { data: subscription, error } = await supabase
        .from('restaurant_subscriptions')
        .select(`
          status,
          subscription_plans:plan_id (
            id,
            name
          )
        `)
        .eq('restaurant_id', user.restaurant_id)
        .eq('status', 'active')
        .single();

      if (error) {
        console.error('[usePlanType] Error fetching subscription:', error);
        return null;
      }

      // Handle different response formats
      let planName = 'restaurant starter';
      if (subscription?.subscription_plans) {
        const plans = subscription.subscription_plans;
        if (Array.isArray(plans) && plans.length > 0) {
          planName = plans[0].name?.toLowerCase() || 'restaurant starter';
        } else if (typeof plans === 'object' && plans !== null) {
          planName = (plans as any).name?.toLowerCase() || 'restaurant starter';
        }
      }

      return { planName };
    },
    enabled: !!user?.restaurant_id,
  });

  const rawPlanName = planData?.planName || 'restaurant starter';
  const businessCategory = detectBusinessCategory(rawPlanName);
  const access = getCategoryAccess(businessCategory);
  const label = getCategoryLabel(businessCategory);
  const insights = getCategoryInsights(businessCategory);

  return {
    businessCategory,
    label,
    insights,
    isLoading,
    rawPlanName,
    ...access,
  };
};
