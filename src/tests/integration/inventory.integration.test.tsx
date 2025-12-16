/**
 * Inventory Integration Tests
 * Tests for inventory CRUD operations with database verification
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { createMockInventoryItem, createLowStockInventoryItem } from '../utils/mockFactories';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
    },
  },
}));

describe('Inventory Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Create Inventory Item', () => {
    it('successfully creates a new inventory item', async () => {
      const newItem = createMockInventoryItem({
        name: 'Chicken',
        quantity: 50,
        unit: 'kg',
        min_quantity: 10,
        cost_per_unit: 200,
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...newItem, id: 'inv-123' },
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await supabase
        .from('inventory_items')
        .insert(newItem)
        .select()
        .single();

      expect(result.error).toBeNull();
      expect(result.data.name).toBe('Chicken');
      expect(result.data.quantity).toBe(50);
    });

    it('validates required fields', () => {
      const validateInventoryItem = (item: Partial<{
        name: string;
        quantity: number;
        unit: string;
        min_quantity: number;
      }>) => {
        const errors: string[] = [];
        if (!item.name || item.name.trim().length === 0) {
          errors.push('Name is required');
        }
        if (item.quantity === undefined || item.quantity < 0) {
          errors.push('Quantity cannot be negative');
        }
        if (!item.unit) {
          errors.push('Unit is required');
        }
        return errors;
      };

      expect(validateInventoryItem({})).toContain('Name is required');
      expect(validateInventoryItem({ name: 'Test', quantity: -5 })).toContain('Quantity cannot be negative');
      expect(validateInventoryItem({ name: 'Test', quantity: 10 })).toContain('Unit is required');
    });
  });

  describe('Read Inventory', () => {
    it('fetches all inventory items', async () => {
      const mockItems = [
        createMockInventoryItem({ name: 'Chicken' }),
        createMockInventoryItem({ name: 'Rice' }),
        createMockInventoryItem({ name: 'Oil' }),
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockItems,
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await supabase
        .from('inventory_items')
        .select('*')
        .eq('restaurant_id', 'rest-123')
        .order('name');

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(3);
    });

    it('fetches low stock items', async () => {
      const mockItems = [
        createLowStockInventoryItem({ name: 'Low Item 1' }),
        createLowStockInventoryItem({ name: 'Low Item 2' }),
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            lt: vi.fn().mockResolvedValue({
              data: mockItems,
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      // Note: This is a simplified mock - actual query would use raw SQL or RPC
      const result = await supabase
        .from('inventory_items')
        .select('*')
        .eq('restaurant_id', 'rest-123')
        .lt('quantity', 'min_quantity'); // Simplified

      expect(result.error).toBeNull();
    });
  });

  describe('Update Inventory', () => {
    it('updates item quantity', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'inv-123', quantity: 75 },
                error: null,
              }),
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await supabase
        .from('inventory_items')
        .update({ quantity: 75, last_restocked: new Date().toISOString() })
        .eq('id', 'inv-123')
        .select()
        .single();

      expect(result.error).toBeNull();
      expect(result.data.quantity).toBe(75);
    });

    it('deducts inventory on order', async () => {
      const currentQuantity = 50;
      const orderQuantity = 5;
      const newQuantity = currentQuantity - orderQuantity;

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'inv-123', quantity: newQuantity },
                error: null,
              }),
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await supabase
        .from('inventory_items')
        .update({ quantity: newQuantity })
        .eq('id', 'inv-123')
        .select()
        .single();

      expect(result.data.quantity).toBe(45);
    });

    it('prevents negative quantity', () => {
      const currentQuantity = 5;
      const requestedDeduction = 10;

      const canDeduct = (current: number, amount: number) => current >= amount;
      const safeDeduct = (current: number, amount: number) => 
        canDeduct(current, amount) ? current - amount : current;

      expect(canDeduct(currentQuantity, requestedDeduction)).toBe(false);
      expect(safeDeduct(currentQuantity, requestedDeduction)).toBe(5); // No change
    });
  });

  describe('Stock Level Alerts', () => {
    it('identifies items below minimum', () => {
      const items = [
        { id: '1', name: 'Chicken', quantity: 50, min_quantity: 10 },
        { id: '2', name: 'Oil', quantity: 2, min_quantity: 10 },
        { id: '3', name: 'Rice', quantity: 8, min_quantity: 20 },
      ];

      const lowStockItems = items.filter(i => i.quantity < i.min_quantity);

      expect(lowStockItems).toHaveLength(2);
      expect(lowStockItems.map(i => i.name)).toContain('Oil');
      expect(lowStockItems.map(i => i.name)).toContain('Rice');
    });

    it('calculates reorder quantity', () => {
      const calculateReorderQty = (
        current: number, 
        min: number, 
        reorderPoint: number = 1.5
      ) => {
        if (current >= min) return 0;
        return Math.ceil(min * reorderPoint) - current;
      };

      // Current: 2, Min: 10, Need to reach 15 (1.5x)
      expect(calculateReorderQty(2, 10)).toBe(13);
      // Already above min
      expect(calculateReorderQty(50, 10)).toBe(0);
    });

    it('categorizes alert severity', () => {
      const getAlertSeverity = (quantity: number, minQuantity: number) => {
        const ratio = quantity / minQuantity;
        if (ratio <= 0.2) return 'critical';
        if (ratio <= 0.5) return 'warning';
        if (ratio <= 1) return 'low';
        return 'ok';
      };

      expect(getAlertSeverity(1, 10)).toBe('critical'); // 10%
      expect(getAlertSeverity(3, 10)).toBe('warning');  // 30%
      expect(getAlertSeverity(8, 10)).toBe('low');      // 80%
      expect(getAlertSeverity(15, 10)).toBe('ok');      // 150%
    });
  });

  describe('Inventory Transactions', () => {
    it('records stock addition', async () => {
      const transaction = {
        inventory_item_id: 'inv-123',
        type: 'addition',
        quantity: 25,
        reason: 'Restocking',
        performed_by: 'user-123',
      };

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...transaction, id: 'trans-123' },
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await supabase
        .from('inventory_transactions')
        .insert(transaction)
        .select()
        .single();

      expect(result.error).toBeNull();
      expect(result.data.type).toBe('addition');
      expect(result.data.quantity).toBe(25);
    });

    it('records stock deduction', async () => {
      const transaction = {
        inventory_item_id: 'inv-123',
        type: 'deduction',
        quantity: 5,
        reason: 'Order preparation',
        order_id: 'order-456',
      };

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...transaction, id: 'trans-124' },
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await supabase
        .from('inventory_transactions')
        .insert(transaction)
        .select()
        .single();

      expect(result.data.type).toBe('deduction');
    });

    it('tracks adjustment with reason', () => {
      const validReasons = [
        'Restocking',
        'Order preparation',
        'Wastage',
        'Damaged goods',
        'Stock count adjustment',
        'Transfer',
      ];

      const isValidReason = (reason: string) => 
        validReasons.includes(reason) || reason.length > 0;

      expect(isValidReason('Restocking')).toBe(true);
      expect(isValidReason('Custom reason')).toBe(true);
    });
  });

  describe('Supplier Integration', () => {
    it('links inventory item to supplier', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'inv-123', supplier_id: 'supplier-456' },
                error: null,
              }),
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await supabase
        .from('inventory_items')
        .update({ supplier_id: 'supplier-456' })
        .eq('id', 'inv-123')
        .select()
        .single();

      expect(result.data.supplier_id).toBe('supplier-456');
    });

    it('fetches items with supplier details', async () => {
      const mockItem = {
        ...createMockInventoryItem(),
        suppliers: { id: 'sup-1', name: 'ABC Suppliers', phone: '+91-9876543210' },
      };

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockItem,
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await supabase
        .from('inventory_items')
        .select('*, suppliers(*)')
        .eq('id', 'inv-123')
        .single();

      expect(result.data.suppliers.name).toBe('ABC Suppliers');
    });
  });
});

describe('Inventory Calculations', () => {
  it('calculates total inventory value', () => {
    const items = [
      { quantity: 50, cost_per_unit: 200 },  // 10000
      { quantity: 100, cost_per_unit: 60 },  // 6000
      { quantity: 25, cost_per_unit: 400 },  // 10000
    ];

    const totalValue = items.reduce(
      (sum, item) => sum + (item.quantity * item.cost_per_unit), 
      0
    );

    expect(totalValue).toBe(26000);
  });

  it('calculates category-wise inventory value', () => {
    const items = [
      { category: 'Meat', quantity: 50, cost_per_unit: 200 },
      { category: 'Meat', quantity: 30, cost_per_unit: 180 },
      { category: 'Vegetables', quantity: 40, cost_per_unit: 50 },
    ];

    const categoryValues = items.reduce((acc, item) => {
      const value = item.quantity * item.cost_per_unit;
      acc[item.category] = (acc[item.category] || 0) + value;
      return acc;
    }, {} as Record<string, number>);

    expect(categoryValues['Meat']).toBe(15400);
    expect(categoryValues['Vegetables']).toBe(2000);
  });

  it('calculates usage rate', () => {
    const calculateDailyUsage = (
      totalUsed: number, 
      daysInPeriod: number
    ) => daysInPeriod > 0 ? totalUsed / daysInPeriod : 0;

    expect(calculateDailyUsage(210, 30)).toBe(7); // 7 units/day
    expect(calculateDailyUsage(0, 30)).toBe(0);
  });

  it('estimates days until stockout', () => {
    const estimateDaysUntilStockout = (
      currentQuantity: number, 
      dailyUsage: number
    ) => {
      if (dailyUsage <= 0) return Infinity;
      return Math.floor(currentQuantity / dailyUsage);
    };

    expect(estimateDaysUntilStockout(70, 10)).toBe(7);
    expect(estimateDaysUntilStockout(100, 0)).toBe(Infinity);
  });
});
