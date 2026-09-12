# Coding Conventions

**Analysis Date:** 2026-09-12

## Naming Patterns

**Files:**
- React Components: `PascalCase.tsx` (e.g., `POSMode.tsx`, `KitchenDisplay.tsx`, `ImprovedSidebarNavigation.tsx`).
- Custom Hooks: `camelCase.ts` or `camelCase.tsx` prefixed with `use` (e.g., `useOrders.tsx`, `useFeatureGate.ts`, `useRestaurantId.tsx`).
- Utilities & Helpers: `camelCase.ts` (e.g., `orderCalculations.ts`, `billCalculation.ts`, `platform.ts`).
- Type Declarations: `camelCase.ts` (e.g., `orders.ts`, `franchise.ts`, `supabase.ts`).
- Unit & Integration Tests: `*.test.ts` or `*.test.tsx` located in `src/tests/` (e.g., `billFormatter.test.ts`, `PageValidation.test.tsx`).

**Functions & Methods:**
- Functions & Methods: `camelCase` (e.g., `calculateBillTotals`, `handleOrderSubmit`, `formatCurrency`).
- Event Handlers: `handle*` or `on*` (e.g., `handlePaymentComplete`, `onTableSelect`, `handleStatusChange`).
- Boolean Checker Functions: `is*`, `has*`, or `can*` (e.g., `isNativeApp`, `hasPermission`, `canAccessFeature`).

**Variables & Constants:**
- Variables & State: `camelCase` (e.g., `activeOrderId`, `isLoading`, `totalAmount`).
- Global Constants & Enums: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_PAGE_SIZE`, `STORAGE_KEYS`, `SUPABASE_DIRECT_URL`).
- React State Setters: `set*` (e.g., `const [selectedCategory, setSelectedCategory] = useState(...)`).

**Types & Interfaces:**
- Interfaces & Type Aliases: `PascalCase` without `I` prefix (e.g., `OrderItem`, `TableOrder`, `FranchiseBranch`).
- Props Interfaces: Component name + `Props` (e.g., `POSModeProps`, `KitchenDisplayProps`).
- Database Row Types: Mirror Supabase table schema naming via generated `Database['public']['Tables']['orders']['Row']` or typed domain aliases.

## Code Style

**Formatting & Syntax:**
- TypeScript strict typing across all files (`tsconfig.json`). Explicit return types recommended on utility functions.
- Semicolons: Required at end of statements.
- Quotes: Double quotes for JSX attributes and string imports; template literals (`` `...` ``) for string interpolations.
- Class Names: Tailwind CSS utility classes organized cleanly using `cn()` helper (`clsx` + `tailwind-merge`) from `src/lib/utils.ts`.
- Component Styling: Favor Tailwind classes and CSS variables defined in `src/index.css` over ad-hoc inline styles.

**Linting:**
- Linter: ESLint 9.9.0 with flat configuration in `eslint.config.js`.
- Key Rules:
  - `@eslint/js` recommended rules.
  - `eslint-plugin-react-hooks` (`rules-of-hooks`, `exhaustive-deps`) to avoid stale closures.
  - `typescript-eslint` typechecking and unused variable detection.
- Run Command: `npm run lint`.

## Import Organization

**Order & Grouping:**
Imports are grouped logically with clean line separations:
1. React and third-party libraries (e.g., `react`, `react-router-dom`, `@tanstack/react-query`).
2. Native / Hardware plugins (e.g., `@capacitor/core`, `@aparajita/capacitor-biometric-auth`).
3. Internal Core / Context / Hook imports (e.g., `@/contexts/AccessContext`, `@/hooks/useAuth`).
4. Components & UI primitives (e.g., `@/components/ui/button`, `@/components/Orders/...`).
5. Utilities & Constants (e.g., `@/lib/utils`, `@/utils/orderCalculations`, `@/constants/featureRegistry`).
6. Type definitions (e.g., `import type { OrderItem } from '@/types/orders'`).

**Path Aliasing:**
- Use `@/*` alias for all imports referencing `src/*` (e.g., `@/components/ui/dialog`, `@/hooks/usePOS`).
- Avoid deep relative path traversal (e.g., use `@/utils/formatters` instead of `../../../utils/formatters`).

## Error Handling

**Patterns & Strategy:**
- **React Error Boundary:** Root and feature-level boundaries catch render faults gracefully without crashing the whole application (`src/components/ui/error-boundary.tsx`).
- **Asynchronous Hooks (React Query):** Handle errors via `useQuery` / `useMutation` error states and callbacks:
  ```typescript
  const { data, isError, error } = useQuery({
    queryKey: ['orders', restaurantId],
    queryFn: fetchOrders,
  });
  ```
- **User Feedback:** Display actionable alerts via toast notifications (`src/hooks/use-toast.ts` or `sonner`):
  ```typescript
  toast({
    title: "Order Failed",
    description: error.message || "Failed to create order. Please try again.",
    variant: "destructive",
  });
  ```
- **Edge Functions:** Always return structured JSON responses with explicit HTTP status codes:
  ```typescript
  return new Response(JSON.stringify({ error: err.message }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
  ```

## Logging

**Patterns & Policy:**
- Development: Informative console logging (`console.log`, `console.warn`) for debugging lifecycle hooks and network proxy actions.
- Production Bundles: Vite automatically strips `console.log`, `console.info`, and `console.debug` statements in production mode via `esbuild.pure` (`vite.config.ts`), ensuring no sensitive payload logs leak into user browser devtools.
- Critical Server Logging: Edge functions log operational warnings and audit records to Supabase function logs.

## Comments & Documentation

**Guidelines:**
- Document complex business algorithms (e.g., tax rounding parity, split-bill mathematics, night audit accruals) explaining *why* a specific sequence is enforced.
- Add clear JSDoc descriptions for exported utilities and custom hooks detailing parameter contracts.
- Mark temporary workarounds or technical debt with `// TODO:`, `// FIXME:`, or `// NOTE:` including brief rationale.

---

*Conventions analysis: 2026-09-12*
*Update after style guide changes*
