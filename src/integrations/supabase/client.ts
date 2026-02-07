
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase credentials. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Re-export types from their proper locations for backwards compatibility
export type { RoomFoodOrder, ReservationWithSpecialOccasion } from '@/types/rooms';
export type { PromotionCampaign, SentPromotion } from '@/types/promotions';
export type { OrderItem } from '@/types/orders';
