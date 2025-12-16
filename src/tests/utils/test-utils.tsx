import React, { ReactNode, createContext } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';

// ============================================
// Types
// ============================================

export interface MockUser {
  id: string;
  email: string;
  role: string;
  role_name_text?: string;
  restaurant_id: string;
  is_active: boolean;
  full_name?: string;
}

export interface MockAuthValue {
  user: MockUser | null;
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  isRole: (role: string) => boolean;
  signOut: () => Promise<void>;
}

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: MockUser | null;
  permissions?: string[];
  roles?: string[];
  initialRoute?: string;
  theme?: 'light' | 'dark' | 'system';
  useMemoryRouter?: boolean;
}

// ============================================
// Default Mock User
// ============================================

export const defaultMockUser: MockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'owner',
  role_name_text: 'Owner',
  restaurant_id: 'test-restaurant-id',
  is_active: true,
  full_name: 'Test User',
};

export const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  ...defaultMockUser,
  ...overrides,
});

// ============================================
// Query Client Factory
// ============================================

export const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
      staleTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
});

// ============================================
// Mock Auth Context
// ============================================

export const MockAuthContext = createContext<MockAuthValue>({
  user: defaultMockUser,
  loading: false,
  hasPermission: () => true,
  hasAnyPermission: () => true,
  isRole: () => true,
  signOut: async () => {},
});

export const useAuth = () => React.useContext(MockAuthContext);

// ============================================
// Mock Auth Provider
// ============================================

interface MockAuthProviderProps {
  children: ReactNode;
  user?: MockUser | null;
  permissions?: string[];
  roles?: string[];
}

export const MockAuthProvider: React.FC<MockAuthProviderProps> = ({ 
  children, 
  user = defaultMockUser,
  permissions = [],
  roles = [],
}) => {
  const mockAuthValue: MockAuthValue = {
    user,
    loading: false,
    hasPermission: (permission: string) => 
      permissions.length === 0 || permissions.includes(permission),
    hasAnyPermission: (perms: string[]) => 
      permissions.length === 0 || perms.some(p => permissions.includes(p)),
    isRole: (role: string) => 
      roles.length === 0 || roles.includes(role) || user?.role === role,
    signOut: async () => {},
  };

  return (
    <MockAuthContext.Provider value={mockAuthValue}>
      {children}
    </MockAuthContext.Provider>
  );
};

// ============================================
// All Providers Wrapper
// ============================================

interface AllProvidersProps {
  children: ReactNode;
  options?: RenderWithProvidersOptions;
  queryClient: QueryClient;
}

const AllProviders: React.FC<AllProvidersProps> = ({ 
  children, 
  options = {},
  queryClient,
}) => {
  const { 
    user = defaultMockUser, 
    permissions = [], 
    roles = [],
    initialRoute = '/',
    theme = 'light',
    useMemoryRouter = false,
  } = options;

  const RouterComponent = useMemoryRouter ? MemoryRouter : BrowserRouter;
  const routerProps = useMemoryRouter ? { initialEntries: [initialRoute] } : {};

  return (
    <ThemeProvider attribute="class" defaultTheme={theme} enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <MockAuthProvider user={user} permissions={permissions} roles={roles}>
          <TooltipProvider>
            <RouterComponent {...routerProps}>
              {children}
            </RouterComponent>
            <Toaster />
          </TooltipProvider>
        </MockAuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

// ============================================
// Main Render Function
// ============================================

export function renderWithProviders(
  ui: ReactNode, 
  options: RenderWithProvidersOptions = {}
) {
  const queryClient = createTestQueryClient();
  
  const Wrapper: React.FC<{ children: ReactNode }> = ({ children }) => (
    <AllProviders options={options} queryClient={queryClient}>
      {children}
    </AllProviders>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    queryClient,
  };
}

// ============================================
// Specialized Render Functions
// ============================================

export function renderWithAuth(
  ui: ReactNode,
  user: MockUser = defaultMockUser,
  options: Omit<RenderWithProvidersOptions, 'user'> = {}
) {
  return renderWithProviders(ui, { ...options, user });
}

export function renderAsAdmin(
  ui: ReactNode,
  options: Omit<RenderWithProvidersOptions, 'user' | 'roles'> = {}
) {
  return renderWithProviders(ui, { 
    ...options, 
    user: createMockUser({ role: 'admin', role_name_text: 'Admin' }),
    roles: ['admin'],
  });
}

export function renderAsStaff(
  ui: ReactNode,
  options: Omit<RenderWithProvidersOptions, 'user' | 'roles'> = {}
) {
  return renderWithProviders(ui, { 
    ...options, 
    user: createMockUser({ role: 'staff', role_name_text: 'Staff' }),
    roles: ['staff'],
  });
}

export function renderUnauthenticated(
  ui: ReactNode,
  options: Omit<RenderWithProvidersOptions, 'user'> = {}
) {
  return renderWithProviders(ui, { ...options, user: null });
}

export function renderInDarkMode(
  ui: ReactNode,
  options: Omit<RenderWithProvidersOptions, 'theme'> = {}
) {
  return renderWithProviders(ui, { ...options, theme: 'dark' });
}

// ============================================
// Re-exports for convenience
// ============================================

export * from '@testing-library/react';
