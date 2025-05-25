
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://clmsoetktmvhazctlans.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbXNvZXRrdG12aGF6Y3RsYW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg1MTE5NTIsImV4cCI6MjA1NDA4Nzk1Mn0.4j8CLdQn9By5XawbdC4LlWhFumIQT6gqCl2lZnQwQWk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface RoomFoodOrder {
    id: string;
    created_at: string;
    room_id: string;
    order_id: string;
    total: number;
    status: string;
}

export interface ReservationWithSpecialOccasion {
    id: string;
    customer_name: string;
    customer_phone: string;
    special_occasion: string;
    special_occasion_date: string;
    room_id: string;
}

// Export the PromotionCampaign type for use in components
export interface PromotionCampaign {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  discount_percentage: number;
  discount_amount: number;
  promotion_code: string | null;
  restaurant_id: string;
  created_at: string;
  updated_at: string;
}

export interface SentPromotion {
  id: string;
  promotion_campaign_id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  sent_date: string;
  sent_status: string;
  sent_method: string;
  restaurant_id: string;
}

// Add OrderItem type for use in order-related components
export interface OrderItem {
  id: string;
  menuItemId?: string;
  name: string;
  price: number;
  quantity: number;
  modifiers?: string[];
}
