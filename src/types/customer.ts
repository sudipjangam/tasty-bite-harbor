
export type CustomerLoyaltyTier = "None" | "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";

export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  birthday?: string | null;
  preferences?: string | null;
  created_at: string;
  restaurant_id: string;
  loyalty_points: number;
  loyalty_tier: CustomerLoyaltyTier;
  last_visit_date?: string | null;
  total_spent: number;
  visit_count: number;
  average_order_value: number;
  tags: string[];
}

export interface CustomerOrder {
  id: string;
  date: string;
  amount: number;
  order_id: string;
  status: string;
  items: any[];
  source?: string; // Added source field to track order source (pos, room_service, table, etc)
}

export interface CustomerNote {
  id: string;
  customer_id: string;
  content: string;
  created_at: string;
  created_by: string;
}

export interface CustomerActivity {
  id: string;
  customer_id: string;
  activity_type: string;
  description: string;
  created_at: string;
}
