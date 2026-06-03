# Tasty Bite Harbor — Project Architecture & Functionality

> **Last updated:** 2026-06-04  
> **Project:** Swadeshi Solutions Restaurant Management System (RMS)  
> **Status:** Production-ready. Multi-tenant, franchise-capable.

---

## 1. Product Summary

Full-stack multi-module restaurant operations platform with optional hotel/room and franchise capabilities.

| Domain | Capability |
|---|---|
| Restaurant Operations | POS (3 modes), orders, kitchen KDS, menu, tables, inventory |
| Guest Services | Table reservations, room reservations, billing, housekeeping |
| Management | Staff, HR, users/roles/permissions, CRM, marketing |
| Business Intelligence | Dashboard, analytics, reports (5 tabs), finance, expenses |
| Platform Admin | Restaurant onboarding, subscription plans, feature entitlement |
| Public Experiences | Landing, public bill/invoice, QR ordering, loyalty enrollment |
| Franchise | Multi-branch orgs, cross-branch dashboards, menu sync |

---

## 2. Core Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| UI | shadcn/ui + Radix primitives + Tailwind CSS |
| Routing | react-router-dom v6 (lazy-loaded, Suspense code-split) |
| State | TanStack Query v5 + React Context API |
| Backend | Supabase (Postgres + Auth + Realtime + Edge Functions + Storage) |
| Edge Functions | Deno — 46 deployed functions |
| Payments | Razorpay + Paytm QR |
| Messaging | MSG91 (WhatsApp) + Resend (Email) + Twilio |
| AI | Google Gemini API |
| Hosting | Netlify (frontend) |

**Supabase project:** `bpheiklhiwwcrugmxivp` · Region: `ap-south-1`  
Tables: 126+ · RLS policies: ~250 · DB functions: 56 · Edge functions: 46

---

## 3. Runtime Composition (`src/App.tsx`)

### Provider Stack (outer → inner)
```
QueryClientProvider
  └─ ThemeProvider
       └─ TooltipProvider
            └─ AuthProvider
                 └─ AccessProvider
                      └─ CurrencyProvider
                           └─ NetworkStatusProvider
                                └─ ErrorBoundary
                                     └─ BrowserRouter
                                          └─ AppWithRealtime
```

### Background behaviors on mount
- `useRealtimeAnalytics()` — live analytics subscriptions
- `useOfflineCache()` — pre-cache critical data to IndexedDB
- `registerServiceWorker()` — SW registration + update detection
- Global toast + notification listeners

---

## 4. Routing Model (`src/components/Auth/AppRoutes.tsx`)

### 4.1 Public routes (no auth)
| Route | Purpose |
|---|---|
| `/` | Landing website |
| `/auth`, `/auth/callback` | Auth pages |
| `/bill/:shortId` | Shared public bill viewer |
| `/order/:slug` | QR customer ordering |
| `/enroll/:slug` | Loyalty enrollment |
| `/truck/:slug` | Food truck public page |
| `/invoice/*` | Invoice viewer |
| `/privacy`, `/delete-account` | Legal |

### 4.2 Authenticated app routes
All authenticated routes use `<LazyRoute>` (Suspense) + `<PermissionGuard>` and are wrapped by `SubscriptionGate`.

#### Operations
| Route | Page | Permission |
|---|---|---|
| `/` | `Index.tsx` | `dashboard.view` |
| `/orders` | `Orders.tsx` | `orders.view` |
| `/pos` | `POS.tsx` | `orders.view` |
| `/qsr-pos` | `QSRPos.tsx` | `orders.view` |
| `/quickserve-pos` | `QuickServePOS.tsx` | `orders.view` |
| `/kitchen` | `Kitchen.tsx` | `kitchen.view` |
| `/nc-orders` | `NCOrders.tsx` | — (FeatureLock: `orders.nc_orders`) |
| `/menu` | `Menu.tsx` | `menu.view` |
| `/recipes` | `RecipeManagement.tsx` | `menu.view` |
| `/tables` | `Tables.tsx` | `tables.view` |
| `/inventory` | `Inventory.tsx` | `inventory.view` |
| `/suppliers` | `Suppliers.tsx` | `inventory.view` |

#### Guest Services
| Route | Page | Permission |
|---|---|---|
| `/rooms` | `Rooms.tsx` | `rooms.view` |
| `/reservations` | `Reservations.tsx` | `reservations.view` |
| `/housekeeping` | `Housekeeping.tsx` | `housekeeping.view` |

