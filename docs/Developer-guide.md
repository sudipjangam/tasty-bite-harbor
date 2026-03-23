# 🏗️ Restaurant Management System - Developer Guide

A comprehensive developer reference for the Restaurant & Hotel Management System built with React, TypeScript, and Supabase.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Core Modules](#core-modules)
- [Role-Based Access Control](#role-based-access-control)
- [Edge Functions](#edge-functions)
- [UI/UX Features](#uiux-features)
- [Testing](#testing)
- [Custom Hooks](#custom-hooks)
- [Technologies](#technologies)
- [File Statistics](#file-statistics)

---

## Overview

This is a **full-featured Restaurant & Hotel Management System** designed for multi-venue hospitality businesses combining restaurant, hotel, and kitchen operations in a single platform.

---

## Architecture

### Frontend (React + TypeScript)
- **App Entry**: `App.tsx`
- **Context Providers**: QueryClient, Theme, Auth, Access, Tooltip
- **Router & Routes**: 46 Pages
- **Components**: 500+ Components
- **Custom Hooks**: 69 Hooks

### Backend (Supabase)
- **Authentication**: JWT-based auth with RLS
- **Database**: PostgreSQL (80+ tables, 9 CMS-specific)
- **Edge Functions**: 38+ serverless functions
- **File Storage**: Images & Documents buckets
- **Realtime**: WebSocket subscriptions
- **pg_cron**: 3 scheduled jobs (auto-sync, retries, parity checks)

### External Integrations
- Google Gemini AI
- MSG91 / WhatsApp Cloud API
- Email Service
- Paytm Payment Gateway
- **OTA APIs**: InGo-MMT (MakeMyTrip/Goibibo), Booking.com Connectivity API

---

## Core Modules

### 1. Dashboard (`/`)

**Components:**
- `Stats.tsx`
- `LiveActivity.tsx`
- `WeeklySalesChart.tsx`
- `QuickStats.tsx`
- `PredictiveAnalytics.tsx`

**Features:**
- Real-time business KPIs (Total Sales, Active Orders, Customers)
- Live activity feed with order updates
- Weekly sales trend charts
- Low inventory alerts
- Performance metrics
- Staff landing page for non-admin roles

---

### 2. Orders Management (`/orders`)

**Components:**
- `ActiveOrdersList.tsx`
- `OrderDetailsDialog.tsx`
- `ImprovedAddOrderForm.tsx`
- `CurrentOrder.tsx`

**Features:**
- Order lifecycle: **New → Preparing → Ready → Completed**
- Hold orders functionality
- Order filtering by status, date, customer
- Order details with items, modifiers, totals
- Payment recording (single and split payments)
- Kitchen integration

---

### 3. Point of Sale (`/pos`)

**Components:** `POS/` subdirectory with payment components

**Features:**
- Full-featured POS interface
- Category-based menu navigation
- Cart management
- Multiple payment methods
- Discount and promotion application
- Bill generation

---

### 4. Kitchen Display System (`/kitchen`)

**Components:**
- `KitchenDisplay.tsx`
- `OrderTicket.tsx`
- `OrdersColumn.tsx`
- `DateFilter.tsx`

**Features:**
- Real-time order queue display
- Order status updates (preparing, ready)
- Date filtering (today, yesterday, last 7 days, this month)
- Server-side filtering for scalability
- Order ticket printing

---

### 5. Menu Management (`/menu`)

**Components:**
- `AddMenuItemForm.tsx`
- `MenuGrid.tsx`

**Features:**
- Category management
- Menu item CRUD with images
- Pricing management
- Availability toggling
- Modifiers and variants
- Search and filter

---

### 6. Recipe Management (`/recipes`)

**Hook:** `useRecipes.tsx`

**Features:**
- Recipe creation with ingredients
- Cost calculation
- Inventory integration
- Portion management

---

### 7. Inventory Management (`/inventory`)

**Components:**
- `EnhancedInventoryForm.tsx`
- `InventoryAlerts.tsx`
- `PurchaseOrders.tsx`
- `CreatePurchaseOrder.tsx`

**Features:**
- Stock tracking with quantities and units
- Low-stock alerts (quantity < min_quantity)
- Automatic inventory deduction on orders
- Purchase order management
- Supplier integration
- Report export

---

### 8. Supplier Management (`/suppliers`)

**Page:** `Suppliers.tsx` (23KB)

**Features:**
- Supplier CRUD
- Contact information
- Order history
- Payment tracking
- Purchase order notifications

---

### 9. Tables Management (`/tables`)

**Components:**
- `TableCard.tsx`
- `TableDialog.tsx`
- `ReservationDialog.tsx`
- `ReservationsList.tsx`

**Features:**
- Visual table layout
- Table status tracking (Available, Occupied, Reserved)
- Table reservations
- Capacity management

---

### 10. Reservations (`/reservations`)

**Components:**
- `ReservationConfirmations.tsx`
- `TableAvailabilityHeatMap.tsx`
- `WaitlistManager.tsx`

**Hooks:**
- `useReservations.tsx`
- `useTableAvailability.tsx`
- `useWaitlist.tsx`

**Features:**
- Online booking
- Table assignment
- Status transitions (pending → confirmed → seated → completed)
- Covers calculation
- WhatsApp confirmation messages
- Waitlist management
- Availability heatmap

---

### 11. Room Management (`/rooms`) - Hotel Feature

**Components:**
- `RoomCard.tsx`
- `RoomDialog.tsx`
- `RoomsList.tsx`
- `RoomOrdersDialog.tsx`
- `BillingHistory.tsx`
- `PromotionsManager.tsx`
- `SpecialOccasions.tsx`

**Hook:** `useRooms.tsx`

**Features:**
- Room booking and check-in/check-out
- Room status management
- Room service orders
- Billing integration
- Promotions and special occasions
- Guest experience management

---

### 12. Housekeeping (`/housekeeping`)

**Components:**
- `HousekeepingDashboard.tsx`
- `CleaningSchedules.tsx`
- `MaintenanceRequests.tsx`
- `AmenityManagement.tsx`
- `GuestFeedback.tsx`
- `RoomStatusDashboard.tsx`

**Features:**
- Room status dashboard
- Cleaning schedules
- Maintenance requests
- Amenity management
- Guest feedback collection

---

### 13. Customer Management (CRM) (`/customers`)

**Components:**
- `CustomerList.tsx`
- `CustomerDetail.tsx`
- `CustomerDialog.tsx`
- `CustomerProfile360.tsx`
- `LoyaltyManagement.tsx`

**Hooks:**
- `useCustomerData.tsx`
- `useEnhancedCustomerData.tsx`

**Features:**
- Customer CRUD
- Purchase history
- Loyalty points (5% default rate)
- Loyalty tiers: Standard → Bronze → Silver → Gold
- Customer segmentation
- Customer Lifetime Value (CLTV) calculation
- Average Order Value (AOV)
- 360° customer profile

---

### 14. Staff Management (`/staff`)

**Components:**
- `StaffList.tsx`
- `StaffDetail.tsx`
- `StaffDialog.tsx`
- `TimeClockDialog.tsx`
- `StaffLeaveManager.tsx`
- `DocumentUpload.tsx`

**Features:**
- Staff CRUD with documents
- Role assignment
- Clock-in/Clock-out tracking
- Attendance management
- Leave requests
- Salary and commission calculations
- Document uploads

---

### 15. Analytics (`/analytics`)

**Components:**
- `BusinessDashboard.tsx` (54KB)
- `ExcelAnalyzer.tsx`
- `TimeSeriesAnalysis.tsx`
- `SalesPrediction.tsx`
- `CustomerInsights.tsx`
- `TopProducts.tsx`

**Hooks:**
- `useAnalyticsData.tsx`
- `useBusinessDashboardData.tsx`

**Features:**
- Sales trends and forecasting
- Revenue by category charts
- Top performing products
- Customer insights
- Excel file analysis upload
- Time series analysis
- Export to CSV/PDF
- Operational costs management

---

### 16. Financial Management (`/financial`)

**Components:**
- `FinancialDashboard.tsx`
- `BudgetManagement.tsx`
- `CashFlowManagement.tsx`
- `ProfitLossStatement.tsx`
- `InvoiceManagement.tsx`
- `TaxReporting.tsx`
- `GSTHelp.tsx`

**Hooks:**
- `useFinancialData.tsx`
- `useFinancialTrends.tsx`
- `useProfitLoss.tsx`

**Features:**
- Budget planning and tracking
- Cash flow management
- Profit & Loss statements
- Invoice generation and management
- Tax reporting (GST support for India)
- Financial reports

---

### 17. Expenses (`/expenses`)

**Hook:** `useExpenseData.tsx`

**Features:**
- Expense tracking
- Categorization
- Reports

---

### 18. Reports (`/reports`)

**Components:**
- `DefaultReports.tsx`
- `CustomReportBuilder.tsx`
- `ReportViewer.tsx`
- `AdvancedAnalytics.tsx`
- `ExportCenter.tsx`

**Hook:** `useReportsData.tsx` (24KB)

**Features:**
- Pre-built report templates
- Custom report builder
- Report scheduling
- Export to CSV/PDF
- Sales, inventory, staff, customer reports

---

### 19. Marketing (`/marketing`)

**Components:**
- `CampaignsList.tsx`
- `CreateCampaignDialog.tsx`
- `CustomerSegments.tsx`
- `LoyaltyManager.tsx`
- `MarketingAnalytics.tsx`

**Hook:** `useMarketingData.tsx`

**Features:**
- Campaign management
- Customer segmentation
- Loyalty program management
- Marketing analytics
- Promotion tracking

---

### 20. AI Assistant (`/ai`)

**Components:**
- `ChatWindow.tsx`
- `ChatMessage.tsx`
- `ChatInput.tsx`
- `AiCapabilities.tsx`
- `SampleQuestions.tsx`

**Hook:** `useChatWithApi.tsx`

**Features:**
- Chat with Google Gemini AI
- Sales forecasting
- Inventory recommendations
- Business insights
- Restaurant data context
- File upload for analysis

---

### 21. Settings (`/settings`)

**Components:**
- `PaymentSettingsTab.tsx`
- `SystemConfigurationTab.tsx`
- `AuditLogTab.tsx`

**Features:**
- Restaurant profile configuration
- Payment method settings
- System configuration
- Theme settings (Light/Dark mode)
- Audit logs
- Subscription management
- User profile settings
- Logout functionality

---

### 22. Security (`/security`)

**Page:** `Security.tsx` (20KB)

**Features:**
- Security dashboard
- Access logs
- Security settings
- Audit trails

---

### 23. User Management (`/user-management`)

**Components:** `UserManagement/` directory (5 components)

**Features:**
- User CRUD
- Role assignment
- Permission management

---

### 24. Role Management (`/role-management`)

**Components:**
- `RoleManagementDashboard.tsx`
- `CreateRoleDialog.tsx`
- `EditRoleDialog.tsx`
- `DeleteRoleDialog.tsx`

**Features:**
- Custom role creation
- Permission assignment
- Role CRUD

---

### 25. Admin Panel (`/admin`)

**Features:**
- Administrative controls
- System management

---

## Role-Based Access Control

### Defined Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| **Owner** | Full access to all features | Everything |
| **Admin** | Full access (same as owner) | Everything |
| **Manager** | Operational access, no financial reports | Most features except sensitive financials |
| **Chef** | Kitchen-focused access | Orders, Kitchen, Menu, Inventory |
| **Waiter** | Front-of-house access | Orders, Tables, Reservations, Kitchen view |
| **Staff** | Basic operational access | Orders, Menu view, Inventory, Kitchen |
| **Viewer** | Read-only dashboard | Dashboard only |

### Permission Categories

| Category | Permissions |
|----------|-------------|
| **Dashboard** | view, analytics |
| **Orders** | view, create, update, delete, pos.access |
| **Menu** | view, create, update, delete |
| **Inventory** | view, create, update, delete |
| **Staff** | view, create, update, delete, manage_roles |
| **Customers** | view, create, update, delete |
| **Rooms** | view, create, update, delete, checkout |
| **Reservations** | view, create, update, delete |
| **Analytics** | view, export |
| **Financial** | view, create, update, delete, reports |
| **Settings** | view, update, manage_users |
| **Kitchen** | view, update |
| **Tables** | view, create, update, delete |
| **Housekeeping** | view, create, update, delete |
| **Audit** | view, export |
| **Backup** | create, restore, view |
| **GDPR** | view, export, delete |

---

## Edge Functions

### Supabase Edge Functions (38+)

| Category | Functions |
|----------|-----------|
| **AI & Chat** | `chat-with-gemini`, `chat-with-ai`, `chat-with-api` |
| **WhatsApp** | `send-whatsapp`, `send-whatsapp-bill` |
| **Email** | `send-email-bill` |
| **Reservations** | `send-reservation-confirmation`, `send-reservation-reminder`, `find-active-reservation` |
| **Inventory** | `check-low-stock`, `deduct-inventory-on-prep` |
| **Staff** | `record-clock-entry`, `check-missed-clocks` |
| **Role Management** | `role-management`, `user-management`, `get-user-components`, `migrate-roles-data` |
| **Files** | `upload-image`, `freeimage-upload`, `google-drive-upload` |
| **Backups** | `backup-restore` |
| **Promotions** | `validate-promo-code`, `log-promotion-usage` |
| **Suppliers** | `send-purchase-order-notification` |
| **Channel Mgmt** | `sync-channels` (v125, JWT), `ota-webhooks` (v1, No JWT) |

### Rate Limiting

| Function | Limit |
|----------|-------|
| AI Chat | 30 requests/minute per user |
| WhatsApp | 100 messages/hour per user |

---

## UI/UX Features

| Feature | Description |
|---------|-------------|
| **Dark Mode** | Full dark mode support across all components |
| **Responsive Design** | Mobile, tablet, and desktop optimized |
| **Mobile Navigation** | Bottom navigation for mobile devices |
| **Sidebar** | Collapsible sidebar with role-based menu items |
| **Shadcn UI** | Modern component library (72 UI components) |
| **Charts** | Recharts for data visualization |
| **Real-time Updates** | Supabase realtime subscriptions |

---

## Testing

| Metric | Value |
|--------|-------|
| **Framework** | Vitest + React Testing Library |
| **Test Files** | 17 total |
| **Test Cases** | 229+ |
| **Coverage** | Pages, Integration, Business Logic |
| **Documentation** | [TESTING.md](./TESTING.md) |

---

## Custom Hooks

### 69 Custom Hooks by Category

| Category | Hooks |
|----------|-------|
| **Auth** | `useAuth`, `useAuthState`, `useSimpleAuth`, `useAccessControl` |
| **Data** | `useBusinessDashboardData`, `useAnalyticsData`, `useCustomerData`, `useReportsData` |
| **Features** | `useReservations`, `useRooms`, `useRecipes`, `useTables`, `useWaitlist` |
| **Real-time** | `useRealtimeAnalytics`, `useRealtimeSubscription`, `useLiveActivity` |
| **Business** | `useFinancialData`, `useProfitLoss`, `useExpenseData`, `useMarketingData` |
| **Channel Mgmt** | `useOTACredentials`, `useChannelManagement` |
| **Utilities** | `usePagination`, `useCurrency`, `useTheme`, `useMobile`, `useToast` |

---

## Technologies

| Category | Technology |
|----------|------------|
| **Frontend** | React 18, TypeScript |
| **Bundler** | Vite |
| **UI** | Shadcn UI, Radix UI, Tailwind CSS |
| **Backend** | Supabase (PostgreSQL, Auth, Edge Functions, Storage) |
| **AI** | Google Gemini |
| **Communication** | Twilio (WhatsApp), Email |
| **Charts** | Recharts |
| **Testing** | Vitest |
| **State** | TanStack Query |

---

## File Statistics

| Category | Count |
|----------|-------|
| **Pages** | 46 |
| **Components** | 500+ |
| **Hooks** | 69 |
| **Edge Functions** | 38+ |
| **Test Files** | 17 |
| **UI Components** | 77 |
| **CMS Tables** | 9 |
| **OTA Adapters** | 2 (MMT/Goibibo, Booking.com) |

---

## Business Domains Covered

| Domain | Features |
|--------|----------|
| **Restaurant Operations** | Orders, POS, Menu, Kitchen |
| **Hotel Operations** | Rooms, Housekeeping, Reservations |
| **Channel Management** | OTA Integration (MMT, Booking.com), Pooled Inventory, Rate Parity, Auto-Sync |
| **Customer Management** | CRM, Loyalty, Marketing |
| **Staff Management** | HR, Attendance, Payroll |
| **Financial Management** | Budgets, P&L, Invoicing, Taxes |
| **Analytics & Reporting** | BI, Forecasting, Exports |
| **AI & Automation** | Chatbot, Recommendations |
| **Security & Compliance** | RBAC, Audit, GDPR, Backups |

---

## 25. Channel Management System (`/channel-management`)

**Components:**
- `ChannelManagementDashboard.tsx` — Main dashboard (11 tabs)
- `OTACredentialManager.tsx` — Secure OTA credential vault
- `ChannelMappingManager.tsx` — Auto-map + manual room mapping
- `RateParityDashboard.tsx` — Parity score + channel comparison
- `RoomInventoryCalendar.tsx` — Asiatech-style availability grid + click-to-book
- `PoolInventoryManagement.tsx` — Central pooled inventory
- `EnhancedRateManagement.tsx` — Channel-specific rate rules
- `DynamicPricingEngine.tsx` — Demand-based pricing
- `AdvancedChannelSync.tsx` — Sync controls + retry management
- `BookingConsolidation.tsx` — OTA bookings aggregation
- `MetaSearchIntegration.tsx` — Meta search channel support

**Hooks:**
- `useOTACredentials.tsx` — CRUD for OTA credentials, connection testing, sync logs
- `useChannelManagement.tsx` — Channel CRUD, rate plans, sync triggers

**Edge Functions:**
- `sync-channels` (v125, JWT) — Full ARI sync engine using OTA adapters
- `ota-webhooks` (v1, No JWT) — Receives booking webhooks from OTAs

**OTA Adapters:**
- `mmt-goibibo-adapter.ts` — MakeMyTrip/Goibibo (InGo-MMT platform)
- `booking-com-adapter.ts` — Booking.com (JSON REST + OTA XML)

**Database (9 CMS tables):**
- `ota_credentials` — Encrypted OTA login credentials
- `channel_room_mapping` — HMS room ↔ OTA room type mapping
- `pool_inventory` — Central inventory pool (all channels share)
- `sync_logs` — Audit trail for every sync operation
- `sync_retry_queue` — Failed syncs with exponential backoff
- `ota_bookings` — Bookings received from OTAs
- `channel_rate_rules` — Markup/markdown rules per channel
- `channel_restrictions` — Stop-sell, min-stay, CTA rules
- `rate_parity_checks` — Daily parity comparison records

**Automation (pg_cron):**
- Auto-sync every 15 min
- Retry queue processing every 5 min
- Rate parity check daily at 6 AM

**Features:**
- Two-way OTA integration (push ARI, pull bookings)
- Adapter pattern for plug-and-play OTA support
- Pooled inventory preventing overbooking
- Webhook-based real-time booking reception
- Cross-channel availability updates on new bookings
- Rate parity monitoring with parity score
- Channel-specific rate rules (markup, markdown, commission offset)
- One-click auto-mapping of rooms to OTAs
- Encrypted credential storage with connection testing

---

*Last Updated: March 2026*