// Types for the CRM Loyalty system

export interface LoyaltyTierDB {
  id: string;
  restaurant_id: string;
  name: string;
  points_required: number;
  min_spent: number;
  min_visits: number;
  points_multiplier: number;
  benefits: string[];
  color: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyProgramDB {
  id: string;
  restaurant_id: string;
  is_enabled: boolean;
  points_per_amount: number;
  amount_per_point: number;
  points_expiry_days: number | null;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyRewardDB {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  reward_type: string;
  reward_value: number;
  points_required: number;
  tier_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyTransactionDB {
  id: string;
  restaurant_id: string;
  customer_id: string;
  transaction_type: 'earn' | 'redeem' | 'adjust' | 'expire';
  points: number;
  source: string;
  source_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface LoyaltyRedemptionDB {
  id: string;
  restaurant_id: string;
  customer_id: string;
  reward_id: string;
  order_id: string;
  points_used: number;
  discount_applied: number;
  created_at: string;
}

// Default tier colors for UI
export const DEFAULT_TIER_COLORS = [
  { name: 'Gray', value: 'bg-gray-500' },
  { name: 'Bronze', value: 'bg-amber-600' },
  { name: 'Silver', value: 'bg-gray-400' },
  { name: 'Gold', value: 'bg-yellow-500' },
  { name: 'Platinum', value: 'bg-slate-500' },
  { name: 'Diamond', value: 'bg-purple-600' },
  { name: 'Emerald', value: 'bg-emerald-500' },
  { name: 'Ruby', value: 'bg-red-500' },
  { name: 'Sapphire', value: 'bg-blue-500' },
];