#### Management
| Route | Page | Permission |
|---|---|---|
| `/staff` | `Staff.tsx` | `staff.view` |
| `/shift-management` | `ShiftManagement.tsx` | `staff.update` |
| `/customers` | `Customers.tsx` | `customers.view` |
| `/marketing` | `Marketing.tsx` | `customers.view` |
| `/user-management` | `UserManagement.tsx` | `users.manage` |
| `/role-management` | `RoleManagement.tsx` | `users.manage` |
| `/permission-management` | `PermissionManagement.tsx` | `staff.manage_roles` |
| `/channel-management` | `ChannelManagement.tsx` | `analytics.view` |

#### Intelligence & Finance
| Route | Page | Permission |
|---|---|---|
| `/analytics` | `Analytics.tsx` | `analytics.view` |
| `/reports` | `Reports.tsx` | `analytics.view` |
| `/financial` | `Financial.tsx` | `financial.view` |
| `/expenses` | `Expenses.tsx` | `financial.view` |
| `/daily-summary-history` | `DailySummaryHistory.tsx` | — |

#### System
| Route | Page | Permission |
|---|---|---|
| `/ai` | `AI.tsx` | `dashboard.view` |
| `/security` | `Security.tsx` | `audit.view` |
| `/settings` | `Settings.tsx` | `settings.view` |
| `/admin` | `AdminPanel.tsx` | `users.manage` |
| `/platform/*` | Platform pages | admin role only |

### 4.3 Franchise routes (`/franchise/*`)
Only org owners/admins. Wrapped in `<FranchiseLayout>`.
- `/franchise` · `/franchise/branches` · `/franchise/team`
- `/franchise/menu-sync` · `/franchise/orders` · `/franchise/inventory`
- `/franchise/staff` · `/franchise/pnl` · `/franchise/settings`

### 4.4 Platform Admin routes (`/platform/*`)
Only `role='admin'` users.
- `/platform` · `/platform/restaurants` · `/platform/subscriptions`
- `/platform/feature-permissions` · `/platform/users` · `/platform/analytics`
- `/platform/templates` · `/platform/franchises` · `/platform/franchises/:id`

---

## 5. Access Control Model (4 Layers)

```
Layer 1: SubscriptionGate
  └─ Checks restaurant_subscriptions status=active + period validity
  └─ Redirects expired to /subscription

Layer 2: PermissionGuard (route-level)
  └─ Maps route → subscription component key
  └─ Checks useSubscriptionAccess(component)
  └─ Checks useAuth.hasPermission()
  └─ Falls back to StaffLandingPage or redirect

Layer 3: Component Permissions (app_components + role_components)
  └─ Maps roles → components → DB tables
  └─ Enforced via user_has_table_access() in RLS

Layer 4: FeatureLock (UI-level, inline)
  └─ Dot-notation feature keys (e.g. orders.nc_orders, reports.tabs.analytics)
  └─ Wildcard support (reports.*)
  └─ Locks UI but keeps visible; shows upgrade CTA on interaction
```

### Key permission strings
| Area | Permission Key |
|---|---|
| Orders | `orders.view`, `orders.nc_orders` |
| Reports tabs | `reports.tabs.analytics`, `reports.tabs.default`, `reports.tabs.custom_builder`, `reports.tabs.export_center` |
| NC Orders tab in Reports | `orders.nc_orders` |
| Staff | `staff.view`, `staff.update`, `staff.manage_roles` |
| Financial | `financial.view` |
| Analytics | `analytics.view` |

---

## 6. Functional Domains

### 6.1 Operations Domain

#### POS (3 modes)
- Full POS: `src/components/Orders/POS/POSMode.tsx` (36KB orchestrator)
- QSR POS: `src/components/QSR/`
- QuickServe: `src/components/QuickServe/`
- Shared payment: `src/components/Orders/POS/PaymentDialog.tsx` (152KB)
- Features: category/item selection, weighted pricing, custom extras, hold/recall, duplicate detection, send-to-kitchen, payment flows

#### Orders lifecycle
`pending → kitchen prep → ready → completed`
- Non-chargeable orders: `order_type = 'non-chargeable'`
- NC orders **excluded** from all revenue/financial calculations
- NC orders tracked at `/nc-orders` (standalone page) AND in `/reports` → NC Orders tab

#### Kitchen
- KDS with realtime Supabase subscriptions on `kitchen_orders`
- Status: `new → preparing → ready`

#### Menu & Recipes
- Menu items with variants, availability toggles, category grouping
- Recipe CRUD with ingredient-to-inventory cost linkage
- Franchise menu sync: master → inherited items via `origin` field

### 6.2 Inventory Domain

Page: `src/pages/Inventory.tsx`

