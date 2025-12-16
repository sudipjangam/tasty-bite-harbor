/**
 * Supabase Mock Utilities for Testing
 * Provides centralized mocking for Supabase client operations
 */

import { vi } from 'vitest';

// ============================================
// Types for Mock Configuration
// ============================================

export interface MockQueryResult<T = any> {
  data: T | null;
  error: Error | null;
  count?: number;
}

export interface MockAuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: {
    id: string;
    email: string;
    role?: string;
  };
}

// ============================================
// Chainable Query Builder Mock
// ============================================

export const createChainableQueryMock = <T>(resolvedData: MockQueryResult<T>) => {
  const chainable: any = {
    select: vi.fn(() => chainable),
    insert: vi.fn(() => chainable),
    update: vi.fn(() => chainable),
    delete: vi.fn(() => chainable),
    upsert: vi.fn(() => chainable),
    eq: vi.fn(() => chainable),
    neq: vi.fn(() => chainable),
    gt: vi.fn(() => chainable),
    gte: vi.fn(() => chainable),
    lt: vi.fn(() => chainable),
    lte: vi.fn(() => chainable),
    like: vi.fn(() => chainable),
    ilike: vi.fn(() => chainable),
    is: vi.fn(() => chainable),
    in: vi.fn(() => chainable),
    contains: vi.fn(() => chainable),
    containedBy: vi.fn(() => chainable),
    range: vi.fn(() => chainable),
    order: vi.fn(() => chainable),
    limit: vi.fn(() => chainable),
    offset: vi.fn(() => chainable),
    single: vi.fn(() => Promise.resolve(resolvedData)),
    maybeSingle: vi.fn(() => Promise.resolve(resolvedData)),
    then: vi.fn((resolve) => Promise.resolve(resolvedData).then(resolve)),
    // Make chainable thenable for async/await
    [Symbol.toStringTag]: 'Promise',
  };
  
  // Override then to make it actually return the data
  chainable.then = (onFulfilled?: any, onRejected?: any) => 
    Promise.resolve(resolvedData).then(onFulfilled, onRejected);
  chainable.catch = (onRejected?: any) => 
    Promise.resolve(resolvedData).catch(onRejected);
  chainable.finally = (onFinally?: any) => 
    Promise.resolve(resolvedData).finally(onFinally);
    
  return chainable;
};

// ============================================
// Table-Specific Mock Creators
// ============================================

export type TableMockConfig = {
  [tableName: string]: MockQueryResult<any>;
};

export const createFromMock = (tableConfigs: TableMockConfig) => {
  return vi.fn((tableName: string) => {
    const config = tableConfigs[tableName] || { data: null, error: null };
    return createChainableQueryMock(config);
  });
};

// ============================================
// Auth Mock Creators
// ============================================

export const createAuthMock = (options: {
  user?: { id: string; email: string; role?: string } | null;
  session?: MockAuthSession | null;
  signInError?: Error | null;
  signUpError?: Error | null;
} = {}) => {
  const { 
    user = { id: 'test-user-id', email: 'test@example.com' },
    session = user ? {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
      token_type: 'bearer',
      user,
    } : null,
    signInError = null,
    signUpError = null,
  } = options;

  return {
    getUser: vi.fn(() => Promise.resolve({ data: { user }, error: null })),
    getSession: vi.fn(() => Promise.resolve({ data: { session }, error: null })),
    signInWithPassword: vi.fn(() => Promise.resolve({
      data: signInError ? null : { user, session },
      error: signInError,
    })),
    signUp: vi.fn(() => Promise.resolve({
      data: signUpError ? null : { user, session },
      error: signUpError,
    })),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
    onAuthStateChange: vi.fn((callback) => {
      // Immediately call with current state
      if (session) {
        callback('SIGNED_IN', session);
      }
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      };
    }),
    resetPasswordForEmail: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    updateUser: vi.fn(() => Promise.resolve({ data: { user }, error: null })),
  };
};

// ============================================
// Realtime Mock Creators
// ============================================

export const createRealtimeMock = () => {
  const channelMock = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  };

  return {
    channel: vi.fn(() => channelMock),
    removeChannel: vi.fn(),
    removeAllChannels: vi.fn(),
  };
};

// ============================================
// Storage Mock Creators
// ============================================

export const createStorageMock = () => {
  return {
    from: vi.fn((bucket: string) => ({
      upload: vi.fn(() => Promise.resolve({ 
        data: { path: `${bucket}/test-file.jpg` }, 
        error: null 
      })),
      download: vi.fn(() => Promise.resolve({ 
        data: new Blob(), 
        error: null 
      })),
      getPublicUrl: vi.fn((path: string) => ({
        data: { publicUrl: `https://example.com/storage/${bucket}/${path}` },
      })),
      remove: vi.fn(() => Promise.resolve({ data: [], error: null })),
      list: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  };
};

// ============================================
// Functions Mock Creators
// ============================================

export const createFunctionsMock = (functionConfigs: { 
  [functionName: string]: { data?: any; error?: Error | null } 
} = {}) => {
  return {
    invoke: vi.fn((functionName: string, options?: any) => {
      const config = functionConfigs[functionName] || { data: null, error: null };
      return Promise.resolve(config);
    }),
  };
};

// ============================================
// Complete Supabase Client Mock
// ============================================

export interface SupabaseMockConfig {
  tables?: TableMockConfig;
  auth?: Parameters<typeof createAuthMock>[0];
  functions?: Parameters<typeof createFunctionsMock>[0];
}

export const createSupabaseMock = (config: SupabaseMockConfig = {}) => {
  return {
    from: createFromMock(config.tables || {}),
    auth: createAuthMock(config.auth),
    ...createRealtimeMock(),
    storage: createStorageMock(),
    functions: createFunctionsMock(config.functions),
  };
};

// ============================================
// Quick Mock Helpers
// ============================================

export const mockSuccessResponse = <T>(data: T): MockQueryResult<T> => ({
  data,
  error: null,
});

export const mockErrorResponse = (message: string): MockQueryResult<null> => ({
  data: null,
  error: new Error(message),
});

export const mockEmptyResponse = (): MockQueryResult<[]> => ({
  data: [],
  error: null,
});

// ============================================
// Vitest Mock Setup Helper
// ============================================

/**
 * Sets up the Supabase client mock for a test suite
 * Call this at the top of your test file
 * 
 * @example
 * ```ts
 * const mockSupabase = setupSupabaseMock({
 *   tables: {
 *     orders: mockSuccessResponse([createMockOrder()]),
 *     menu_items: mockSuccessResponse([createMockMenuItem()]),
 *   }
 * });
 * 
 * // In your test
 * expect(mockSupabase.from).toHaveBeenCalledWith('orders');
 * ```
 */
export const setupSupabaseMock = (config: SupabaseMockConfig = {}) => {
  const mockClient = createSupabaseMock(config);
  
  vi.mock('@/integrations/supabase/client', () => ({
    supabase: mockClient,
  }));
  
  return mockClient;
};

// ============================================
// Test Data Reset Utility
// ============================================

export const resetAllMocks = () => {
  vi.clearAllMocks();
};
