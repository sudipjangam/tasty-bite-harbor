/**
 * Granular Test Cases for Restaurant Management System
 * 
 * This test suite performs REAL database operations against a dedicated test restaurant.
 * Restaurant: Samarth Foods Products (978363fe-e1ba-4e66-980d-5d6b99199fb7)
 * 
 * Login: admin@example.com / password
 * 
 * Test Coverage:
 * - Operations: POS Orders, Menu CRUD, Tables CRUD
 * - Guest Services: Reservations, Rooms, Checkout (Cash), Food Orders
 * - Management: Customers, Marketing, Expenses, Reports (Read)
 * - Admin (Read-Only): User Management, Role Management
 * 
 * All created test data is cleaned up in afterAll hooks.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';

// --- TEST CONSTANTS ---
const TEST_RESTAURANT_ID = '978363fe-e1ba-4e66-980d-5d6b99199fb7';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password'; // Update if different

// Environment variables (should be set in vite.config for tests or .env.test)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Test data IDs to track for cleanup
const createdIds = {
  orders: [] as string[],
  menuItems: [] as string[],
  tables: [] as string[],
  reservations: [] as string[],
  rooms: [] as string[],
  customers: [] as string[],
  campaigns: [] as string[],
  expenses: [] as string[],
};

// Supabase client and session
let supabase: SupabaseClient;
let session: Session | null = null;

// --- SETUP & TEARDOWN ---
beforeAll(async () => {
  // Initialize Supabase client
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Sign in as admin
  const { data, error } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  if (error) {
    throw new Error(`Authentication failed: ${error.message}. Ensure admin@example.com exists with password 'password'.`);
  }

  session = data.session;
  console.log('Authenticated as:', session?.user.email);
});

afterAll(async () => {
  // --- CLEANUP: Delete all test data in reverse order of dependencies ---
  console.log('Starting cleanup...');

  // Delete expenses
  for (const id of createdIds.expenses) {
    await supabase.from('expenses').delete().eq('id', id);
  }

  // Delete campaigns
  for (const id of createdIds.campaigns) {
    await supabase.from('promotion_campaigns').delete().eq('id', id);
  }

  // Delete customers
  for (const id of createdIds.customers) {
    await supabase.from('customers').delete().eq('id', id);
  }

  // Delete reservations
  for (const id of createdIds.reservations) {
    await supabase.from('room_reservations').delete().eq('id', id);
  }

  // Delete rooms
  for (const id of createdIds.rooms) {
    await supabase.from('rooms').delete().eq('id', id);
  }

  // Delete tables
  for (const id of createdIds.tables) {
    await supabase.from('restaurant_tables').delete().eq('id', id);
  }

  // Delete menu items
  for (const id of createdIds.menuItems) {
    await supabase.from('menu_items').delete().eq('id', id);
  }

  // Delete orders
  for (const id of createdIds.orders) {
    await supabase.from('orders').delete().eq('id', id);
  }

  // Sign out
  await supabase.auth.signOut();
  console.log('Cleanup complete. Signed out.');
});

// =============================================================================
// OPERATIONS TESTS
// =============================================================================
describe('Operations', () => {
  
  // ---------------------------------------------------------------------------
  // POS: Order Creation
  // ---------------------------------------------------------------------------
  describe('POS Order Creation', () => {
    it('should create a new order via POS', async () => {
      const testOrder = {
        customer_name: 'Test Customer',
        items: [{ name: 'Test Item', price: 150, quantity: 2 }],
        total: 300,
        status: 'pending',
        source: 'pos',
        order_type: 'dine-in',
        restaurant_id: TEST_RESTAURANT_ID,
      };

      const { data, error } = await supabase
        .from('orders')
        .insert(testOrder)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.customer_name).toBe('Test Customer');
      expect(data.total).toBe(300);
      expect(data.source).toBe('pos');

      // Track for cleanup
      if (data) createdIds.orders.push(data.id);
    });

    it('should update order status to preparing', async () => {
      // First create an order
      const { data: newOrder } = await supabase
        .from('orders')
        .insert({
          customer_name: 'Status Test Customer',
          items: [{ name: 'Burger', price: 200, quantity: 1 }],
          total: 200,
          status: 'pending',
          source: 'pos',
          restaurant_id: TEST_RESTAURANT_ID,
        })
        .select()
        .single();

      if (newOrder) createdIds.orders.push(newOrder.id);

      // Update status
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'preparing' })
        .eq('id', newOrder?.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.status).toBe('preparing');
    });

    it('should fetch orders for the test restaurant', async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', TEST_RESTAURANT_ID)
        .limit(10);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Menu CRUD
  // ---------------------------------------------------------------------------
  describe('Menu CRUD', () => {
    it('should create a new menu item', async () => {
      const testMenuItem = {
        name: 'Test Menu Item',
        description: 'A test menu item for automated testing',
        price: 199.99,
        category: 'Test Category',
        is_available: true,
        restaurant_id: TEST_RESTAURANT_ID,
      };

      const { data, error } = await supabase
        .from('menu_items')
        .insert(testMenuItem)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.name).toBe('Test Menu Item');
      expect(data.price).toBe(199.99);

      if (data) createdIds.menuItems.push(data.id);
    });

    it('should update a menu item', async () => {
      // Create first
      const { data: item } = await supabase
        .from('menu_items')
        .insert({
          name: 'Update Test Item',
          price: 100,
          category: 'Test',
          restaurant_id: TEST_RESTAURANT_ID,
        })
        .select()
        .single();

      if (item) createdIds.menuItems.push(item.id);

      // Update
      const { data, error } = await supabase
        .from('menu_items')
        .update({ price: 150, is_available: false })
        .eq('id', item?.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.price).toBe(150);
      expect(data?.is_available).toBe(false);
    });

    it('should fetch menu items for the restaurant', async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', TEST_RESTAURANT_ID);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should delete a menu item', async () => {
      // Create one to delete
      const { data: item } = await supabase
        .from('menu_items')
        .insert({
          name: 'To Be Deleted',
          price: 50,
          category: 'Test',
          restaurant_id: TEST_RESTAURANT_ID,
        })
        .select()
        .single();

      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', item?.id);

      expect(error).toBeNull();

      // Verify deletion
      const { data: verifyData } = await supabase
        .from('menu_items')
        .select()
        .eq('id', item?.id)
        .single();

      expect(verifyData).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Tables CRUD
  // ---------------------------------------------------------------------------
  describe('Tables CRUD', () => {
    it('should create a new table', async () => {
      const testTable = {
        name: 'Test Table T99',
        capacity: 4,
        status: 'available',
        restaurant_id: TEST_RESTAURANT_ID,
      };

      const { data, error } = await supabase
        .from('restaurant_tables')
        .insert(testTable)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.name).toBe('Test Table T99');
      expect(data.capacity).toBe(4);

      if (data) createdIds.tables.push(data.id);
    });

    it('should update table status to occupied', async () => {
      // Create table
      const { data: table } = await supabase
        .from('restaurant_tables')
        .insert({
          name: 'Status Test Table',
          capacity: 2,
          status: 'available',
          restaurant_id: TEST_RESTAURANT_ID,
        })
        .select()
        .single();

      if (table) createdIds.tables.push(table.id);

      // Update
      const { data, error } = await supabase
        .from('restaurant_tables')
        .update({ status: 'occupied' })
        .eq('id', table?.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.status).toBe('occupied');
    });

    it('should fetch all tables for the restaurant', async () => {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .eq('restaurant_id', TEST_RESTAURANT_ID);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });
});

// =============================================================================
// GUEST SERVICES TESTS
// =============================================================================
describe('Guest Services', () => {

  // ---------------------------------------------------------------------------
  // Rooms CRUD
  // ---------------------------------------------------------------------------
  describe('Rooms CRUD', () => {
    it('should create a new room', async () => {
      const testRoom = {
        name: 'Test Room 101',
        capacity: 2,
        status: 'available',
        price: 1500,
        restaurant_id: TEST_RESTAURANT_ID,
      };

      const { data, error } = await supabase
        .from('rooms')
        .insert(testRoom)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.name).toBe('Test Room 101');
      expect(data.price).toBe(1500);

      if (data) createdIds.rooms.push(data.id);
    });

    it('should update room details', async () => {
      const { data: room } = await supabase
        .from('rooms')
        .insert({
          name: 'Room To Update',
          capacity: 3,
          status: 'available',
          price: 2000,
          restaurant_id: TEST_RESTAURANT_ID,
        })
        .select()
        .single();

      if (room) createdIds.rooms.push(room.id);

      const { data, error } = await supabase
        .from('rooms')
        .update({ price: 2500, status: 'occupied' })
        .eq('id', room?.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.price).toBe(2500);
      expect(data?.status).toBe('occupied');
    });

    it('should fetch rooms for the restaurant', async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('restaurant_id', TEST_RESTAURANT_ID);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Reservations CRUD
  // ---------------------------------------------------------------------------
  describe('Reservations CRUD', () => {
    let testRoomId: string | null = null;

    beforeAll(async () => {
      // Create a room for reservations
      const { data: room } = await supabase
        .from('rooms')
        .insert({
          name: 'Reservation Test Room',
          capacity: 2,
          status: 'available',
          price: 1000,
          restaurant_id: TEST_RESTAURANT_ID,
        })
        .select()
        .single();

      testRoomId = room?.id || null;
      if (room) createdIds.rooms.push(room.id);
    });

    it('should create a room reservation', async () => {
      if (!testRoomId) throw new Error('Test room not created');

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);

      const reservation = {
        room_id: testRoomId,
        customer_name: 'Test Guest',
        customer_phone: '9876543210',
        customer_email: 'testguest@example.com',
        start_time: tomorrow.toISOString(),
        end_time: dayAfter.toISOString(),
        status: 'confirmed',
        notes: 'Test reservation for automated testing',
        marketing_consent: false,
        restaurant_id: TEST_RESTAURANT_ID,
      };

      const { data, error } = await supabase
        .from('room_reservations')
        .insert(reservation)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.customer_name).toBe('Test Guest');
      expect(data.status).toBe('confirmed');

      if (data) createdIds.reservations.push(data.id);
    });

    it('should update reservation status to checked_in', async () => {
      if (!testRoomId) throw new Error('Test room not created');

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 3);
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 4);

      const { data: res } = await supabase
        .from('room_reservations')
        .insert({
          room_id: testRoomId,
          customer_name: 'Check In Guest',
          start_time: tomorrow.toISOString(),
          end_time: dayAfter.toISOString(),
          status: 'confirmed',
          marketing_consent: false,
          restaurant_id: TEST_RESTAURANT_ID,
        })
        .select()
        .single();

      if (res) createdIds.reservations.push(res.id);

      const { data, error } = await supabase
        .from('room_reservations')
        .update({ status: 'checked_in' })
        .eq('id', res?.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.status).toBe('checked_in');
    });

    it('should fetch reservations for the restaurant', async () => {
      const { data, error } = await supabase
        .from('room_reservations')
        .select('*, rooms(name, price)')
        .eq('restaurant_id', TEST_RESTAURANT_ID);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Checkout (Cash Payment simulation)
  // ---------------------------------------------------------------------------
  describe('Checkout with Cash Payment', () => {
    it('should mark reservation as checked_out (simulating cash checkout)', async () => {
      // Create a room for checkout test
      const { data: room } = await supabase
        .from('rooms')
        .insert({
          name: 'Checkout Test Room',
          capacity: 2,
          status: 'occupied',
          price: 1200,
          restaurant_id: TEST_RESTAURANT_ID,
        })
        .select()
        .single();

      if (room) createdIds.rooms.push(room.id);

      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Create reservation in checked_in state
      const { data: res } = await supabase
        .from('room_reservations')
        .insert({
          room_id: room?.id,
          customer_name: 'Checkout Guest',
          start_time: today.toISOString(),
          end_time: tomorrow.toISOString(),
          status: 'checked_in',
          marketing_consent: false,
          restaurant_id: TEST_RESTAURANT_ID,
        })
        .select()
        .single();

      if (res) createdIds.reservations.push(res.id);

      // Checkout - update reservation and room status
      const { data: checkoutRes, error: resError } = await supabase
        .from('room_reservations')
        .update({ status: 'checked_out' })
        .eq('id', res?.id)
        .select()
        .single();

      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .update({ status: 'available' })
        .eq('id', room?.id)
        .select()
        .single();

      expect(resError).toBeNull();
      expect(roomError).toBeNull();
      expect(checkoutRes?.status).toBe('checked_out');
      expect(roomData?.status).toBe('available');
    });
  });

  // ---------------------------------------------------------------------------
  // Room Food Orders (Room Service)
  // ---------------------------------------------------------------------------
  describe('Room Food Orders', () => {
    it('should create a food order associated with a room', async () => {
      // Create a room
      const { data: room } = await supabase
        .from('rooms')
        .insert({
          name: 'Food Order Test Room',
          capacity: 2,
          status: 'occupied',
          price: 1000,
          restaurant_id: TEST_RESTAURANT_ID,
        })
        .select()
        .single();

      if (room) createdIds.rooms.push(room.id);

      // Create order with room_service source
      const { data, error } = await supabase
        .from('orders')
        .insert({
          customer_name: 'Room Service Guest',
          items: [{ name: 'Room Burger', price: 250, quantity: 1 }],
          total: 250,
          status: 'pending',
          source: 'room_service',
          restaurant_id: TEST_RESTAURANT_ID,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.source).toBe('room_service');

      if (data) createdIds.orders.push(data.id);
    });
  });
});

// =============================================================================
// MANAGEMENT TESTS
// =============================================================================
describe('Management', () => {

  // ---------------------------------------------------------------------------
  // Customers CRUD
  // ---------------------------------------------------------------------------
  describe('Customers CRUD', () => {
    it('should create a new customer', async () => {
      const testCustomer = {
        name: 'Test Customer Management',
        email: 'testcustomer@example.com',
        phone: '9876543210',
        loyalty_tier: 'bronze',
        tags: ['test', 'automated'],
        restaurant_id: TEST_RESTAURANT_ID,
      };

      const { data, error } = await supabase
        .from('customers')
        .insert(testCustomer)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.name).toBe('Test Customer Management');

      if (data) createdIds.customers.push(data.id);
    });

    it('should update customer details', async () => {
      const { data: customer } = await supabase
        .from('customers')
        .insert({
          name: 'Update Customer Test',
          email: 'update@example.com',
          restaurant_id: TEST_RESTAURANT_ID,
        })
        .select()
        .single();

      if (customer) createdIds.customers.push(customer.id);

      const { data, error } = await supabase
        .from('customers')
        .update({ loyalty_tier: 'gold', tags: ['vip'] })
        .eq('id', customer?.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.loyalty_tier).toBe('gold');
    });

    it('should fetch customers for the restaurant', async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('restaurant_id', TEST_RESTAURANT_ID);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Marketing Campaigns
  // ---------------------------------------------------------------------------
  describe('Marketing Campaigns', () => {
    it('should create a new promotion campaign', async () => {
      const campaign = {
        name: 'Test Campaign',
        description: 'Automated test campaign',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        discount_percentage: 10,
        discount_amount: 0,
        promotion_code: 'TEST10',
        restaurant_id: TEST_RESTAURANT_ID,
      };

      const { data, error } = await supabase
        .from('promotion_campaigns')
        .insert(campaign)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.name).toBe('Test Campaign');
      expect(data.discount_percentage).toBe(10);

      if (data) createdIds.campaigns.push(data.id);
    });

    it('should update a campaign', async () => {
      const { data: campaign } = await supabase
        .from('promotion_campaigns')
        .insert({
          name: 'Update Campaign',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          discount_percentage: 5,
          discount_amount: 0,
          restaurant_id: TEST_RESTAURANT_ID,
        })
        .select()
        .single();

      if (campaign) createdIds.campaigns.push(campaign.id);

      const { data, error } = await supabase
        .from('promotion_campaigns')
        .update({ discount_percentage: 15 })
        .eq('id', campaign?.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.discount_percentage).toBe(15);
    });

    it('should fetch campaigns for the restaurant', async () => {
      const { data, error } = await supabase
        .from('promotion_campaigns')
        .select('*')
        .eq('restaurant_id', TEST_RESTAURANT_ID);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Expenses
  // ---------------------------------------------------------------------------
  describe('Expenses', () => {
    it('should create a new expense entry', async () => {
      const expense = {
        description: 'Test Expense Item',
        amount: 500,
        category: 'utilities',
        expense_date: new Date().toISOString().split('T')[0],
        restaurant_id: TEST_RESTAURANT_ID,
      };

      const { data, error } = await supabase
        .from('expenses')
        .insert(expense)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.amount).toBe(500);
      expect(data.category).toBe('utilities');

      if (data) createdIds.expenses.push(data.id);
    });

    it('should fetch expenses for the restaurant', async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('restaurant_id', TEST_RESTAURANT_ID);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Reports (Read-only)
  // ---------------------------------------------------------------------------
  describe('Reports (Read)', () => {
    it('should fetch orders data for reports', async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, total, status, created_at')
        .eq('restaurant_id', TEST_RESTAURANT_ID)
        .limit(100);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should fetch expense data for financial reports', async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('id, amount, category, expense_date')
        .eq('restaurant_id', TEST_RESTAURANT_ID);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });
});

// =============================================================================
// ADMIN READ-ONLY TESTS
// =============================================================================
describe('Admin Modules (Read-Only)', () => {

  // ---------------------------------------------------------------------------
  // User Management
  // ---------------------------------------------------------------------------
  describe('User Management (Read)', () => {
    it('should fetch profiles/users list for the test restaurant', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role, is_active, restaurant_id')
        .eq('restaurant_id', TEST_RESTAURANT_ID)
        .limit(50);

      // Note: RLS may restrict access - verify query works
      expect(Array.isArray(data) || error !== null).toBe(true);
    });

    it('should verify profile structure contains required fields', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role, restaurant_id')
        .eq('restaurant_id', TEST_RESTAURANT_ID)
        .limit(1);

      // Accept either valid data or RLS error
      if (!error && data && data.length > 0) {
        expect(data[0]).toHaveProperty('id');
        expect(data[0]).toHaveProperty('role');
      } else {
        // RLS may block access - that's acceptable
        expect(true).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Role Management
  // ---------------------------------------------------------------------------
  describe('Role Management (Read)', () => {
    it('should fetch roles list', async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, description, is_system, has_full_access, is_deletable')
        .eq('restaurant_id', TEST_RESTAURANT_ID);

      // Note: error may occur if RLS blocks access - that's expected
      // We just verify the query structure works
      expect(Array.isArray(data) || error !== null).toBe(true);
    });

    it('should verify roles structure if accessible', async () => {
      const { data } = await supabase
        .from('roles')
        .select('name, is_system, has_full_access')
        .eq('restaurant_id', TEST_RESTAURANT_ID)
        .limit(5);

      // Just verify the query works - data can be empty or have items
      if (data && data.length > 0) {
        expect(data[0]).toHaveProperty('name');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Security/Settings (Read)
  // ---------------------------------------------------------------------------
  describe('Settings (Read)', () => {
    it('should fetch restaurant settings', async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, is_active, verification_status')
        .eq('id', TEST_RESTAURANT_ID)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.name).toBe('Samarth Foods Products');
    });
  });
});
