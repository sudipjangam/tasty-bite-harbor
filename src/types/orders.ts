
export interface Order {
  id: string;
  customer_name: string;
  items: string[];
  total: number;
  status: 'completed' | 'pending' | 'preparing' | 'ready' | 'cancelled';
  created_at: string;
  restaurant_id: string;
  updated_at: string;
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
