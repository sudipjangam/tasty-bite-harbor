
export interface Order {
  id: string;
  customer_name: string;
  items: string[];
  total: number;
  status: 'completed' | 'pending' | 'preparing' | 'ready' | 'cancelled' | 'held';
  created_at: string;
  restaurant_id: string;
  updated_at: string;
  source?: string; // Order source: pos, table, manual, room_service, qsr
  order_type?: string; // Order type: dine-in, takeaway, delivery
  discount_amount?: number;
  discount_percentage?: number;
  payment_status?: string;
  payment_method?: string;
}

export interface OrderItem {
  id: string;
  menuItemId?: string;
  name: string;
  price: number;          // Base price (e.g., 300 for 300/kg)
  quantity: number;       // For fixed items (integer count)
  actualQuantity?: number; // For weight/volume (e.g., 0.5 for 500g)
  unit?: string;          // kg, g, L, ml, piece, plate
  pricingType?: 'fixed' | 'weight' | 'volume' | 'unit';
  baseUnitQuantity?: number; // Base unit quantity for pricing
  calculatedPrice?: number;  // Final calculated price
  isCustomExtra?: boolean;   // True for ad-hoc items added manually
  modifiers?: string[];
  notes?: string;
}

export interface TableData {
  id: string;
  name: string;
  status: string;
  capacity: number;
  restaurant_id: string;
}
