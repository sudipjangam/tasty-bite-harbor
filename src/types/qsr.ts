// Order modes for QSR POS
export type QSROrderMode = 'dine_in' | 'takeaway' | 'delivery' | 'nc';

// Enhanced order item with notes and modifiers
export interface QSROrderItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  notes?: string;
  modifiers?: string[];
  isCustom?: boolean;
  actualQuantity?: number; // For weight-based items
  unit?: string;
  calculatedPrice?: number;
  pricingType?: 'fixed' | 'weight' | 'volume' | 'unit';
  baseUnitQuantity?: number;
}

// Table with order status for QSR
export interface QSRTable {
  id: string;
  name: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  activeOrderId?: string;
  activeOrderTotal?: number;
  activeOrderItems?: number;
}

// Active kitchen order for drawer
export interface ActiveKitchenOrder {
  id: string;
  orderId?: string;
  source: string;
  items: { name: string; quantity: number; price: number }[];
  status: 'new' | 'preparing' | 'ready' | 'held' | 'completed';
  createdAt: string;
  total: number;
  itemCompletionStatus?: boolean[];
}

// QSR Order structure
export interface QSROrder {
  id?: string;
  items: QSROrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'paid' | 'pending' | 'pending_kot' | 'cancelled' | 'completed';
  created_at?: string;
  restaurant_id?: string;
  customer_name?: string;
  order_type?: QSROrderMode;
  table_id?: string;
  attendant?: string;
}

// Custom item for off-menu additions
export interface QSRCustomItem {
  name: string;
  price: number;
  quantity: number;
}
