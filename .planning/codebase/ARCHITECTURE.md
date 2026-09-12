# Architecture

**Analysis Date:** 2026-09-12

## Pattern Overview

**Overall:** Modular Multi-Tenant Single-Page Application (SPA) with Progressive Web App (PWA) capabilities and Hybrid Native Android Bridge (Capacitor), built on a Serverless Backend-as-a-Service (BaaS) architecture using Supabase (PostgreSQL + PostgREST + Realtime + Edge Functions).

**Key Characteristics:**
- **Hybrid Multi-Tenancy:** Dual-tier tenancy supporting single independent restaurants and complex multi-branch franchise organizations (`organizations` -> `restaurants`) while keeping `restaurant_id` as the primary tenant key across 126+ database tables.
- **Three-Tier Gating Architecture:** Strict sequential access pipeline: `SubscriptionGate` (organization/restaurant subscription status) -> `PermissionGuard` (staff role permissions) -> `FeatureLock` (granular feature flags).
- **Reactive Realtime Synchronisation:** PostgreSQL database changes propagate instantly over Supabase Realtime WebSockets directly into TanStack React Query cache, driving live order updates for POS, Kitchen Display Systems (KDS), and customer tracking without polling.
- **Offline-First Resilience:** Client-side IndexedDB caching via `idb` allows critical POS order creation and menu lookups to continue uninterrupted during Internet dropouts, synchronizing when connectivity is restored.

## Layers

**1. Presentation & Routing Layer:**
- **Purpose:** Renders interactive UI components, manages page transitions, enforces route-level access controls, and provides responsive mobile layouts.
- **Contains:** React components (`src/pages/*`, `src/components/*`), UI primitives (`src/components/ui/*`), and routing definitions (`src/components/Auth/Routes.tsx`, `src/components/Auth/AppRoutes.tsx`).
- **Depends on:** State management contexts, custom domain hooks, and utility formatters.
- **Used by:** Restaurant staff, managers, franchise administrators, and dining customers.

**2. Context & Domain Hook Layer:**
- **Purpose:** Encapsulates stateful business logic, reactive subscriptions, device integrations, and data querying abstractions into reusable hooks.
- **Contains:** Global Context providers (`src/contexts/AccessContext.tsx`, `src/contexts/FranchiseContext.tsx`, `src/contexts/CurrencyContext.tsx`, `src/contexts/NetworkStatusContext.tsx`, `src/contexts/BrandingContext.tsx`) and domain hooks (`src/hooks/useOrders.tsx`, `src/hooks/usePOS.tsx`, `src/hooks/useKitchen.tsx`, `src/hooks/useFeatureGate.ts`, `src/hooks/useOfflineCache.ts`).
- **Depends on:** TanStack React Query, Supabase client SDK, Capacitor native plugins, and local storage/IndexedDB.
- **Used by:** Presentation layer components.

**3. Data Access & Client API Layer:**
- **Purpose:** Handles low-level network communication, authentication token injection, ISP proxy routing, and schema type mapping.
- **Contains:** Central Supabase client (`src/integrations/supabase/client.ts`), auto-generated TypeScript database types (`src/integrations/supabase/types.ts`), and HTTP Edge Function invocation wrappers.
- **Depends on:** `@supabase/supabase-js`, browser `fetch`, and WebSocket client.
- **Used by:** Custom hooks and background sync workers.

**4. Backend & Database Layer (Supabase BaaS):**
- **Purpose:** Persists relational data, enforces multi-tenant row isolation via RLS, executes atomic business transactions, and triggers asynchronous jobs.
- **Contains:** 126+ relational PostgreSQL tables, stored procedures, triggers, RLS policies (`supabase/migrations/*.sql`), and 46 serverless Deno Edge Functions (`supabase/functions/*`).
- **Depends on:** Supabase infrastructure, PostgreSQL 15, and external third-party APIs (Razorpay, Paytm, Meta WhatsApp, Gemini AI).
- **Used by:** Supabase client SDK and external webhooks.

## Data Flow

**1. Standard User Mutation (e.g., Order Creation in POS):**
1. **User Action:** Waiter or cashier adds items to order and clicks "Place Order" in `src/components/Orders/POS/POSMode.tsx` or `src/components/QuickServe/QuickServePOS.tsx`.
2. **Hook Execution:** Component invokes mutation method from `useOrders` or `usePOS`.
3. **Calculation & Validation:** `src/utils/orderCalculations.ts` calculates subtotal, taxes (CGST/SGST), discounts, and final amount. Zod schemas validate the payload structure.
4. **Optimistic Local Cache:** If offline, `src/hooks/useOfflineCache.ts` writes the order to IndexedDB (`idb`). If online, TanStack React Query executes an optimistic cache update.
5. **Database Transaction:** Order is inserted into `orders_unified` (or `orders`) via Supabase client. Database trigger verifies `restaurant_id` against active session profile via RLS.
6. **Realtime Broadcast:** PostgreSQL replication triggers Supabase Realtime broadcast on `table_db_changes`.
7. **Reactive Subscriber:** Kitchen Display (`src/components/Kitchen/KitchenDisplay.tsx`) receives the WebSocket event, plays an audio chime (`src/utils/soundEffects.ts`), and re-renders the kitchen queue.