- FIFO lot tracking
- Purchase orders with approval workflow
- Auto-deduction on kitchen prep (edge function: `deduct-inventory-on-prep`)
- Low stock alerts via `check-low-stock` edge function
- Supplier price history
- Bill upload + extraction (`extract-bill-details`)
- Duplicate item protection

### 6.3 Guest Services Domain

#### Reservations
- Unified: `src/pages/Reservations.tsx` + `useReservations` hook
- Both `table_reservations` and `reservations` (room) tables
- Waitlist, availability heatmap, communication tabs

#### Rooms & Hotel
- Room lifecycle: `available → reserved → occupied → checkout`
- Room billing, split bills, guest profiles
- Housekeeping schedules, room moves, night audit
- Lost & found, guest preferences & loyalty

#### Channel Management (OTA)
- Booking channel integration, OTA credentials
- Channel inventory sync, rate plans, rate parity checks
- Competitor pricing monitoring

### 6.4 Management Domain

#### Staff & HR
- Attendance: clock-in/out via `record-clock-entry` edge function
- Auto clock-out: `auto-clock-out` edge function
- Shift management, leave requests/balances/types
- Staff documents, notifications

#### CRM & Customers
- Customer profiles, visit history, loyalty points/tiers
- QR-based enrollment (`enroll-customer` edge function)
- Tier auto-calculation, loyalty transactions/redemptions

#### Marketing
- WhatsApp campaigns (MSG91 + Cloud API)
- Template management with approval workflow
- Promotion campaigns with promo codes (`validate-promo-code`)
- Email communications (Resend via `send-email`)

### 6.5 Intelligence & Finance Domain

#### Reports Page (`src/pages/Reports.tsx`) — 5 Tabs
| Tab | Component | Feature Key |
|---|---|---|
| Advanced Analytics | `Reporting/AdvancedAnalytics.tsx` | `reports.tabs.analytics` |
| Default Reports | `Reporting/DefaultReports.tsx` | `reports.tabs.default` |
| Custom Builder | `Reporting/CustomReportBuilder.tsx` | `reports.tabs.custom_builder` |
| Export Center | `Reporting/ExportCenter.tsx` | `reports.tabs.export_center` |
| **NC Orders** ✨NEW | `Reporting/NCOrdersReport.tsx` | `orders.nc_orders` |

#### NCOrdersReport (glassmorphic, full-featured)
- Date presets: Today, Yesterday, This Week, Last 7, Last 30, This Month, This Year, Custom Range
- Unlimited date range (no 30-day cap)
- Search across customer name, reason, attendant
- Filter by NC reason (dynamic dropdown)
- Sortable columns: Customer, Reason, Date, Value (asc/desc)
- Pagination: 10 rows/page
- Progress bar reason breakdown
- Order detail dialog with item breakdown
- 3D glassmorphic UI with violet/pink/orange gradient design

#### Default Reports (11 categories)
orders, menu, inventory, customers, staff, suppliers, expenses, rooms, recipes, promotions, repeat_customers

Each report: summary KPI cards + chart + sortable/searchable/paginated table + PDF/Excel/PPTX export

#### Financial
- P&L, budgets, invoices (GST/CGST/SGST/IGST), expense tracking
- Double-entry accounting (chart of accounts, journal entries)
- Revenue metrics, daily summaries

### 6.6 AI Assistant
- Edge function: `chat-with-gemini`
- Rate limiting, auth validation, restaurant data context
- Modes: Q&A, sales forecast, inventory recommendations

### 6.7 Platform Admin
Routes under `/platform/*`:
- Restaurant onboarding wizard
- Subscription plan management (components[] array)
- Feature permission control
- User management across restaurants
- Franchise management

---

## 7. Multi-Tenancy & Franchise Model

```
Organization (franchise entity)
  ├── organization_members (users + accessible_branches[])
  ├── organization_subscriptions (plan_type, max_branches)
  └── restaurants[] (branches)
       ├── is_headquarters: boolean
       ├── branch_code: text (HQ, BR1, BR2...)
       └── All data tables FK to restaurant_id
```

### Data isolation
- `restaurant_id` on ALL data tables
- `organization_id` on restaurants + menu_items (for menu sync)
- `get_user_accessible_restaurants(user_id)` returns uuid[] of allowed branches
- RLS enforces branch scoping automatically

### useRestaurantId resolution
```
If org member → returns currentBranch.id (from OrganizationContext)
If single restaurant → returns profiles.restaurant_id
```

---

## 8. Data & Query Patterns

### Common data flow
1. `useRestaurantId()` → get `restaurantId`
2. Query tables filtered by `restaurant_id`
3. Mutate with optimistic updates
4. Invalidate TanStack Query cache
5. UI refetches and renders

