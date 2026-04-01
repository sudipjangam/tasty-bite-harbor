# Tasty Bite Harbor — Architecture Reference

> **Purpose**: Quick reference for AI agents to understand the full system architecture, navigate the codebase, and make informed changes.

## System Overview

**What**: Restaurant + Hotel Management SaaS Platform  
**Stack**: React 18 + TypeScript + Vite + Supabase + Tailwind CSS  
**Deployment**: Netlify (frontend) + Supabase (backend)  
**Auth**: Supabase Auth with RBAC (role-based access control)

---

## Directory Structure

```
src/
├── components/          # 50+ component directories (see Module Map below)
│   ├── Auth/            # Routes, PermissionGuard, AppRoutes (main router)
│   ├── Layout/          # Sidebar navigation, mobile nav
│   ├── ui/              # Shadcn UI primitives + custom UI components
│   └── [Feature]/       # Feature-specific components
├── pages/               # 45+ page components (lazy-loaded via AppRoutes)
├── hooks/               # 75+ custom hooks (data fetching, state, utilities)
├── contexts/            # React contexts (Access, Cart, Currency, NetworkStatus)
├── types/               # TypeScript type definitions
├── utils/               # Utility functions (formatting, export, validation)
├── integrations/
│   └── supabase/        # Supabase client + auto-generated types
├── lib/                 # Shared utilities (cn helper)
└── tests/               # Vitest + React Testing Library

supabase/
├── functions/           # 39+ Edge Functions (Deno)
│   ├── _shared/         # Shared utilities for edge functions
│   └── [function-name]/ # Individual edge function directories
└── migrations/          # Database migration files (READ-ONLY)
```

---

## Application Flow

### Boot Sequence
```
App.tsx
  → QueryClientProvider (React Query)
    → ThemeProvider (light/dark)
      → TooltipProvider
        → AuthProvider (Supabase Auth)
          → AccessProvider (RBAC permissions)
            → CurrencyProvider
              → NetworkStatusProvider (online/offline)
                → ErrorBoundary
                  → Router
                    → AppWithRealtime
                      → OfflineBanner
                      → NotificationListener
                      → OwnerNotificationListener
                      → Routes (src/components/Auth/Routes.tsx)
                      → Toaster
                      → UpdateNotification (PWA)
```

### Routing Architecture

**Public Routes** (no auth required):
| Path | Page | Purpose |
|------|------|---------|
| `/` | LandingWebsite | Marketing landing page |
| `/auth`, `/login` | Auth | Login/signup |
| `/order/:encodedData` | CustomerOrder | QR code ordering (customer-facing) |
| `/bill/:encodedData` | PublicBillPage | Shareable bill view |
| `/truck/:slug` | PublicTruckPage | Food truck public page |
| `/enroll/:slug` | PublicEnrollmentPage | Loyalty enrollment |
| `/privacy` | PrivacyPolicy | Privacy policy |

**Authenticated Routes** (all under `/dashboard/*` via `AppRoutes`):
| Path | Page | Permission | Module |
|------|------|------------|--------|
| `/` | Index | `dashboard.view` | Dashboard |
| `/orders` | Orders | `orders.view` | Operations |
| `/pos` | POS | `orders.view` | Operations |
| `/qsr-pos` | QSRPos | `orders.view` | Operations |
| `/quickserve-pos` | QuickServePOS | `orders.view` | Operations |
| `/kitchen` | Kitchen | `kitchen.view` | Operations |
| `/menu` | Menu | `menu.view` | Menu |
| `/recipes` | RecipeManagement | `menu.view` | Menu |
| `/tables` | Tables | `tables.view` | Restaurant |
| `/rooms` | Rooms | `rooms.view` | Hotel |
| `/housekeeping` | Housekeeping | `housekeeping.view` | Hotel |
| `/reservations` | Reservations | `reservations.view` | Bookings |
| `/inventory` | Inventory | `inventory.view` | Inventory |
| `/suppliers` | Suppliers | `inventory.view` | Inventory |
| `/staff` | Staff | `staff.view` | HR |
| `/shift-management` | ShiftManagement | `staff.update` | HR |
| `/customers` | Customers | `customers.view` | CRM |
| `/marketing` | Marketing | `customers.view` | CRM |
| `/analytics` | Analytics | `analytics.view` | Reports |
| `/financial` | Financial | `financial.view` | Finance |
| `/expenses` | Expenses | `financial.view` | Finance |
| `/reports` | Reports | `analytics.view` | Reports |
| `/nc-orders` | NCOrders | (none) | Finance |
| `/ai` | AI | `dashboard.view` | AI |
| `/settings` | Settings | `settings.view` | Admin |
| `/security` | Security | `audit.view` | Admin |
| `/user-management` | UserManagement | `users.manage` | Admin |
| `/role-management` | RoleManagement | `users.manage` | Admin |
| `/permission-management` | PermissionManagement | `staff.manage_roles` | Admin |
| `/channel-management` | ChannelManagement | `analytics.view` | Hotel |
| `/platform/*` | PlatformLayout | Admin role only | Platform |

