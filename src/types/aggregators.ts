export type AggregatorProvider = 'swiggy' | 'zomato' | 'magicpin' | 'urbanpiper' | 'ondc';

export type AggregatorOrderStatus = 
  | 'placed'
  | 'acknowledged'
  | 'preparing'
  | 'food_ready'
  | 'rider_assigned'
  | 'rider_arrived'
  | 'dispatched'
  | 'delivered'
  | 'cancelled';

export interface AggregatorStore {
  id: string;
  restaurant_id: string;
  provider: AggregatorProvider;
  store_id: string;
  merchant_id?: string;
  api_key?: string;
  api_secret?: string;
  webhook_secret?: string;
  is_connected: boolean;
  is_store_open: boolean;
  is_in_rush: boolean;
  auto_accept_orders: boolean;
  default_prep_time_minutes: number;
  commission_percentage: number;
  markup_percentage: number;
  last_sync_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AggregatorOrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  options?: string[];
  notes?: string;
}

export interface AggregatorOrder {
  id: string;
  restaurant_id: string;
  provider: AggregatorProvider;
  order_id?: string;
  aggregator_order_id: string;
  display_order_id: string;
  customer_name: string;
  customer_phone?: string;
  channel_status: AggregatorOrderStatus;
  items: AggregatorOrderItem[];
  gross_amount: number;
  discount_amount: number;
  packaging_charge: number;
  taxes: number;
  commission_amount: number;
  net_payout: number;
  rider_name?: string;
  rider_phone?: string;
  rider_status?: 'not_assigned' | 'assigned' | 'at_restaurant' | 'picked_up';
  otp?: string;
  customer_notes?: string;
  prep_time_minutes: number;
  created_at: string;
  updated_at?: string;
}

export interface AggregatorItemMapping {
  id: string;
  restaurant_id: string;
  menu_item_id: string;
  menu_item_name: string;
  category_name?: string;
  base_price: number;
  channel_price: number;
  provider: AggregatorProvider;
  is_in_stock: boolean;
  is_available: boolean;
  synced_at?: string;
}

export interface AggregatorSummaryStats {
  totalOrdersToday: number;
  grossSalesToday: number;
  estimatedCommissionsToday: number;
  netPayoutToday: number;
  avgPrepTimeMinutes: number;
  activeOrdersCount: number;
  channelBreakdown: {
    swiggy: { orders: number; revenue: number; isOpen: boolean };
    zomato: { orders: number; revenue: number; isOpen: boolean };
    magicpin: { orders: number; revenue: number; isOpen: boolean };
    urbanpiper: { orders: number; revenue: number; isOpen: boolean };
  };
}
