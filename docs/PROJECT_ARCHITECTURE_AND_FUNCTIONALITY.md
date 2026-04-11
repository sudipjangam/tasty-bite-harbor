# Tasty Bite Harbor - Project Architecture and Functionality

Last updated: 2026-04-11

## 1. Product Summary

This project is a large, multi-module restaurant operations platform with optional hotel-style room and housekeeping capabilities.

It supports:
- Restaurant operations: POS, orders, kitchen, menu, tables, inventory
- Guest operations: table reservations, room reservations, room billing, housekeeping
- Management: staff, users/roles/permissions, CRM, marketing
- Business intelligence: dashboards, analytics, reports, finance, expenses
- Platform admin: restaurant onboarding, subscription plans, feature entitlement management
- Public experiences: landing website, public bill/invoice, customer ordering, enrollment pages

## 2. Core Tech Stack

- Frontend: React 18 + TypeScript + Vite
- UI: Tailwind + Radix + shadcn components
- Data/state: Supabase JS + TanStack Query
- Backend: Supabase Postgres + Auth + RLS + Edge Functions
- Realtime: Supabase Realtime channels + query invalidation
- Offline/PWA: service worker + IndexedDB write queue/cache
- Testing: Vitest + React Testing Library

## 3. Runtime Composition

Main app composition is in `src/App.tsx`.

Global providers initialized:
- `QueryClientProvider`
- `ThemeProvider`
- `TooltipProvider`
- `AuthProvider`
- `AccessProvider`
- `CurrencyProvider`
- `NetworkStatusProvider`
- `ErrorBoundary`
- `BrowserRouter`

Global background behaviors:
- Realtime analytics subscriptions via `useRealtimeAnalytics`
- Offline data pre-cache via `useOfflineCache`
- Service worker registration and update notifications
- Global toast and notification listeners

## 4. Routing and Navigation Model

Routing entry is `src/components/Auth/Routes.tsx`.

### 4.1 Public (unauthenticated) routes

- `/` landing website
- `/auth`, `/login`, `/auth/callback`
- `/enroll/:slug`, `/privacy`, `/delete-account`
- `/order/:encodedData`, `/bill/:encodedData`, `/truck/:slug`
- `/invoice/*`

### 4.2 Authenticated routes

- Users are redirected to `/dashboard` and dashboard routes are rendered by `AppRoutes`.
- `SubscriptionGate` is applied to dashboard routes (except select admin/system bypass paths).
- `/subscription` is standalone and outside sidebar layout.

### 4.3 Authenticated app routes (`AppRoutes`)

Primary routes include:
- Dashboard: `/`
- Operations: `/orders`, `/pos`, `/qsr-pos`, `/quickserve-pos`, `/kitchen`, `/menu`, `/recipes`
- Guest services: `/tables`, `/rooms`, `/reservations`, `/housekeeping`
- Management: `/staff`, `/customers`, `/marketing`, `/user-management`, `/role-management`, `/permission-management`
- Intelligence/finance: `/analytics`, `/reports`, `/financial`, `/expenses`, `/channel-management`, `/nc-orders`
- System: `/security`, `/settings`, `/admin`, `/daily-summary-history`
- Platform: `/platform/*` (admin role guarded)

Navigation UX is driven by `src/components/Layout/ImprovedSidebarNavigation.tsx`.

## 5. Access Control Model

Access control is layered, not single-point.

### 5.1 Authentication + profile permissions

`useAuth`:
- Loads profile from `profiles`
- Loads user components via RPC `get_user_components`
- Loads permissions via RPC `get_user_permissions`
- Denies access when DB permissions are not loaded (secure-by-default behavior)
- Supports full-access roles via `role_has_full_access`

### 5.2 Route-level permission and subscription checks

`PermissionGuard` enforces:
- Permission checks (e.g. `orders.view`, `financial.view`)
- Optional role checks
- Subscription component checks by route mapping (for non-system routes)

### 5.3 Subscription gate

`SubscriptionGate`:
- Reads latest `restaurant_subscriptions` record
- Validates `status = active` and `current_period_end > now`
- Redirects expired subscriptions to `/subscription`
- Allows bypass for specific admin system routes