---

## Module Map

### 1. POS Systems (3 variants)
- **POS** (`/pos`) — Table-based restaurant POS
- **QSR POS** (`/qsr-pos`) — Full QSR with kitchen display, `src/components/QSR/`
- **QuickServe POS** (`/quickserve-pos`) — Simplified counter POS, `src/components/QuickServe/`

### 2. Order Management
- **Components**: `src/components/Orders/`
- **Kitchen Display**: `src/components/Kitchen/`
- **NC Orders**: `src/components/NC/`
- **Item format**: `"2x Item Name @150"` — parsed with regex

### 3. Menu & Recipes
- **Menu**: `src/components/Menu/` — categories, items, modifiers, pricing types
- **Recipes**: `src/components/Recipes/` — batch production, cost tracking

### 4. Hotel Management
- **Rooms**: `src/components/Rooms/`
- **Housekeeping**: `src/components/Housekeeping/`
- **Night Audit**: `src/components/NightAudit/`
- **Revenue**: `src/components/Revenue/` — dynamic pricing, channel management
- **Guest Experience**: `src/components/GuestExperience/`, `src/components/Guests/`
- **Lost & Found**: `src/components/LostFound/`

### 5. Reservations & Tables
- **Tables**: `src/components/Tables/`
- **Reservations**: `src/components/Reservations/`

### 6. Inventory & Suppliers
- **Inventory**: `src/components/Inventory/`
- **Hooks**: `useInventory` related hooks

### 7. Financial
- **Financial**: `src/components/Financial/` — chart of accounts, journal entries, invoices, GST
- **Expenses**: `src/components/Expenses/`
- **Reports**: `src/components/Reports/`, `src/components/Reporting/`

### 8. CRM & Marketing
- **Customers**: `src/components/Customers/`, `src/components/CRM/`
- **Marketing**: `src/components/Marketing/` — WhatsApp campaigns
- **Promotions**: `src/components/Promotions/`
- **Loyalty**: via customer records + loyalty_programs table

### 9. Staff & HR
- **Staff**: `src/components/Staff/` — attendance, salary, shifts
- **Hooks**: `useCurrentStaff`, `useAutoClockOut`

### 10. AI & Analytics
- **AI Chat**: `src/components/AI/`, `src/components/Chatbot/`
- **Analytics**: `src/components/Analytics/`
- **Dashboard**: `src/components/Dashboard/`

### 11. QR Ordering (Customer-Facing)
- **Components**: `src/components/CustomerOrder/`, `src/components/QR/`
- **Context**: `src/contexts/CartContext.tsx`
- **Flow**: QR scan → decode → menu browse → cart → checkout → edge function

### 12. Platform Admin (Super Admin)
- **Pages**: `src/pages/Platform/`
- **Components**: `src/components/Platform/`
- **Features**: Multi-restaurant management, subscriptions, all users

---

## Key Hooks Reference

| Hook | Purpose |
|------|---------|
| `useAuth()` | Auth state, user, `isRole()` check |
| `useRestaurantId()` | Current restaurant ID + name |
| `useAccessControl()` | Permission checking (`hasPermission()`) |
| `useCurrency()` | Currency formatting |
| `useQSRMenuItems()` | Menu items fetch |
| `useHeldOrders()` | Parked orders (localStorage) |
| `useRealtimeAnalytics()` | Real-time Supabase subscriptions |
| `useOfflineCache()` | IDB pre-population for offline |
| `useReservations()` | Reservation CRUD |
| `useRooms()` | Room management |
| `useHousekeeping()` | Housekeeping tasks |
| `useFinancialData()` | Financial reports data |
| `useExpenseData()` | Expense tracking |
| `useCustomerData()` | Customer list + CRM |
| `useChannelManagement()` | Hotel channel management |
| `useNightAudit()` | Night audit operations |
| `useRecipes()` | Recipe management |

---

## Contexts

| Context | Provider Location | Purpose |
|---------|-------------------|---------|
| `AuthContext` | `useAuth.tsx` | User session, role, auth methods |
| `AccessContext` | `AccessContext.tsx` | RBAC permission checks |
| `CurrencyContext` | `CurrencyContext.tsx` | Currency symbol + formatting |
| `CartContext` | `CartContext.tsx` | QR ordering cart (customer-facing) |
| `NetworkStatusContext` | `NetworkStatusContext.tsx` | Online/offline detection + sync |

---

## Supabase Edge Functions

