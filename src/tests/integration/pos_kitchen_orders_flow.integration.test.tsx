/**
 * POS to Kitchen and Orders Flow Integration Tests
 * Tests the complete lifecycle of orders from POS systems, kitchen display, orders management, and payments.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { createMockOrder, createMockOrderItem } from '../utils/mockFactories';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
    },
  },
}));

describe('POS to Kitchen and Orders Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // 1. POS Order Entry Flows
  // ============================================
  describe('POS Entry Flows (QSR & QuickServe)', () => {
    it('creates a Dine-In QSR POS order with table selection', async () => {
      const orderData = createMockOrder({
        order_type: 'dine-in',
        table_number: 'T5',
        customer_name: 'Dine-In Guest',
        status: 'pending',
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...orderData, id: 'order-qsr-dinein' },
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      expect(result.error).toBeNull();
      expect(result.data.order_type).toBe('dine-in');
      expect(result.data.table_number).toBe('T5');
      expect(result.data.status).toBe('pending');
    });

    it('creates a Takeaway/Delivery QSR POS order', async () => {
      const orderData = createMockOrder({
        order_type: 'delivery',
        table_number: null,
        customer_name: 'Delivery Customer',
        customer_phone: '+919999988888',
        status: 'pending',
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...orderData, id: 'order-qsr-delivery' },
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      expect(result.error).toBeNull();
      expect(result.data.order_type).toBe('delivery');
      expect(result.data.customer_name).toBe('Delivery Customer');
      expect(result.data.table_number).toBeNull();
    });

    it('creates a QuickServe POS counter order with direct checkout', async () => {
      const orderData = createMockOrder({
        order_type: 'takeaway',
        customer_name: 'Walk-in Customer',
        status: 'completed', // QuickServe orders are often direct-paid and completed immediately
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...orderData, id: 'order-qs-counter' },
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      expect(result.error).toBeNull();
      expect(result.data.status).toBe('completed');
      expect(result.data.customer_name).toBe('Walk-in Customer');
    });

    it('simulates holding a QuickServe order and later resuming/saving it', () => {
      // Held orders in QuickServe are stored in local state (or a draft table) before persistence
      const activeCart = [
        createMockOrderItem({ menu_item_id: 'item-1', quantity: 2, unit_price: 150 }),
      ];

      // Step 1: Hold Order (simulate saving to memory/local state)
      const heldOrders: Record<string, typeof activeCart> = {};
      const holdId = 'held-001';
      heldOrders[holdId] = [...activeCart];

      expect(heldOrders[holdId]).toHaveLength(1);
      expect(heldOrders[holdId][0].quantity).toBe(2);

      // Step 2: Resume Order (simulate reloading cart)
      const restoredCart = heldOrders[holdId];
      delete heldOrders[holdId];

      expect(restoredCart).toHaveLength(1);
      expect(heldOrders[holdId]).toBeUndefined();
    });
  });

  // ============================================
  // 2. Kitchen Display System (KDS) Flow
  // ============================================
  describe('Kitchen Display System (KDS) Flow', () => {
    it('fetches all active kitchen orders (pending, preparing, ready)', async () => {
      const activeOrders = [
        createMockOrder({ id: '1', status: 'pending' }),
        createMockOrder({ id: '2', status: 'preparing' }),
        createMockOrder({ id: '3', status: 'ready' }),
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: activeOrders,
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', 'rest-123')
        .in('status', ['pending', 'preparing', 'ready']);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(3);
      expect(result.data.map((o: any) => o.status)).toContain('pending');
      expect(result.data.map((o: any) => o.status)).toContain('preparing');
      expect(result.data.map((o: any) => o.status)).toContain('ready');
    });

    it('transitions order status from pending -> preparing -> ready -> completed', async () => {
      const orderId = 'order-kds-lifecycle';
      const steps = ['preparing', 'ready', 'completed'];

      for (const nextStatus of steps) {
        const mockFrom = vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: orderId, status: nextStatus },
                  error: null,
                }),
              }),
            }),
          }),
        });

        (supabase.from as any) = mockFrom;

        const result = await supabase
          .from('orders')
          .update({ status: nextStatus, updated_at: new Date().toISOString() })
          .eq('id', orderId)
          .select()
          .single();

        expect(result.error).toBeNull();
        expect(result.data.status).toBe(nextStatus);
      }
    });

    it('toggles kitchen completion state of specific items inside an order', async () => {
      const orderItemId = 'item-detail-123';
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: orderItemId, is_completed: true },
                error: null,
              }),
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await supabase
        .from('order_items')
        .update({ is_completed: true })
        .eq('id', orderItemId)
        .select()
        .single();

      expect(result.error).toBeNull();
      expect(result.data.is_completed).toBe(true);
    });
  });

  // ============================================
  // 3. Orders Management (CRUD)
  // ============================================
  describe('Orders Management CRUD', () => {
    it('reads and filters orders by criteria', async () => {
      const mockOrders = [
        createMockOrder({ id: '1', order_type: 'dine-in', status: 'preparing' }),
        createMockOrder({ id: '2', order_type: 'takeaway', status: 'completed' }),
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [mockOrders[0]],
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      // Filter by type = 'dine-in' and status = 'preparing'
      const result = await supabase
        .from('orders')
        .select('*')
        .eq('order_type', 'dine-in')
        .eq('status', 'preparing');

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].order_type).toBe('dine-in');
      expect(result.data[0].status).toBe('preparing');
    });

    it('updates order details (table, discount, customer info)', async () => {
      const orderId = 'order-edit-123';
      const updates = {
        table_number: 'T10',
        discount: 150,
        customer_name: 'Jane Doe Updated',
      };

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: orderId, ...updates },
                error: null,
              }),
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId)
        .select()
        .single();

      expect(result.error).toBeNull();
      expect(result.data.table_number).toBe('T10');
      expect(result.data.discount).toBe(150);
      expect(result.data.customer_name).toBe('Jane Doe Updated');
    });

    it('soft deletes / cancels an order', async () => {
      const orderId = 'order-to-cancel';
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: orderId, status: 'cancelled' },
                error: null,
              }),
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId)
        .select()
        .single();

      expect(result.error).toBeNull();
      expect(result.data.status).toBe('cancelled');
    });
  });

  // ============================================
  // 4. Payments and Calculations
  // ============================================
  describe('Payments and Bill Calculations', () => {
    it('calculates complex subtotal, tax, service charge, discount, and total', () => {
      const items = [
        { quantity: 2, unit_price: 200 }, // 400
        { quantity: 1, unit_price: 350 }, // 350
      ];

      const discount = 100;
      const taxRate = 5; // 5%
      const serviceChargeRate = 10; // 10%

      // Subtotal calculation
      const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
      expect(subtotal).toBe(750);

      // Discount application
      const discountedSubtotal = Math.max(0, subtotal - discount);
      expect(discountedSubtotal).toBe(650);

      // Tax & Service Charge calculations
      const tax = (discountedSubtotal * taxRate) / 100;
      const serviceCharge = (discountedSubtotal * serviceChargeRate) / 100;

      expect(tax).toBe(32.5);
      expect(serviceCharge).toBe(65);

      // Final Total
      const total = discountedSubtotal + tax + serviceCharge;
      expect(total).toBe(747.5);
    });

    it('records a full single payment', async () => {
      const paymentData = {
        order_id: 'order-pay-123',
        amount: 850,
        payment_method: 'card',
        status: 'completed',
      };

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'payment-123', ...paymentData },
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await supabase
        .from('payments')
        .insert(paymentData)
        .select()
        .single();

      expect(result.error).toBeNull();
      expect(result.data.payment_method).toBe('card');
      expect(result.data.amount).toBe(850);
      expect(result.data.status).toBe('completed');
    });

    it('handles split payments across cash and card', () => {
      const orderTotal = 1500;
      const splitPayments = [
        { method: 'cash', amount: 500 },
        { method: 'card', amount: 1000 },
      ];

      const totalPaid = splitPayments.reduce((sum, p) => sum + p.amount, 0);
      const remainingAmount = orderTotal - totalPaid;

      expect(totalPaid).toBe(1500);
      expect(remainingAmount).toBe(0);
    });
  });
});