### 5.4 Feature-level paywall

`FeatureLock` + `useFeatureGate`:
- Performs granular feature-key checks (dot notation)
- Supports wildcard matching (e.g. `reports.*`)
- Leaves locked UI visible but intercepts interactions and shows upgrade messaging

## 6. Functional Domains

## 6.1 Operations Domain

### POS / QSR / QuickServe
- POS shell: `src/pages/POS.tsx`
- Core orchestration: `src/components/Orders/POS/POSMode.tsx`
- Features:
  - Category/menu item selection
  - Weighted item pricing flow
  - Custom extras
  - Hold/recall orders
  - Duplicate order detection (local hash + recent kitchen order checks)
  - Send-to-kitchen and order record linking
  - Payment flows

### Orders
- Page: `src/pages/Orders.tsx`
- Main list and lifecycle managed in `OrdersView`
- Flow: create -> pending -> kitchen prep -> completion
- Includes non-chargeable order support (`/nc-orders`)

### Kitchen
- Kitchen Display System view with live status updates
- Realtime subscriptions invalidate kitchen/order queries

### Menu and Recipes
- Menu CRUD, categories, availability toggles
- Recipe management and cost-oriented modules

## 6.2 Inventory Domain

Page: `src/pages/Inventory.tsx`

Capabilities:
- Inventory item CRUD by restaurant
- Low-stock detection and notifications (Edge Function `check-low-stock`)
- Purchase orders, suggestions, stocktake, transactions, lots, forecasting
- Storage location support
- Bill upload + extracted data workflows
- Duplicate item protection with "add as new batch/lot"
- Rich KPI and tabbed submodules
- Realtime inventory sync via `useRealtimeSubscription`

## 6.3 Guest Services Domain

### Reservations (table + room)
- Unified page: `src/pages/Reservations.tsx`
- Hook: `useReservations`
- Supports both `table_reservations` and `reservations` tables
- Includes waitlist, availability heatmap, communication tabs

### Rooms and Housekeeping
- Page: `src/pages/Rooms.tsx`
- Hook: `useRooms`
- Includes occupancy chart, room CRUD, check-in/out lifecycle, promotions, QR, billing history
- Housekeeping and maintenance modules are separate feature sets under rooms/housekeeping domains

## 6.4 Management Domain

### Staff
- Staff dashboard, shifts, attendance, clock-in/out
- Auto clock out and missed clock checks via edge function flows

### Customers and CRM
- Customer profiles, loyalty models, segmentation
- CRM views and realtime customer modules

### Marketing
- Campaigns, templates, analytics
- WhatsApp campaign support including template state sync

### User/Role/Permission Management
- User creation/edit, role management, permission management UI
- Backed by role and user management edge functions + component permissions

## 6.5 Intelligence and Finance Domain

- Dashboard (`Index`) includes KPI cards, trends, revenue/category charts, staff self-service blocks
- Analytics and reporting modules include export-oriented workflows
- Financial page includes budgets, cash flow, invoicing, GST submodules
- Expenses module supports tracking and analytics

## 6.6 AI Assistant Domain

Edge function `chat-with-gemini`:
- Enforces rate limiting
- Validates auth token
- Resolves user restaurant via profile
- Pulls broad restaurant dataset
- Builds context-rich system prompt
- Supports:
  - chat Q&A on actual restaurant data
  - sales forecast mode
  - inventory recommendation mode

## 6.7 Platform Admin Domain

Platform routes under `/platform/*`:
- Dashboard
- Restaurant management
- Subscription manager
- Feature permissions
- All users
- Platform analytics
- Template approvals

Platform tools include:
- Restaurant onboarding (business/legal/owner/bank details)
- Subscription assignment and lifecycle updates
- Plan creation with granular component/features arrays
- User management across restaurants

## 7. Data and Query Patterns

Common data flow pattern:
1. Resolve current user
2. Resolve `restaurant_id` from `profiles`
3. Query feature tables filtered by `restaurant_id`
4. Mutate with optimistic updates where needed
5. Invalidate query cache and refresh UI

Query orchestration is done through TanStack Query and custom hooks.

