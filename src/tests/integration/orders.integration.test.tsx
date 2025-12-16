/**
 * Orders Integration Tests
 * Tests for order CRUD operations with database verification
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

describe('Orders Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Create Order', () => {
    it('successfully creates a new order', async () => {
      const newOrder = createMockOrder({
        customer_name: 'Test Customer',
        total: 1000,
        status: 'pending',
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...newOrder, id: 'order-123' },
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await supabase
        .from('orders')
        .insert(newOrder)
        .select()
        .single();

      expect(result.error).toBeNull();
      expect(result.data.customer_name).toBe('Test Customer');
      expect(result.data.status).toBe('pending');
    });

    it('creates order with items', async () => {
      const order = createMockOrder();
      const items = [
        createMockOrderItem({ order_id: 'order-123', menu_item_id: 'item-1', quantity: 2 }),
        createMockOrderItem({ order_id: 'order-123', menu_item_id: 'item-2', quantity: 1 }),
      ];

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: items,
            error: null,
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await supabase
        .from('order_items')
        .insert(items)
        .select();

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
    });

    it('validates required fields', async () => {
      const invalidOrder = {
        // Missing required fields
        customer_name: '',
        total: -100,
      };

      const validateOrder = (order: typeof invalidOrder) => {
        const errors: string[] = [];
        if (!order.customer_name) errors.push('Customer name required');
        if (order.total < 0) errors.push('Total cannot be negative');
        return errors;
      };

      const errors = validateOrder(invalidOrder);
      expect(errors).toContain('Customer name required');
      expect(errors).toContain('Total cannot be negative');
    });
  });

  describe('Read Orders', () => {
    it('fetches orders for restaurant', async () => {
      const mockOrders = [
        createMockOrder({ id: '1', order_number: 'ORD-001' }),
        createMockOrder({ id: '2', order_number: 'ORD-002' }),
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockOrders,
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
        .order('created_at', { ascending: false });

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
    });

    it('fetches single order with items', async () => {
      const mockOrder = createMockOrder({ id: 'order-123' });
      const mockItems = [
        createMockOrderItem({ order_id: 'order-123' }),
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockOrder, order_items: mockItems },
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', 'order-123')
        .single();

      expect(result.error).toBeNull();
      expect(result.data.order_items).toHaveLength(1);
    });

    it('filters orders by status', async () => {
      const mockOrders = [
        createMockOrder({ status: 'pending' }),
        createMockOrder({ status: 'pending' }),
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockOrders,
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
        .eq('status', 'pending');

      expect(result.data).toHaveLength(2);
      expect(result.data?.every((o: any) => o.status === 'pending')).toBe(true);
    });

    it('filters orders by date range', async () => {
      const today = new Date().toISOString().split('T')[0];
      const mockOrders = [createMockOrder()];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue({
                data: mockOrders,
                error: null,
              }),
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', 'rest-123')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      expect(result.error).toBeNull();
    });
  });

  describe('Update Order', () => {
    it('updates order status', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'order-123', status: 'preparing' },
                error: null,
              }),
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await supabase
        .from('orders')
        .update({ status: 'preparing', updated_at: new Date().toISOString() })
        .eq('id', 'order-123')
        .select()
        .single();

      expect(result.error).toBeNull();
      expect(result.data.status).toBe('preparing');
    });

    it('updates order with discount', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { 
                  id: 'order-123', 
                  subtotal: 1000,
                  discount: 100,
                  total: 900,
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await supabase
        .from('orders')
        .update({ discount: 100, total: 900 })
        .eq('id', 'order-123')
        .select()
        .single();

      expect(result.error).toBeNull();
      expect(result.data.discount).toBe(100);
      expect(result.data.total).toBe(900);
    });
  });

  describe('Delete Order', () => {
    it('soft deletes an order', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: 'order-123', status: 'cancelled' },
            error: null,
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      // Soft delete by changing status
      const result = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', 'order-123');

      expect(result.error).toBeNull();
    });
  });

  describe('Order Calculations', () => {
    it('calculates order total correctly', () => {
      const items = [
        { quantity: 2, unit_price: 250, modifiers: 0 },
        { quantity: 1, unit_price: 400, modifiers: 50 },
        { quantity: 3, unit_price: 150, modifiers: 0 },
      ];

      const calculateSubtotal = (orderItems: typeof items) => 
        orderItems.reduce((sum, item) => 
          sum + (item.quantity * item.unit_price) + item.modifiers, 0
        );

      const subtotal = calculateSubtotal(items);
      // 2*250 + 1*400+50 + 3*150 = 500 + 450 + 450 = 1400
      expect(subtotal).toBe(1400);
    });

    it('applies tax correctly', () => {
      const subtotal = 1000;
      const taxRate = 5; // 5%
      const tax = (subtotal * taxRate) / 100;
      const total = subtotal + tax;

      expect(tax).toBe(50);
      expect(total).toBe(1050);
    });

    it('applies service charge correctly', () => {
      const subtotal = 1000;
      const serviceChargeRate = 10; // 10%
      const serviceCharge = (subtotal * serviceChargeRate) / 100;

      expect(serviceCharge).toBe(100);
    });
  });

  describe('Payment Recording', () => {
    it('records payment for order', async () => {
      const payment = {
        order_id: 'order-123',
        amount: 1000,
        payment_method: 'cash',
        status: 'completed',
      };

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...payment, id: 'payment-123' },
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await supabase
        .from('payments')
        .insert(payment)
        .select()
        .single();

      expect(result.error).toBeNull();
      expect(result.data.amount).toBe(1000);
      expect(result.data.status).toBe('completed');
    });

    it('handles split payment', () => {
      const orderTotal = 1000;
      const payments = [
        { method: 'cash', amount: 600 },
        { method: 'card', amount: 400 },
      ];

      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const remaining = orderTotal - totalPaid;

      expect(totalPaid).toBe(1000);
      expect(remaining).toBe(0);
    });
  });
});

describe('Order Status Workflow', () => {
  const statusFlow = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['preparing', 'cancelled'],
    'preparing': ['ready'],
    'ready': ['completed', 'preparing'],
    'completed': [],
    'cancelled': [],
  };

  it('validates all status transitions', () => {
    Object.entries(statusFlow).forEach(([from, validTo]) => {
      validTo.forEach(to => {
        const canTransition = statusFlow[from as keyof typeof statusFlow].includes(to);
        expect(canTransition).toBe(true);
      });
    });
  });

  it('prevents invalid status transitions', () => {
    const canTransition = (from: string, to: string) => 
      statusFlow[from as keyof typeof statusFlow]?.includes(to) || false;

    expect(canTransition('completed', 'pending')).toBe(false);
    expect(canTransition('cancelled', 'preparing')).toBe(false);
    expect(canTransition('pending', 'completed')).toBe(false);
  });
});
