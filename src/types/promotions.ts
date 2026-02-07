
export type PromotionStatus = 'active' | 'inactive' | 'scheduled' | 'expired' | 'draft' | 'upcoming';

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
  status: PromotionStatus;
  is_active: boolean;
  time_period?: string;
  potential_increase?: string;
}

export interface CreatePromotionData {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  discount_percentage: number;
  discount_amount: number;
  promotion_code?: string;
  status: PromotionStatus;
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