**2. Franchise Cross-Branch Aggregation Flow:**
1. **Branch Selection:** Franchise owner selects target branch or "All Branches" in the Franchise navigation header (`src/components/Franchise/FranchiseHeader.tsx`).
2. **Context Update:** `FranchiseContext` updates active branch state and stores context in `sessionStorage`.
3. **Security Function Call:** Queries invoke PostgreSQL security definer helper `get_user_accessible_restaurants()` to retrieve all authorized branch IDs under the user's organization.
4. **Consolidated Query:** Data hooks (`useFranchiseOrders`, `useFranchiseInventory`, `useCrossBranchPnL`) execute parameterized queries with `.in('restaurant_id', accessibleBranchIds)`.
5. **UI Aggregation:** Consolidated dashboards (`src/pages/Franchise/CrossBranchPnL.tsx`) aggregate branch totals with comparison metrics.

**3. Three-Tier Access Control Flow:**
1. **Subscription Check (`SubscriptionGate.tsx`):** Verifies that the tenant has an active plan in `restaurant_subscriptions` or `organization_subscriptions`. If expired or unpaid, redirects to `/subscription`.
2. **Permission Check (`PermissionGuard.tsx`):** Queries `staff_roles` and `role_components` for the authenticated user to verify route authorization (e.g. `orders.view`, `kitchen.view`, `users.manage`). If unauthorized, displays access denied dialog.
3. **Granular Feature Check (`FeatureLock.tsx` / `useFeatureGate.ts`):** Evaluates `featureRegistry.ts` flags against active plan entitlements (e.g. `ai.assistant`, `franchise.menu_sync`, `crm.loyalty`). If locked, renders an upgrade banner or disables the button.

## Key Abstractions

**1. Unified Access & Feature Gating:**
- **Files:** `src/hooks/useAccessControl.tsx`, `src/hooks/useFeatureGate.ts`, `src/constants/featureRegistry.ts`, `src/utils/featureComponentMapping.ts`.
- **Pattern:** Declarative permission and feature evaluation. 112 granular feature keys categorized across 22 operational domains mapped dynamically to database component records.

**2. Unified Order Engine:**
- **Files:** `src/types/orders.ts`, `src/utils/orderCalculations.ts`, `src/utils/billCalculation.ts`, `src/hooks/useHeldOrders.ts`.
- **Pattern:** Strategy / Shared Calculation Engine ensuring 100% mathematical parity across Table POS, QSR POS, QuickServe POS, and Customer QR Ordering.

**3. Realtime Subscription Hub:**
- **Files:** `src/hooks/useRealtimeSubscription.tsx`, `src/hooks/useRealtimeAnalytics.tsx`.
- **Pattern:** Observer / Pub-Sub pattern managing channel lifecycles, debounced invalidations, and automatic reconnection handling across browser and native platforms.

**4. Franchise Organization Manager:**
- **Files:** `src/contexts/FranchiseContext.tsx`, `src/hooks/useRestaurantId.tsx`.
- **Pattern:** Multi-tenant context scoping that transparently provides either single-restaurant isolation or multi-branch organization views.

## Entry Points

**1. Web Application Entry:**
- **Location:** `src/main.tsx` -> `src/App.tsx`.
- **Triggers:** Browser page load at root domain.
- **Responsibilities:** Initializes React 18 root, instantiates QueryClient, registers Service Worker, establishes network listeners, mounts global context providers, and renders the router (`src/components/Auth/Routes.tsx`).

**2. Native Mobile Application Entry:**
- **Location:** `android/app/src/main/java/.../MainActivity.java` -> Capacitor WebView -> `src/main.tsx`.
- **Triggers:** Android app launcher icon click or push notification tap.
- **Responsibilities:** Initializes Capacitor hardware plugins (biometrics, push notifications, Bluetooth), attaches `appStateChange` listeners to synchronize React Query focus manager, and sets up OAuth deep-link listeners.

**3. Serverless Edge Functions:**
- **Location:** `supabase/functions/*/index.ts`.
- **Triggers:** Inbound HTTP webhook (Paytm, Meta WhatsApp, Razorpay), client RPC requests, or Supabase cron triggers (`pg_cron`).
- **Responsibilities:** Performs privileged administrative tasks, third-party payment signature validations, AI completions, and PDF/Email dispatches using elevated service-role permissions.

## Error Handling

**Strategy:** Multi-tiered defense combining React component error boundaries, asynchronous mutation try-catch wrappers, optimistic query rollback, and user-friendly toast notifications.

**Patterns:**
- **Component Render Failures:** Handled by `src/components/ui/error-boundary.tsx` rendering a fall-back card with page reload and error report options.
- **API & Network Errors:** Handled in custom hooks via `react-query` `onError` callbacks and Sonner / Radix `useToast()` alerts (`src/hooks/use-toast.ts`).
- **Offline Fallback:** If network mutation fails and device is offline (`useNetworkStatus`), changes are queued in IndexedDB for subsequent background replay.
- **Database Violations:** PostgreSQL RLS policy rejections return standard PostgREST error codes (42501, PGRST301) surfaced to the client as specific access denial messages.

## Cross-Cutting Concerns

**Logging & Audit:**
- Comprehensive audit trail table `audit_logs` tracking sensitive administrative interventions (role alterations, price overrides, non-chargeable orders).
- Production build strips debug logs (`console.log`, `console.info`, `console.debug`) automatically via Vite `esbuild.pure` configuration (`vite.config.ts`).

**Validation:**
- Runtime input validation powered by Zod (`zod`) schemas on both client forms (`react-hook-form` with `@hookform/resolvers/zod`) and database check constraints.

**Authentication & Session Management:**
- Persistent JWT session tokens stored in browser `localStorage`.
- Direct Supabase authentication routing configured to prevent Indian ISP DNS blocking from disrupting sign-in and OAuth handshakes.

---

*Architecture analysis: 2026-09-12*
*Update after major architectural changes*
