# Testing Patterns

**Analysis Date:** 2026-09-12

## Test Framework

**Runner & Environment:**
- **Runner:** Vitest 4.0.15 (`vitest`) configured directly in `vite.config.ts`.
- **Environment:** `jsdom` (JSDOM 27.3.0) simulating full browser DOM APIs.
- **Global Matchers:** `@testing-library/jest-dom` v6.9.1 loaded globally in `src/tests/setup.ts`.
- **UI Testing Utilities:** `@testing-library/react` v16.3.0.

**Run Commands:**
```bash
npm test                             # Run Vitest test runner in watch mode
npx vitest run                       # Run all test suites once (CI mode)
npx vitest run src/tests/App.test.tsx # Run a single test file
npm run test:coverage                # Run tests with V8 coverage report
```

## Test File Organization

**Location:**
All test suites are centralized under `src/tests/` to maintain clean separation from production components:
```
src/tests/
├── setup.ts                    # Global test environment mocks and matchers
├── App.test.tsx                # App shell mounting and provider verification
├── PageValidation.test.tsx     # Route resolution and access-gate validation
├── PaymentFlow.test.tsx        # Payment flow and transaction calculation tests
├── billFormatter.test.ts       # Receipt formatting and order math unit tests
├── components/                 # Isolated component render tests
├── granular/                   # Unit tests for domain calculations and utilities
├── integration/                # Multi-component workflow integration tests
├── pages/                      # Page-level integration tests
└── utils/                      # Helper unit tests
```

**Naming Conventions:**
- Unit & Utility tests: `*.test.ts` (e.g., `billFormatter.test.ts`).
- Component & Page tests: `*.test.tsx` (e.g., `App.test.tsx`, `PaymentFlow.test.tsx`).

## Test Environment Setup & Browser Mocks

**Setup File (`src/tests/setup.ts`):**
Because tests execute inside headless JSDOM, modern browser APIs used by responsive components are mocked globally before each suite runs:
- `window.matchMedia`: Mocked for responsive media query hooks (`use-mobile.tsx`, Tailwind breakpoints).
- `ResizeObserver`: Mocked for Radix UI dialogs, select dropdowns, and responsive panels.
- `IntersectionObserver`: Mocked for lazy-loaded imagery and infinite scroll lists.
- `window.scrollTo`: Mocked to prevent errors during page transitions.
- Automatic DOM cleanup: Invoked after each test via `afterEach(() => cleanup())`.

## Mocking Patterns

**1. Mocking Supabase Client (`@/integrations/supabase/client`):**
To prevent network requests and database writes during automated test runs:
```typescript
import { vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    })),
  },
}));
```

**2. Mocking Native Capacitor Plugins:**
Native device APIs are mocked to verify fallback and mobile behavior:
```typescript
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
  },
}));

vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    requestPermissions: vi.fn().mockResolvedValue({ receive: 'granted' }),
    register: vi.fn().mockResolvedValue(undefined),
  },
}));
```

## Test Structure Pattern

**Component Test Example:**
```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe('Component Test Suite', () => {
  it('renders expected content without crashing', () => {
    const queryClient = createTestQueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <MyComponent />
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });
});
```

## Quality Assurance & Verification Practices

- **Mathematical Parity Verification:** Unit tests in `billFormatter.test.ts` verify that split-bill calculations, discount applications, and tax percentages (CGST + SGST) produce identical rounded totals down to the cent/paise.
- **Route Access Protection Tests:** `PageValidation.test.tsx` validates that unauthenticated or unauthorized users are correctly redirected away from privileged paths (`/financial`, `/admin`, `/franchise`).
- **Continuous Validation:** Tests should be run with `npx vitest run` prior to creating release APKs or merging major feature branches into `main`.

---

*Testing analysis: 2026-09-12*
*Update after test framework changes*
