import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from './utils/test-utils';
import KitchenDisplay from '../components/Kitchen/KitchenDisplay';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client with all required methods for new KitchenDisplay
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(), // For bumped_at null check
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(), // For pagination
      single: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'fake-token' } } }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { success: true }, error: null })
    }
  },
}));

describe('Page Validation Checks', () => {
    
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Kitchen Display', () => {
    it('renders empty state initially', async () => {
      // Single consolidated mock implementation that handles all table queries
      (supabase.from as any).mockImplementation((table: string) => {
        // Create chainable methods that return the proper resolution
        const createChainableMock = (finalData: any) => {
          const chainable: any = {
            select: vi.fn(() => chainable),
            eq: vi.fn(() => chainable),
            is: vi.fn(() => chainable), // For bumped_at null check
            order: vi.fn(() => chainable),
            range: vi.fn(() => Promise.resolve(finalData)), // Pagination ends chain
            gte: vi.fn(() => chainable),
            lte: vi.fn(() => chainable),
            single: vi.fn(() => Promise.resolve(finalData)),
            update: vi.fn(() => chainable),
          };
          return chainable;
        };

        if (table === 'profiles') {
          return createChainableMock({ data: { restaurant_id: 'rest-123' } });
        }
        if (table === 'kitchen_orders') {
          return createChainableMock({ data: [], error: null });
        }
        // Default fallback
        return createChainableMock({ data: null });
      });

      renderWithProviders(<KitchenDisplay />);
      
      // Check for main title
      expect(screen.getByText(/Kitchen Display System/i)).toBeInTheDocument();
      expect(screen.getByText(/Real-time order management dashboard/i)).toBeInTheDocument();
      // Stats should be zero
      expect(screen.getByText('Total Orders')).toBeInTheDocument();
    });

    it('shows station filter dropdown', async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        const createChainableMock = (finalData: any) => {
          const chainable: any = {
            select: vi.fn(() => chainable),
            eq: vi.fn(() => chainable),
            is: vi.fn(() => chainable),
            order: vi.fn(() => chainable),
            range: vi.fn(() => Promise.resolve(finalData)),
            gte: vi.fn(() => chainable),
            lte: vi.fn(() => chainable),
            single: vi.fn(() => Promise.resolve(finalData)),
          };
          return chainable;
        };

        if (table === 'profiles') {
          return createChainableMock({ data: { restaurant_id: 'rest-123' } });
        }
        if (table === 'kitchen_orders') {
          return createChainableMock({ data: [], error: null });
        }
        return createChainableMock({ data: null });
      });

      renderWithProviders(<KitchenDisplay />);
      
      // Check for station filter (the Select component)
      expect(screen.getByText('All Stations')).toBeInTheDocument();
    });

    it('shows date filter tabs with All option', async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        const createChainableMock = (finalData: any) => {
          const chainable: any = {
            select: vi.fn(() => chainable),
            eq: vi.fn(() => chainable),
            is: vi.fn(() => chainable),
            order: vi.fn(() => chainable),
            range: vi.fn(() => Promise.resolve(finalData)),
            gte: vi.fn(() => chainable),
            lte: vi.fn(() => chainable),
            single: vi.fn(() => Promise.resolve(finalData)),
          };
          return chainable;
        };

        if (table === 'profiles') {
          return createChainableMock({ data: { restaurant_id: 'rest-123' } });
        }
        if (table === 'kitchen_orders') {
          return createChainableMock({ data: [], error: null });
        }
        return createChainableMock({ data: null });
      });

      renderWithProviders(<KitchenDisplay />);
      
      // Check for date filter tabs including new "All" option
      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Yesterday')).toBeInTheDocument();
      expect(screen.getByText('7 Days')).toBeInTheDocument();
      expect(screen.getByText('Month')).toBeInTheDocument();
      expect(screen.getByText('All')).toBeInTheDocument();
    });

    it('displays order columns for each status', async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        const createChainableMock = (finalData: any) => {
          const chainable: any = {
            select: vi.fn(() => chainable),
            eq: vi.fn(() => chainable),
            is: vi.fn(() => chainable),
            order: vi.fn(() => chainable),
            range: vi.fn(() => Promise.resolve(finalData)),
            gte: vi.fn(() => chainable),
            lte: vi.fn(() => chainable),
            single: vi.fn(() => Promise.resolve(finalData)),
          };
          return chainable;
        };

        if (table === 'profiles') {
          return createChainableMock({ data: { restaurant_id: 'rest-123' } });
        }
        if (table === 'kitchen_orders') {
          return createChainableMock({ data: [], error: null });
        }
        return createChainableMock({ data: null });
      });

      renderWithProviders(<KitchenDisplay />);
      
      // Check for the three order columns (using getAllByText since text may appear multiple places)
      expect(screen.getAllByText('New Orders').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Preparing').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Ready').length).toBeGreaterThan(0);
    });
  });

  describe('Inventory Validation', () => {
    it('prevents negative quantity logic (simulation)', () => {
      const validateQuantity = (qty: number) => qty >= 0;
      expect(validateQuantity(10)).toBe(true);
      expect(validateQuantity(0)).toBe(true);
      expect(validateQuantity(-5)).toBe(false);
    });
  });
  
  describe('Menu Validation', () => {
    it('requires name and price for menu items (simulation)', () => {
      const validateMenuItem = (item: { name: string, price: number }) => {
        return item.name.length > 0 && item.price > 0;
      };
      
      expect(validateMenuItem({ name: 'Burger', price: 100 })).toBe(true);
      expect(validateMenuItem({ name: '', price: 100 })).toBe(false);
      expect(validateMenuItem({ name: 'Burger', price: 0 })).toBe(false);
    });
  });

  describe('Priority System Validation', () => {
    it('sorts orders by priority correctly (simulation)', () => {
      const orders = [
        { id: '1', priority: 'normal' as const },
        { id: '2', priority: 'vip' as const },
        { id: '3', priority: 'rush' as const },
      ];
      
      const priorityOrder = { vip: 0, rush: 1, normal: 2 };
      const sorted = [...orders].sort((a, b) => 
        priorityOrder[a.priority] - priorityOrder[b.priority]
      );
      
      expect(sorted[0].priority).toBe('vip');
      expect(sorted[1].priority).toBe('rush');
      expect(sorted[2].priority).toBe('normal');
    });

    it('detects allergy notes correctly (simulation)', () => {
      const hasAllergy = (notes: string[]) => 
        notes.some(note => /allerg|gluten|dairy|nut|vegan|vegetarian/i.test(note));
      
      expect(hasAllergy(['No onions'])).toBe(false);
      expect(hasAllergy(['Gluten free please'])).toBe(true);
      expect(hasAllergy(['NUT ALLERGY'])).toBe(true);
      expect(hasAllergy(['Dairy free', 'Extra cheese'])).toBe(true);
      expect(hasAllergy(['Vegan option'])).toBe(true);
    });

    it('calculates late orders correctly (simulation)', () => {
      const LATE_THRESHOLD = 15; // minutes
      const isOrderLate = (createdAt: Date, estimatedPrepTime?: number) => {
        const now = new Date();
        const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60);
        return minutesSinceCreation > (estimatedPrepTime || LATE_THRESHOLD);
      };
      
      // Order created 5 minutes ago - not late
      const recentOrder = new Date(Date.now() - 5 * 60 * 1000);
      expect(isOrderLate(recentOrder)).toBe(false);
      
      // Order created 20 minutes ago - late
      const oldOrder = new Date(Date.now() - 20 * 60 * 1000);
      expect(isOrderLate(oldOrder)).toBe(true);
      
      // Order with custom prep time of 30 mins, created 25 mins ago - not late
      const customOrder = new Date(Date.now() - 25 * 60 * 1000);
      expect(isOrderLate(customOrder, 30)).toBe(false);
    });
  });

});
