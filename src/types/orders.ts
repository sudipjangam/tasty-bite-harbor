
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
}

export interface OrderItem {
  id: string;
  menuItemId?: string;
  name: string;
  price: number;
  quantity: number;
  modifiers?: string[];
}

export interface TableData {
  id: string;
  name: string;
  status: string;
  capacity: number;
  restaurant_id: string;
}
