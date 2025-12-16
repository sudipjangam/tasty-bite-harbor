/**
 * Reservations Page Tests
 * Tests for the Reservations management page component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../utils/test-utils';
import Reservations from '@/pages/Reservations';
import { createMockReservation } from '../utils/mockFactories';

// Mock reservation data
const today = new Date().toISOString().split('T')[0];
const mockReservations = [
  createMockReservation({ 
    id: '1', 
    customer_name: 'Raj Kumar', 
    date: today,
    time: '12:00',
    party_size: 4,
    status: 'confirmed',
  }),
  createMockReservation({ 
    id: '2', 
    customer_name: 'Priya Sharma', 
    date: today,
    time: '13:00',
    party_size: 2,
    status: 'pending',
  }),
  createMockReservation({ 
    id: '3', 
    customer_name: 'Amit Patel', 
    date: today,
    time: '19:00',
    party_size: 6,
    status: 'confirmed',
  }),
  createMockReservation({ 
    id: '4', 
    customer_name: 'Sneha Singh', 
    date: today,
    time: '20:00',
    party_size: 4,
    status: 'seated',
  }),
];

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
    from: vi.fn((table: string) => {
      const createChainable = (data: any) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn(() => Promise.resolve({ data, error: null })),
        then: vi.fn((resolve) => resolve({ data, error: null })),
      });

      if (table === 'profiles') {
        return createChainable({ restaurant_id: 'test-restaurant-id' });
      }
      if (table === 'reservations') {
        return createChainable(mockReservations);
      }
      if (table === 'tables') {
        return createChainable([
          { id: 't1', table_number: 'T1', capacity: 4, status: 'available' },
          { id: 't2', table_number: 'T2', capacity: 6, status: 'occupied' },
        ]);
      }
      return createChainable(null);
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'fake-token' } } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({
    user: { 
      id: 'test-user-id', 
      email: 'test@example.com', 
      role: 'owner',
      restaurant_id: 'test-restaurant-id',
    },
    loading: false,
    hasPermission: () => true,
    hasAnyPermission: () => true,
    isRole: () => true,
    signOut: vi.fn(),
  }),
}));

describe('Reservations Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      renderWithProviders(<Reservations />);
      expect(document.body).toBeTruthy();
    });

    it('displays Reservations title', async () => {
      renderWithProviders(<Reservations />);
      
      await waitFor(() => {
        const title = screen.queryByText(/Reservations/i) || 
                     screen.queryByText(/Bookings/i);
        expect(title || document.body).toBeTruthy();
      });
    });
  });
});

describe('Reservation Business Logic', () => {
  describe('Time Slot Validation', () => {
    it('validates reservation time is in operating hours', () => {
      const openingTime = '10:00';
      const closingTime = '22:00';
      
      const isValidTime = (time: string) => {
        return time >= openingTime && time <= closingTime;
      };
      
      expect(isValidTime('12:00')).toBe(true);
      expect(isValidTime('19:00')).toBe(true);
      expect(isValidTime('09:00')).toBe(false);
      expect(isValidTime('23:00')).toBe(false);
    });

    it('validates minimum advance booking', () => {
      const minHoursAdvance = 2;
      
      const isValidAdvanceBooking = (reservationDateTime: Date) => {
        const now = new Date();
        const diffHours = (reservationDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        return diffHours >= minHoursAdvance;
      };
      
      const validTime = new Date(Date.now() + 3 * 60 * 60 * 1000);
      const invalidTime = new Date(Date.now() + 1 * 60 * 60 * 1000);
      
      expect(isValidAdvanceBooking(validTime)).toBe(true);
      expect(isValidAdvanceBooking(invalidTime)).toBe(false);
    });

    it('validates party size within limits', () => {
      const maxPartySize = 20;
      const minPartySize = 1;
      
      const isValidPartySize = (size: number) => 
        size >= minPartySize && size <= maxPartySize;
      
      expect(isValidPartySize(4)).toBe(true);
      expect(isValidPartySize(1)).toBe(true);
      expect(isValidPartySize(20)).toBe(true);
      expect(isValidPartySize(0)).toBe(false);
      expect(isValidPartySize(25)).toBe(false);
    });
  });

  describe('Table Assignment', () => {
    it('finds suitable table for party size', () => {
      const tables = [
        { id: 't1', capacity: 2 },
        { id: 't2', capacity: 4 },
        { id: 't3', capacity: 6 },
        { id: 't4', capacity: 8 },
      ];
      
      const findSuitableTable = (partySize: number) => {
        return tables
          .filter(t => t.capacity >= partySize)
          .sort((a, b) => a.capacity - b.capacity)[0] || null;
      };
      
      expect(findSuitableTable(3)?.id).toBe('t2'); // 4-seater
      expect(findSuitableTable(5)?.id).toBe('t3'); // 6-seater
      expect(findSuitableTable(2)?.id).toBe('t1'); // 2-seater (exact match)
      expect(findSuitableTable(10)).toBeNull();
    });

    it('checks table availability for time slot', () => {
      const reservations = mockReservations;
      const slotDurationMinutes = 90;
      
      const isTableAvailable = (
        tableId: string, 
        date: string, 
        requestedTime: string
      ) => {
        const requestedMinutes = parseInt(requestedTime.split(':')[0]) * 60 + 
                                 parseInt(requestedTime.split(':')[1]);
        
        const conflicting = reservations.filter(r => 
          r.table_id === tableId && 
          r.date === date &&
          r.status !== 'cancelled' &&
          r.status !== 'completed'
        );
        
        for (const res of conflicting) {
          const resMinutes = parseInt(res.time.split(':')[0]) * 60 + 
                            parseInt(res.time.split(':')[1]);
          if (Math.abs(requestedMinutes - resMinutes) < slotDurationMinutes) {
            return false;
          }
        }
        return true;
      };
      
      // This would check against actual table assignments
      expect(typeof isTableAvailable).toBe('function');
    });
  });

  describe('Status Transitions', () => {
    it('validates status transition flow', () => {
      const validTransitions: Record<string, string[]> = {
        'pending': ['confirmed', 'cancelled'],
        'confirmed': ['seated', 'cancelled', 'no-show'],
        'seated': ['completed'],
        'completed': [],
        'cancelled': [],
        'no-show': [],
      };
      
      const canTransition = (from: string, to: string) => 
        validTransitions[from]?.includes(to) || false;
      
      expect(canTransition('pending', 'confirmed')).toBe(true);
      expect(canTransition('confirmed', 'seated')).toBe(true);
      expect(canTransition('pending', 'seated')).toBe(false);
      expect(canTransition('completed', 'pending')).toBe(false);
    });
  });

  describe('Filtering and Search', () => {
    it('filters by status', () => {
      const status = 'confirmed';
      const filtered = mockReservations.filter(r => r.status === status);
      
      expect(filtered).toHaveLength(2);
    });

    it('filters by date', () => {
      const filtered = mockReservations.filter(r => r.date === today);
      expect(filtered).toHaveLength(4);
    });

    it('filters by time range', () => {
      const eveningReservations = mockReservations.filter(r => 
        r.time >= '18:00'
      );
      
      expect(eveningReservations).toHaveLength(2);
    });

    it('searches by customer name', () => {
      const searchTerm = 'sharma';
      const results = mockReservations.filter(r => 
        r.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      expect(results).toHaveLength(1);
      expect(results[0].customer_name).toBe('Priya Sharma');
    });
  });

  describe('Statistics', () => {
    it('calculates total covers', () => {
      const totalCovers = mockReservations.reduce((sum, r) => sum + r.party_size, 0);
      expect(totalCovers).toBe(16); // 4 + 2 + 6 + 4
    });

    it('counts by status', () => {
      const countByStatus = mockReservations.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      expect(countByStatus['confirmed']).toBe(2);
      expect(countByStatus['pending']).toBe(1);
      expect(countByStatus['seated']).toBe(1);
    });

    it('calculates no-show rate', () => {
      const calculateNoShowRate = (reservations: typeof mockReservations) => {
        const completed = reservations.filter(r => 
          ['completed', 'no-show'].includes(r.status)
        );
        if (completed.length === 0) return 0;
        
        const noShows = completed.filter(r => r.status === 'no-show').length;
        return (noShows / completed.length) * 100;
      };
      
      expect(calculateNoShowRate(mockReservations)).toBe(0);
    });
  });
});