| Function | Purpose |
|----------|---------|
| `chat-with-gemini` | AI assistant (Google Gemini) |
| `submit-qr-order` | Process QR code orders |
| `generate-qr-code` | Generate QR codes |
| `customer-menu-api` | Public menu API for QR ordering |
| `deduct-inventory-on-prep` | Inventory deduction on kitchen prep |
| `check-low-stock` | Low stock alerts |
| `send-email` / `send-email-bill` | Email notifications |
| `send-whatsapp` / `send-whatsapp-bill` / `send-whatsapp-cloud` | WhatsApp messaging |
| `send-msg91-whatsapp` | MSG91 WhatsApp integration |
| `create-msg91-template` / `sync-msg91-template-status` | WhatsApp template management |
| `send-reservation-confirmation` / `send-reservation-reminder` | Reservation notifications |
| `enroll-customer` | Loyalty enrollment |
| `validate-promo-code` | Promotion validation |
| `log-promotion-usage` | Track promo usage |
| `create-payment-qr` / `create-paytm-qr` | Payment QR generation |
| `check-paytm-status` / `paytm-webhook` | Paytm payment processing |
| `record-clock-entry` | Staff clock in/out |
| `auto-clock-out` / `check-missed-clocks` | Attendance automation |
| `upload-image` / `freeimage-upload` / `google-drive-upload` | Image uploads |
| `extract-bill-details` | Bill OCR/extraction |
| `backup-restore` | Database backup |
| `find-active-reservation` | Reservation lookup |
| `sync-channels` | Hotel channel sync (OTAs) |
| `user-management` / `role-management` / `get-user-components` | RBAC management |
| `migrate-roles-data` | Role migration utility |
| `whatsapp-webhook` | WhatsApp incoming webhook |

---

## Database Tables (Key Groups)

### Core Operations
`orders`, `kitchen_orders`, `pos_transactions`, `menu_items`, `categories`, `tables`, `qr_codes`

### Hotel / PMS
`rooms`, `reservations`, `check_ins`, `guest_profiles`, `guest_preferences`, `guest_loyalty`, `guest_feedback`, `lost_found_items`, `housekeeping_tasks`, `housekeeping_logs`

### Revenue / Channel Management  
`booking_channels`, `channel_inventory`, `channel_rate_rules`, `channel_restrictions`, `channel_room_mapping`, `rate_plans`, `competitor_pricing`, `dynamic_pricing_rules`

### Financial
`expenses`, `expense_categories`, `invoices`, `invoice_line_items`, `chart_of_accounts`, `journal_entries`, `journal_entry_lines`, `budgets`, `budget_line_items`, `financial_reports`, `daily_revenue_stats`, `daily_summary_reports`

### CRM & Marketing
`customers`, `customer_activities`, `customer_notes`, `customer_order_sessions`, `loyalty_tiers`, `promotion_campaigns`

### Inventory
`inventory_items`, `inventory_transactions`, `inventory_alerts`, `recipes`, `batch_productions`

### Staff & Auth
`profiles`, `staff`, `staff_roles`, `user_roles`, `app_components`, `component_permissions`, `component_table_mapping`

### System
`restaurants`, `currencies`, `audit_logs`, `backups`, `backup_settings`, `notification_preferences`

---

## Conventions & Patterns

### Naming
- QuickServe components: `QS` prefix
- QSR components: `QSR` prefix
- All pages lazy-loaded in `AppRoutes.tsx`
- Permission guards wrap all authenticated routes

### Data Fetching
- React Query (`useQuery`, `useMutation`) for all server state
- `queryClient.invalidateQueries` for cache invalidation
- Supabase client: `import { supabase } from "@/integrations/supabase/client"`

### Styling
- Tailwind CSS with semantic tokens from `index.css`
- Dark mode support (`dark:` variants everywhere)
- Shadcn UI components from `src/components/ui/`
- Glassmorphism + gradient patterns for premium feel

### State Management
- Server state: React Query
- UI state: `useState`
- Persistent client state: `localStorage` (held orders, theme)
- Global state: React Context (auth, access, currency, cart, network)

### Testing
- Framework: Vitest + React Testing Library
- Mock pattern: `vi.mock("@/integrations/supabase/client")`
- Test location: `src/tests/`
- Run: `npx vitest run --reporter=verbose`

### Order Item Format
Items stored as strings: `"2x Veg Manchurian @150"`  
Parser regex: `/^(\d+)x\s+(.+?)\s+@(\d+(?:\.\d+)?)$/`

---

## Architecture Diagrams

See Mermaid diagrams:
- `.agent/diagrams/system-overview.mmd` — High-level system architecture
- `.agent/diagrams/data-flow.mmd` — Data flow between modules
- `.agent/diagrams/order-lifecycle.mmd` — Order state machine
- `.agent/diagrams/auth-flow.mmd` — Authentication and RBAC flow
