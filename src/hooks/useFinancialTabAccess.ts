import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from './useAuth';

// Define which tabs are available for each plan
// This maps plan names to the tabs they have access to
const PLAN_TAB_ACCESS: Record<string, string[]> = {
  'starter': ['overview', 'profit-loss'],
  'growth': ['overview', 'profit-loss', 'revenue', 'cash-flow'],
  'professional': ['overview', 'profit-loss', 'revenue', 'cash-flow', 'invoices', 'budgets', 'reports'],
  'enterprise': ['overview', 'profit-loss', 'revenue', 'cash-flow', 'invoices', 'budgets', 'reports'],
};

// Define the minimum plan required for each tab
export const TAB_REQUIRED_PLAN: Record<string, string> = {
  'overview': 'Starter',
  'profit-loss': 'Starter',
  'revenue': 'Growth',
  'cash-flow': 'Growth',
  'invoices': 'Professional',
  'budgets': 'Professional',
  'reports': 'Professional',
};

// Plan type detection - determines what business modules are included
export type PlanType = 'restaurant' | 'hotel' | 'combined' | 'all_in_one';

const getPlanType = (planName: string): PlanType => {
  const name = planName.toLowerCase();
  
  // Check for combined plans first (order matters)
  if (name.includes('restaurant + hotel') || name.includes('restaurant+hotel')) {
    return 'combined';
  }
  if (name.includes('all-in-one') || name.includes('all in one') || name.includes('allinone')) {
    return 'all_in_one';
  }
  if (name.includes('hotel') && !name.includes('restaurant')) {
    return 'hotel';
  }
  // Default to restaurant (most common case)
  return 'restaurant';
};

const checkRestaurantAccess = (planType: PlanType): boolean => {
  return ['restaurant', 'combined', 'all_in_one'].includes(planType);
};

const checkHotelAccess = (planType: PlanType): boolean => {
  return ['hotel', 'combined', 'all_in_one'].includes(planType);
};

// Tab display info for upgrade prompts
export const TAB_INFO: Record<string, { name: string; description: string }> = {
  'overview': { name: 'Overview', description: 'Financial overview and reports' },
  'profit-loss': { name: 'P&L Statement', description: 'Profit and loss analysis' },
  'revenue': { name: 'Revenue Management', description: 'Hotel revenue and pricing optimization' },
  'cash-flow': { name: 'Cash Flow', description: 'Track money coming in and going out' },
  'invoices': { name: 'Invoices', description: 'Create and manage customer invoices' },
  'budgets': { name: 'Budgets', description: 'Set and track financial budgets' },
  'reports': { name: 'Reports', description: 'Detailed tax and financial reports' },
};

export const useFinancialTabAccess = () => {
  const { user } = useAuth();

  // Fetch the current subscription plan
  const { data: planData, isLoading } = useQuery({
    queryKey: ['financial-tab-access', user?.restaurant_id],
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
        console.error('Error fetching subscription:', error);
        return null;
      }

      // Handle different response formats
      let planName = 'starter'; // Default to starter if no subscription
      
      if (subscription?.subscription_plans) {
        const plans = subscription.subscription_plans;
        if (Array.isArray(plans) && plans.length > 0) {
          planName = plans[0].name?.toLowerCase() || 'starter';
        } else if (typeof plans === 'object' && plans !== null) {
          planName = (plans as any).name?.toLowerCase() || 'starter';
        }
      }

      return {
        planName,
        planDisplayName: planName.charAt(0).toUpperCase() + planName.slice(1)
      };
    },
    enabled: !!user?.restaurant_id
  });

  // Get current plan name (normalized to lowercase)
  const currentPlan = planData?.planName || 'starter';
  const currentPlanDisplay = planData?.planDisplayName || 'Starter';

  // Check if user has access to a specific tab
  const hasTabAccess = (tabId: string): boolean => {
    // Owner and admin always have full access
    const role = user?.role_name_text?.toLowerCase() || user?.role?.toLowerCase();
    if (role === 'owner' || role === 'admin') {
      return true;
    }

    const allowedTabs = PLAN_TAB_ACCESS[currentPlan] || PLAN_TAB_ACCESS['starter'];
    return allowedTabs.includes(tabId);
  };

  // Get the required plan for a tab
  const getRequiredPlan = (tabId: string): string => {
    return TAB_REQUIRED_PLAN[tabId] || 'Professional';
  };

  // Get tab info
  const getTabInfo = (tabId: string) => {
    return TAB_INFO[tabId] || { name: tabId, description: '' };
  };

  // Get all tabs with their access status
  const getTabsWithAccess = () => {
    const allTabs = Object.keys(TAB_INFO);
    return allTabs.map(tabId => ({
      id: tabId,
      ...getTabInfo(tabId),
      hasAccess: hasTabAccess(tabId),
      requiredPlan: getRequiredPlan(tabId)
    }));
  };

  // Calculate plan type from the raw plan name
  const rawPlanName = planData?.planName || 'restaurant starter';
  const planType = getPlanType(rawPlanName);

  return {
    hasTabAccess,
    getRequiredPlan,
    getTabInfo,
    getTabsWithAccess,
    currentPlan,
    currentPlanDisplay,
    isLoading,
    // Plan type access helpers
    planType,
    hasRestaurantAccess: checkRestaurantAccess(planType),
    hasHotelAccess: checkHotelAccess(planType),
  };
};