Reusable examples:
- `useRestaurantId`
- `useRealtimeSubscription`
- `useSubscriptionAccess`
- Domain hooks per feature area (`useReservations`, `useRooms`, `useQSRMenuItems`, etc.)

## 8. Offline and PWA Strategy

### 8.1 IndexedDB cache and queue

`offlineDB.ts` defines:
- Read caches: restaurants, menuItems, categories, tables
- Write queue (`writeQueue`)
- Conflict logs (`conflictLog`)

`syncManager.ts` handles:
- Offline enqueue for writes
- Replay on reconnect
- Last-write-wins conflict behavior with logging

### 8.2 Service worker

`public/sw.js`:
- Caches shell assets
- Cleans old caches on activate
- Uses network-first with cache fallback for same-origin GETs
- Supports background sync tag (`sync-orders`)
- Handles push notifications

`serviceWorkerUtils.ts`:
- Registers SW
- Detects updates
- Supports immediate activation flow

## 9. Payment and Subscription Flows

### Razorpay

- Order creation: `create-razorpay-order`
- Signature verification + activation: `verify-razorpay-payment`
- Subscription updated in `restaurant_subscriptions`
- Confirmation notification call after successful activation

### Paytm

- QR/payment tracking function set exists
- `usePaymentStatus` uses realtime + polling fallback for robust state confirmation

## 10. Messaging and Notifications

Channels supported:
- Email (`send-email`, `send-email-bill`, inquiry and confirmation functions)
- WhatsApp via Twilio and cloud variants (`send-whatsapp*`, webhook handlers)
- Reservation confirmations/reminders
- Owner notifications and in-app notification listeners

## 11. Database Surface

The typed schema in `src/integrations/supabase/types.ts` defines a large multi-domain model, including:
- Core identity/config: profiles, roles, user_roles, restaurants, settings
- Commerce: orders, kitchen_orders, pos_transactions, payments
- Inventory: inventory_items, lots/transactions/alerts, purchase orders
- Guest/lodging: rooms, room_billings, room_food_orders, reservations, waitlist
- CRM/marketing: customers, loyalty tables, campaign/sent tables
- Finance: budgets, expenses, invoices, journals, tax configs
- Platform/security: audit logs, component permissions, subscription plans, restaurant_subscriptions

## 12. Edge Function Surface

There are 46 edge function directories under `supabase/functions`.

Major categories:
- AI: `chat-with-gemini`
- Payments: Razorpay + Paytm order/verify/webhook/refund/status flows
- Operations: low stock checks, inventory deductions, clock/attendance checks
- Messaging: WhatsApp/email/reservation/subscription communication functions
- Access and admin: role/user/component functions
- Upload and utility: image/bill extraction/drive upload/backup/sync functions

See `docs/CODEBASE_CATALOG.md` for complete enumerations.

## 13. Testing

Testing stack:
- Vitest + React Testing Library
- JSDOM test environment
- Setup file includes browser API mocks for matchMedia, ResizeObserver, IntersectionObserver

Current test organization includes:
- Page tests
- Integration tests
- Component-level tests (QSR/QuickServe groups)
- Utility and granular tests

## 14. Deployment and Environment

### Local and build
- Scripts from `package.json`: `dev`, `build`, `test`, `lint`, `preview`

### Netlify and Vercel
- Both configs proxy `/api/supabase/*` to Supabase domain
- SPA fallback rewrites to `index.html`
- Production cache headers configured for SW/version/manifest/assets

### Environment variables

Key variables from `.env.example`:
- `VITE_SUPABASE_URL` (default proxy path `/api/supabase`)
- `VITE_SUPABASE_ANON_KEY`
- Optional keys for Gemini, Twilio, image upload, Google Drive backup

## 15. High-Level Maintenance Notes

- This codebase is highly modular but broad; ownership by domain is recommended.
- Permission/subscription logic exists in multiple layers by design; avoid bypassing a single layer during refactors.
- Realtime + offline behavior means writes can be async/deferred; test mutation side effects with reconnect scenarios.
- Platform/subscription updates directly influence UI capability; keep plan/component registry synchronized with runtime checks.