### Query key conventions
```
["restaurant-info"]                     # Restaurant ID (staleTime: 30min)
["business-dashboard-data", rid]        # Dashboard
["analytics-data", rid]                 # Analytics
["financial-data", rid]                 # Financial
["profit-loss", rid, start, end]        # P&L
["report-orders", rid, start, end]      # Orders report
["report-menu", rid, start, end]        # Menu report
["subscription-components", rid]        # Feature gate
```

### Realtime subscriptions
| Subscriber | Tables |
|---|---|
| Dashboard | `orders`, `inventory_items`, `staff`, `promotion_campaigns`, `daily_revenue_stats` |
| Analytics | `orders`, `room_food_orders`, `kitchen_orders`, `daily_revenue_stats` |
| Feature gate | `subscription_plans` |
| Kitchen | `kitchen_orders` |

---

## 9. Non-Chargeable Order Rules

- DB filter: `.eq("order_type", "non-chargeable")`  
- **EXCLUDED** from: revenue totals, P&L, analytics, dashboard KPIs, all Default Reports  
- **INCLUDED** in: NC Orders page (`/nc-orders`), NC Orders tab in Reports  
- Value stored in: `discount_amount` field (original order value before 100% discount)  
- Percentage formula: `ncValue / (totalRevenue + ncValue) × 100`

---

## 10. Key Business Formulas

### Revenue
```
totalRevenue = Σ(orders.total) WHERE status='completed' AND order_type≠'non-chargeable'
avgOrderValue = totalRevenue / completedChargeableCount
ncPercentage = ncValue / (totalRevenue + ncValue) × 100
```

### Financial trends (MoM)
```
revenueGrowth = ((currentRevenue - prevRevenue) / prevRevenue) × 100
profitGrowth  = ((currentProfit - prevProfit) / |prevProfit|) × 100
currentProfit = currentRevenue - currentExpenseTotal
```

### Cost fallbacks (when no expense records)
```
utilitiesCost = totalOrderRevenue × 0.12
rentCost      = totalOrderRevenue × 0.10
otherCost     = totalOrderRevenue × 0.04
```

### Feature gate matching
```
Exact: 'pos' === 'pos'
Prefix: 'pos' matches 'pos.basic', 'pos.hold_orders'
Reverse: 'pos.basic' matches legacy 'pos'
Wildcard: 'reports.*'
```

---

## 11. Offline & PWA Strategy

### IndexedDB (`offlineDB.ts`)
- Read caches: restaurants, menuItems, categories, tables
- Write queue (`writeQueue`)
- Conflict logs (`conflictLog`)

### Sync manager (`syncManager.ts`)
- Offline enqueue → replay on reconnect
- Last-write-wins conflict resolution
- Logs conflicts for review

### Service Worker (`public/sw.js`)
- Caches shell assets on install
- Network-first + cache fallback for same-origin GETs
- Background sync tag: `sync-orders`
- Push notifications support

---

## 12. Payments & Subscription

### Razorpay flow
`create-razorpay-order` → Razorpay checkout → `verify-razorpay-payment` → activate `restaurant_subscriptions`

### Paytm
- `create-paytm-qr`, `check-paytm-status`, `paytm-webhook`
- `usePaymentStatus` uses realtime + polling fallback

### Subscription activation
- `restaurant_subscriptions.status = 'active'`
- `current_period_end > now()` validated by SubscriptionGate

---

## 13. Messaging & Notifications

| Channel | Edge Functions |
|---|---|
| Email | `send-email`, `send-email-bill`, `send-inquiry` |
| WhatsApp | `send-whatsapp`, `send-whatsapp-bill`, `send-whatsapp-cloud`, `send-msg91-whatsapp` |
| Reservations | `send-reservation-confirmation`, `send-reservation-reminder` |
| Subscriptions | `send-subscription-confirmation` |
| Webhooks | `whatsapp-webhook`, `paytm-webhook` |

---

## 14. Database Surface (126+ tables)

### Core identity
`profiles`, `roles`, `user_roles`, `restaurants`, `restaurant_settings`

### Commerce
`orders`, `kitchen_orders`, `pos_transactions`, `payments`, `payment_transactions`

### Inventory
`inventory_items`, `inventory_transactions`, `purchase_orders`, `purchase_order_items`, `suppliers`

### Guest/lodging
`rooms`, `room_billings`, `room_food_orders`, `reservations`, `table_reservations`, `waitlist`, `room_waitlist`

### CRM/marketing
`customers`, `loyalty_programs`, `loyalty_transactions`, `loyalty_redemptions`, `promotion_campaigns`, `whatsapp_templates`, `whatsapp_campaign_sends`

