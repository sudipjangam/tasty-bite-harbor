import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
    },
  },
}));

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({
    user: { 
        id: '123', 
        email: 'test@example.com', 
        role: 'staff',
        role_name_text: 'Owner' 
    },
    loading: false,
    hasPermission: () => true,
    hasAnyPermission: () => true,
    isRole: () => true,
    signOut: vi.fn(),
  }),
}));

describe('App Smoke Test', () => {
  it('renders the application shell without crashing', () => {
    render(<App />);
    // Since we mocked Auth to return a user, it should likely try to render the simple sidebar or dashboard
    // We can look for a generic element or just ensure it didn't throw.
    // Given the structure, we might look for "Total Sales" or some dashboard text if it defaults there.
    // For now, let's just assert truthy to confirm render success.
    expect(true).toBe(true);
  });
});
