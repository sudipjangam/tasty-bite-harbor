
import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!rawSupabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase credentials. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  );
}

// Support relative proxy URLs (e.g., "/api/supabase") by prepending the current origin.
// This is needed because the Supabase JS client requires a full HTTP/HTTPS URL,
// but we use a relative path to proxy through Vercel/Netlify to bypass ISP blocks (e.g., Jio).
const supabaseUrl = rawSupabaseUrl.startsWith('http')
  ? rawSupabaseUrl
  : `${window.location.origin}${rawSupabaseUrl}`;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Re-export types from their proper locations for backwards compatibility
export type { RoomFoodOrder, ReservationWithSpecialOccasion } from '@/types/rooms';
export type { PromotionCampaign, SentPromotion } from '@/types/promotions';
export type { OrderItem } from '@/types/orders';