### Finance
`budgets`, `expenses`, `invoices`, `journal_entries`, `chart_of_accounts`, `tax_configurations`, `daily_revenue_stats`

### Platform
`audit_logs`, `component_permissions`, `subscription_plans`, `restaurant_subscriptions`, `app_components`

### Franchise
`organizations`, `organization_members`, `organization_subscriptions`

---

## 15. Edge Functions (46 total)

| Category | Functions |
|---|---|
| AI | `chat-with-gemini` |
| Payments | `create-razorpay-order`, `verify-razorpay-payment`, `process-razorpay-refund`, `create-paytm-qr`, `check-paytm-status`, `paytm-webhook`, `create-payment-qr` |
| Operations | `check-low-stock`, `deduct-inventory-on-prep`, `record-clock-entry`, `auto-clock-out`, `check-missed-clocks`, `submit-qr-order` |
| Messaging | `send-email`, `send-email-bill`, `send-inquiry`, `send-whatsapp`, `send-whatsapp-bill`, `send-whatsapp-cloud`, `send-msg91-whatsapp`, `send-reservation-confirmation`, `send-reservation-reminder`, `send-subscription-confirmation`, `whatsapp-webhook`, `create-msg91-template`, `sync-msg91-template-status` |
| Access/Admin | `get-user-components`, `role-management`, `user-management`, `migrate-roles-data` |
| Upload/Utility | `upload-image`, `freeimage-upload`, `google-drive-upload`, `extract-bill-details`, `generate-qr-code`, `backup-restore`, `sync-channels`, `validate-promo-code`, `log-promotion-usage`, `enroll-customer`, `find-active-reservation`, `customer-menu-api`, `forgot-password`, `reset-password` |
| Franchise | `invite-franchise-owner` |

---

## 16. Sidebar Navigation Structure

File: `src/components/Layout/ImprovedSidebarNavigation.tsx`

**Groups:**
- **Dashboard**: Overview (/)
- **Operations**: POS, Orders, QSR POS, QuickServe POS, Kitchen, Recipes, Menu, Tables, Inventory
- **Guest Services**: Rooms, Reservations, Housekeeping
- **Management**: Staff, Customers, Marketing, User & Access, Permission Management, Channel Management, Analytics, Financial, Reports, Expenses

**Standalone (bottom):** Platform Admin (admin only), AI Assistant, Security, Settings

> Note: NC Orders is NOT in sidebar (commented out). Access via `/reports` → NC Orders tab OR direct `/nc-orders` URL.

---

## 17. Deployment

### Build
```bash
npm run dev       # Vite dev server
npm run build     # Production bundle
npm run test      # Vitest
npm run lint      # ESLint
```

### Hosting (Netlify)
- SPA fallback: `/* → /index.html`
- Proxy: `/api/supabase/*` → Supabase project URL
- Cache headers for SW, version, manifest, assets

### Env vars
```
VITE_SUPABASE_URL       = /api/supabase (proxied)
VITE_SUPABASE_ANON_KEY  = <key>
VITE_GEMINI_API_KEY     = (optional, for AI)
```

---

## 18. Testing

- **Stack:** Vitest + React Testing Library + JSDOM
- **Mocks:** matchMedia, ResizeObserver, IntersectionObserver
- **Coverage:** Page tests, integration tests, component tests (QSR/QuickServe), utility tests

---

## 19. Key File Reference

| Purpose | Path |
|---|---|
| App entry | `src/App.tsx` |
| Routes | `src/components/Auth/AppRoutes.tsx` |
| Sidebar nav | `src/components/Layout/ImprovedSidebarNavigation.tsx` |
| Auth hook | `src/hooks/useAuth.tsx` |
| Restaurant ID | `src/hooks/useRestaurantId.tsx` |
| Feature gate | `src/hooks/useFeatureGate.ts` |
| Reports page | `src/pages/Reports.tsx` |
| NC Orders (standalone) | `src/pages/NCOrders.tsx` + `src/components/NC/NCOrdersReport.tsx` |
| NC Orders (reports tab) | `src/components/Reporting/NCOrdersReport.tsx` |
| Reports data hook | `src/hooks/useReportsData.tsx` |
| Supabase client | `src/integrations/supabase/client.ts` |
| Supabase types | `src/integrations/supabase/types.ts` |
| Org context | `src/contexts/OrganizationContext.tsx` |
| POS orchestrator | `src/components/Orders/POS/POSMode.tsx` |
| Payment dialog | `src/components/Orders/POS/PaymentDialog.tsx` |
