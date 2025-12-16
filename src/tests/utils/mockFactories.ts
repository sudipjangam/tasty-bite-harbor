/**
 * Mock Data Factories for Testing
 * Provides factory functions to generate realistic test data
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================
// Base Types (matching your Supabase schema)
// ============================================

export interface MockUser {
  id: string;
  email: string;
  role: string;
  role_name_text: string;
  restaurant_id: string;
  is_active: boolean;
  full_name: string;
}

export interface MockMenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  restaurant_id: string;
  is_available: boolean;
  image_url: string | null;
  created_at: string;
}

export interface MockOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string | null;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  order_type: 'dine-in' | 'takeaway' | 'delivery';
  table_number: string | null;
  subtotal: number;
  discount: number;
  total: number;
  restaurant_id: string;
  created_at: string;
  updated_at: string;
}

export interface MockOrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
}

export interface MockCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  restaurant_id: string;
  total_orders: number;
  total_spent: number;
  loyalty_points: number;
  created_at: string;
}

export interface MockInventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  min_quantity: number;
  cost_per_unit: number;
  restaurant_id: string;
  supplier_id: string | null;
  category: string;
  last_restocked: string | null;
}

export interface MockReservation {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  date: string;
  time: string;
  party_size: number;
  table_id: string | null;
  status: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no-show';
  restaurant_id: string;
  notes: string | null;
  created_at: string;
}

export interface MockStaffMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role_id: string;
  role_name: string;
  restaurant_id: string;
  is_active: boolean;
  hire_date: string;
}

export interface MockCategory {
  id: string;
  name: string;
  description: string | null;
  restaurant_id: string;
  display_order: number;
}

// ============================================
// Factory Functions
// ============================================

let orderCounter = 1000;

export const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  id: uuidv4(),
  email: `user${Math.random().toString(36).substring(7)}@example.com`,
  role: 'staff',
  role_name_text: 'Staff',
  restaurant_id: 'test-restaurant-id',
  is_active: true,
  full_name: 'Test User',
  ...overrides,
});

export const createMockAdmin = (overrides: Partial<MockUser> = {}): MockUser => 
  createMockUser({
    role: 'admin',
    role_name_text: 'Admin',
    ...overrides,
  });

export const createMockOwner = (overrides: Partial<MockUser> = {}): MockUser => 
  createMockUser({
    role: 'owner',
    role_name_text: 'Owner',
    ...overrides,
  });

export const createMockMenuItem = (overrides: Partial<MockMenuItem> = {}): MockMenuItem => ({
  id: uuidv4(),
  name: `Menu Item ${Math.random().toString(36).substring(7)}`,
  description: 'A delicious menu item',
  price: Math.floor(Math.random() * 500) + 50,
  category_id: 'test-category-id',
  restaurant_id: 'test-restaurant-id',
  is_available: true,
  image_url: null,
  created_at: new Date().toISOString(),
  ...overrides,
});

export const createMockOrder = (overrides: Partial<MockOrder> = {}): MockOrder => {
  const subtotal = overrides.subtotal ?? Math.floor(Math.random() * 2000) + 100;
  const discount = overrides.discount ?? 0;
  return {
    id: uuidv4(),
    order_number: `ORD-${++orderCounter}`,
    customer_name: 'Test Customer',
    customer_phone: '+919876543210',
    status: 'pending',
    order_type: 'dine-in',
    table_number: 'T1',
    subtotal,
    discount,
    total: subtotal - discount,
    restaurant_id: 'test-restaurant-id',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
};

export const createMockOrderItem = (overrides: Partial<MockOrderItem> = {}): MockOrderItem => {
  const quantity = overrides.quantity ?? Math.floor(Math.random() * 3) + 1;
  const unitPrice = overrides.unit_price ?? Math.floor(Math.random() * 300) + 50;
  return {
    id: uuidv4(),
    order_id: 'test-order-id',
    menu_item_id: 'test-menu-item-id',
    quantity,
    unit_price: unitPrice,
    total_price: quantity * unitPrice,
    notes: null,
    ...overrides,
  };
};

export const createMockCustomer = (overrides: Partial<MockCustomer> = {}): MockCustomer => ({
  id: uuidv4(),
  name: 'Test Customer',
  email: 'customer@example.com',
  phone: '+919876543210',
  restaurant_id: 'test-restaurant-id',
  total_orders: Math.floor(Math.random() * 50),
  total_spent: Math.floor(Math.random() * 10000),
  loyalty_points: Math.floor(Math.random() * 500),
  created_at: new Date().toISOString(),
  ...overrides,
});

export const createMockInventoryItem = (overrides: Partial<MockInventoryItem> = {}): MockInventoryItem => ({
  id: uuidv4(),
  name: `Inventory Item ${Math.random().toString(36).substring(7)}`,
  quantity: Math.floor(Math.random() * 100) + 10,
  unit: 'kg',
  min_quantity: 5,
  cost_per_unit: Math.floor(Math.random() * 100) + 10,
  restaurant_id: 'test-restaurant-id',
  supplier_id: null,
  category: 'General',
  last_restocked: new Date().toISOString(),
  ...overrides,
});

export const createLowStockInventoryItem = (overrides: Partial<MockInventoryItem> = {}): MockInventoryItem => 
  createMockInventoryItem({
    quantity: 2,
    min_quantity: 10,
    ...overrides,
  });

export const createMockReservation = (overrides: Partial<MockReservation> = {}): MockReservation => ({
  id: uuidv4(),
  customer_name: 'Test Customer',
  customer_phone: '+919876543210',
  customer_email: 'customer@example.com',
  date: new Date().toISOString().split('T')[0],
  time: '19:00',
  party_size: 4,
  table_id: null,
  status: 'pending',
  restaurant_id: 'test-restaurant-id',
  notes: null,
  created_at: new Date().toISOString(),
  ...overrides,
});

export const createMockStaffMember = (overrides: Partial<MockStaffMember> = {}): MockStaffMember => ({
  id: uuidv4(),
  user_id: uuidv4(),
  full_name: 'Test Staff',
  email: 'staff@example.com',
  phone: '+919876543210',
  role_id: 'test-role-id',
  role_name: 'Waiter',
  restaurant_id: 'test-restaurant-id',
  is_active: true,
  hire_date: new Date().toISOString().split('T')[0],
  ...overrides,
});

export const createMockCategory = (overrides: Partial<MockCategory> = {}): MockCategory => ({
  id: uuidv4(),
  name: 'Test Category',
  description: 'A test category',
  restaurant_id: 'test-restaurant-id',
  display_order: 0,
  ...overrides,
});

// ============================================
// Batch Generators
// ============================================

export const createMockMenuItems = (count: number): MockMenuItem[] => 
  Array.from({ length: count }, () => createMockMenuItem());

export const createMockOrders = (count: number): MockOrder[] => 
  Array.from({ length: count }, () => createMockOrder());

export const createMockCustomers = (count: number): MockCustomer[] => 
  Array.from({ length: count }, () => createMockCustomer());

export const createMockInventoryItems = (count: number): MockInventoryItem[] => 
  Array.from({ length: count }, () => createMockInventoryItem());

export const createMockReservations = (count: number): MockReservation[] => 
  Array.from({ length: count }, () => createMockReservation());

// ============================================
// Test Scenarios
// ============================================

export const createOrderWithItems = (itemCount = 3) => {
  const order = createMockOrder();
  const items = Array.from({ length: itemCount }, () => 
    createMockOrderItem({ order_id: order.id })
  );
  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
  order.subtotal = subtotal;
  order.total = subtotal - order.discount;
  return { order, items };
};

export const createInventoryWithLowStock = () => {
  const normalItems = createMockInventoryItems(5);
  const lowStockItems = [
    createLowStockInventoryItem({ name: 'Low Stock Item 1' }),
    createLowStockInventoryItem({ name: 'Low Stock Item 2' }),
  ];
  return [...normalItems, ...lowStockItems];
};

// ============================================
// Analytics Mock Data
// ============================================

export interface MockDailyStats {
  date: string;
  total_sales: number;
  order_count: number;
  average_order_value: number;
}

export const createMockDailyStats = (daysBack = 7): MockDailyStats[] => {
  return Array.from({ length: daysBack }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const orderCount = Math.floor(Math.random() * 50) + 10;
    const totalSales = orderCount * (Math.floor(Math.random() * 300) + 200);
    return {
      date: date.toISOString().split('T')[0],
      total_sales: totalSales,
      order_count: orderCount,
      average_order_value: Math.round(totalSales / orderCount),
    };
  });
};
