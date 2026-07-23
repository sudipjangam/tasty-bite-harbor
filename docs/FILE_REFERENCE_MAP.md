# 📁 Tasty Bite Harbor — Complete File Reference Map

> **Last updated:** 2026-07-23  
> Every `.tsx` page, its route, sidebar group, required permission, and key child components.

---

## Table of Contents

1. [Routing Architecture](#routing-architecture)
2. [Public Pages (No Auth)](#public-pages-no-auth)
3. [Dashboard Pages (Auth Required)](#dashboard-pages-auth-required)
4. [Sidebar Navigation Groups](#sidebar-navigation-groups)
5. [Component Directory Map](#component-directory-map)
6. [Hooks Reference](#hooks-reference)
7. [Type Definitions](#type-definitions)

---

## Routing Architecture

```
Routes.tsx                    ← Top-level router (public vs auth)
├── Public routes             ← No login needed
├── /subscription             ← Standalone subscription page (no sidebar)
└── /dashboard/* + /*         ← SubscriptionGate → AppRoutes
    └── AppRoutes.tsx         ← Sidebar layout + PermissionGuard per route
```

| File | Purpose |
|------|---------|
| `src/components/Auth/Routes.tsx` | Top-level router, splits public vs authenticated |
| `src/components/Auth/AppRoutes.tsx` | All authenticated dashboard routes with sidebar layout |
| `src/components/Auth/SubscriptionGate.tsx` | Blocks access if no active subscription |
| `src/components/Auth/PermissionGuard.tsx` | Route-level permission check |
| `src/components/Layout/ImprovedSidebarNavigation.tsx` | Sidebar menu with groups, permission filtering |

---

## Public Pages (No Auth)

| Route | Page File | Purpose |
|-------|-----------|---------|
| `/` | `pages/Index.tsx` → `pages/LandingWebsite.tsx` | Landing page (unauthenticated) |
| `/auth`, `/login` | `pages/Auth.tsx` | Login / signup / password reset |
| `/auth/callback` | `pages/AuthCallback.tsx` | OAuth callback handler |
| `/privacy` | `pages/PrivacyPolicy.tsx` | Privacy policy |
| `/terms` | `pages/TermsAndConditions.tsx` | Terms and conditions |
| `/refund` | `pages/RefundPolicy.tsx` | Refund policy |
| `/return` | `pages/ReturnPolicy.tsx` | Return policy |
| `/shipping` | `pages/ShippingPolicy.tsx` | Shipping/delivery policy |
| `/delete-account` | `pages/DeleteAccount.tsx` | Account deletion request page |
| `/enroll/:slug` | `pages/PublicEnrollmentPage.tsx` | Public loyalty enrollment |
| `/order/:encodedData` | `pages/CustomerOrder.tsx` | Customer-facing QR order page |
| `/bill/:encodedData` | `pages/PublicBillPage.tsx` | Public bill view (shared link) |
| `/truck/:slug` | `pages/PublicTruckPage.tsx` | Food truck public page |
| `/invoice/*` | `pages/InvoicePage.tsx` | Public invoice viewer (lazy) |
| `/blog/zomato-swiggy-integration` | `pages/BlogZomatoSwiggyIntegration.tsx` | SEO blog post |
| `/reset-password` | `pages/Auth.tsx` | Password reset (reuses Auth) |

---

## Dashboard Pages (Auth Required)

All routes below are under `SubscriptionGate` + `PermissionGuard`. Sidebar is visible.

### 🏠 Dashboard Group

| Route | Page File | Permission | Sidebar Label | Description |
|-------|-----------|------------|---------------|-------------|
| `/` (dashboard) | `pages/Index.tsx` | `dashboard.view` | **Overview** | Main dashboard with stats, charts, analytics |
| _(fallback)_ | `components/Dashboard/StaffLandingPage.tsx` | _(none)_ | — | Shown to staff without dashboard.view |

**Key components in `components/Dashboard/`:**
- `CustomizableDashboard.tsx` — Widget-based dashboard layout
- `StaffLandingPage.tsx` — Simplified staff view

---

### ⚙️ Operations Group

| Route | Page File | Permission | Sidebar Label | Description |
|-------|-----------|------------|---------------|-------------|
| `/pos` | `pages/POS.tsx` | `orders.view` | **POS** | Full point-of-sale (table-based) |
| `/orders` | `pages/Orders.tsx` | `orders.view` | **Orders** | Orders management list, edit, filter, export |
| `/qsr-pos` | `pages/QSRPos.tsx` | `orders.view` | **QSR POS** | Quick service restaurant POS |
| `/quickserve-pos` | `pages/QuickServePOS.tsx` | `orders.view` | **QuickServe POS** | Counter & takeaway POS |
| `/kitchen` | `pages/Kitchen.tsx` | `kitchen.view` | **Kitchen** | Kitchen display system (KDS) |
| `/recipes` | `pages/RecipeManagement.tsx` | `menu.view` | **Recipes** | Recipe & food costing management |
| `/menu` | `pages/Menu.tsx` | `menu.view` | **Menu** | Menu items CRUD |
| `/tables` | `pages/Tables.tsx` | `tables.view` | **Tables** | Table management & reservations |
| `/inventory` | `pages/Inventory.tsx` | `inventory.view` | **Inventory** | Stock management, purchase orders |

**Key components:**

| Component Directory | Used By | Purpose |
|---------------------|---------|---------|
| `components/Orders/OrdersView/` | `/orders` | Order list with filters, stats, pagination |
| `components/Orders/OrderList.tsx` | `/orders` | Order cards, edit/delete/print actions |
| `components/Orders/OrderItem.tsx` | `/orders` | Single order row/card |
| `components/Orders/ImprovedAddOrderForm.tsx` | `/orders` | Create/edit order form (720px wide) |
| `components/Orders/AddOrderForm.tsx` | `/orders` | Wrapper → ImprovedAddOrderForm |
| `components/Orders/OrderDetailsDialog.tsx` | `/orders` | Order detail view + payment + edit |
| `components/Orders/POS/POSMode.tsx` | `/pos` | POS table-mode ordering |
| `components/Orders/POS/PaymentDialog.tsx` | `/pos`, `/orders` | Payment processing dialog |
| `components/Orders/POS/PaymentDialog/steps/` | `/pos` | Multi-step payment (edit → method → confirm → success) |
| `components/Orders/POS/PaymentComponents/` | `/pos` | Order editor, confirmation, QR payment |
| `components/QSR/QSRPosMain.tsx` | `/qsr-pos` | QSR main layout |
| `components/QSR/QSRMenuGrid.tsx` | `/qsr-pos` | QSR menu item grid |
| `components/QSR/QSROrderPad.tsx` | `/qsr-pos` | QSR order sidebar |
| `components/QSR/QSRCartBottomSheet.tsx` | `/qsr-pos` | Mobile cart sheet |
| `components/QuickServe/QSMenuGrid.tsx` | `/quickserve-pos` | QuickServe menu grid |
| `components/QuickServe/QSOrderPanel.tsx` | `/quickserve-pos` | QuickServe order panel |
| `components/QuickServe/QSPaymentSheet.tsx` | `/quickserve-pos` | QuickServe payment |
| `components/QuickServe/QSActiveOrders.tsx` | `/quickserve-pos` | Active orders list |
| `components/QuickServe/QSOrderHistory.tsx` | `/quickserve-pos` | Past orders |
| `components/QuickServe/DailySummaryDialog.tsx` | `/quickserve-pos` | End-of-day summary |
| `components/Kitchen/OrderTicket.tsx` | `/kitchen` | Kitchen order ticket card |
| `components/Recipes/RecipeDialog.tsx` | `/recipes` | Add/edit recipe dialog |
| `components/Recipes/RecipeList.tsx` | `/recipes` | Recipe list view |
| `components/Recipes/RecipeCostingCard.tsx` | `/recipes` | Cost breakdown card |
| `components/Recipes/BatchProductionManager.tsx` | `/recipes` | Batch production |
| `components/Recipes/MenuEngineering.tsx` | `/recipes` | Menu engineering analysis |
| `components/Menu/` | `/menu` | Menu CRUD components |
| `components/Tables/TableCard.tsx` | `/tables` | Table status card |
| `components/Tables/TableDialog.tsx` | `/tables` | Add/edit table |
| `components/Tables/ReservationDialog.tsx` | `/tables` | Table reservation |
| `components/Inventory/` | `/inventory` | Inventory items, purchase orders |

---

### 🛎️ Guest Services Group

| Route | Page File | Permission | Sidebar Label | Description |
|-------|-----------|------------|---------------|-------------|
| `/rooms` | `pages/Rooms.tsx` | `rooms.view` | **Rooms** | Hotel room management |
| `/reservations` | `pages/Reservations.tsx` | `reservations.view` | **Reservations** | Booking management |
| `/housekeeping` | `pages/Housekeeping.tsx` | `housekeeping.view` | **Housekeeping** | Cleaning & maintenance |

**Key components:**

| Component Directory | Purpose |
|---------------------|---------|
| `components/Rooms/RoomCard.tsx` | Room status card |
| `components/Rooms/RoomDialog.tsx` | Add/edit room |
| `components/Rooms/RoomCheckout.tsx` | Room checkout flow |
| `components/Rooms/CheckoutComponents/` | Checkout sub-components (charges, payment, bill) |
| `components/Rooms/RoomOrderForm.tsx` | Room service ordering |
| `components/Rooms/RoomOrdersDialog.tsx` | Room orders list |
| `components/Rooms/WalkInCheckInDialog.tsx` | Walk-in guest check-in |
| `components/Rooms/ReservationDialog.tsx` | Room reservation form |
| `components/Rooms/AvailabilityCalendar/` | Room availability calendar |
| `components/Rooms/GroupReservation/` | Group booking |
| `components/Rooms/CorporateBooking/` | Corporate rates/booking |
| `components/Rooms/GuestLoyalty/` | Guest tier badges |
| `components/Rooms/GuestPreferences/` | Guest preference editor |
| `components/Rooms/SplitBillingDialog.tsx` | Split bill between guests |
| `components/Reservations/UnifiedReservationsList.tsx` | All reservations list |
| `components/Reservations/WaitlistManager.tsx` | Waitlist management |
| `components/Reservations/TableAvailabilityHeatMap.tsx` | Heat map |
| `components/Housekeeping/` | Housekeeping tasks |

---

### 📊 Management Group

| Route | Page File | Permission | Sidebar Label | Description |
|-------|-----------|------------|---------------|-------------|
| `/staff` | `pages/Staff.tsx` | `staff.view` | **Staff** | Employee management |
| `/shift-management` | `pages/ShiftManagement.tsx` | `staff.update` | — | Shift scheduling |
| `/customers` | `pages/Customers.tsx` | `customers.view` | **Customers** | Customer database & CRM |
| `/marketing` | `pages/Marketing.tsx` | `customers.view` | **Marketing** | Campaigns & promotions |
| `/user-management` | `pages/UserManagement.tsx` | `users.manage` | **User & Access** | User accounts |
| `/role-management` | `pages/RoleManagement.tsx` | `users.manage` | — | Role CRUD |
| `/permission-management` | `pages/PermissionManagement.tsx` | `staff.manage_roles` | **Permission Management** | Component permissions (admin only) |
| `/channel-management` | `pages/ChannelManagement.tsx` | `analytics.view` | **Channel Management** | OTA & booking channels |
| `/analytics` | `pages/Analytics.tsx` | `analytics.view` | **Analytics** | Business insights & charts |
| `/financial` | `pages/Financial.tsx` | `financial.view` | **Financial** | P&L, financial reports |
| `/reports` | `pages/Reports.tsx` | `financial.view` | **Reports** | Custom report builder |
| `/expenses` | `pages/Expenses.tsx` | `financial.view` | **Expenses** | Expense tracking |
| `/nc-orders` | `pages/NCOrders.tsx` | _(none)_ | — | Non-chargeable orders |
| `/suppliers` | `pages/Suppliers.tsx` | `inventory.view` | — | Supplier management |

**Key components:**

| Component Directory | Purpose |
|---------------------|---------|
| `components/Staff/StaffList.tsx` | Staff list |
| `components/Staff/StaffDialog.tsx` | Add/edit staff |
| `components/Staff/StaffDetail.tsx` | Staff profile view |
| `components/Staff/ShiftManagementContent.tsx` | Shift management UI |
| `components/Staff/TimeClockDialog.tsx` | Clock in/out |
| `components/Staff/ProfileComponents/` | Staff profile tabs (leave, permissions, schedule) |
| `components/Customers/` | Customer list, profiles |
| `components/CRM/CustomerFullProfile.tsx` | Full customer profile |
| `components/Marketing/` | Campaign management |
| `components/Promotions/PromotionsManager.tsx` | Promotions CRUD |
| `components/UserManagement/UserManagementDashboard.tsx` | User mgmt dashboard |
| `components/UserManagement/CreateUserDialog.tsx` | Create user |
| `components/UserManagement/EditUserDialog.tsx` | Edit user |
| `components/RoleManagement/RoleManagementDashboard.tsx` | Roles dashboard |
| `components/Revenue/ChannelManagementDashboard.tsx` | Channel mgmt |
| `components/Revenue/DynamicPricingEngine.tsx` | Dynamic pricing |
| `components/Reporting/` | Report builder, viewer, analytics |
| `components/Expenses/` | Expense tracking |
| `components/NC/` | NC order components |
| `components/Suppliers/SupplierPerformance.tsx` | Supplier analytics |

---

### 🏢 Franchise Management Group

All routes below are wrapped inside the `<FranchiseProvider>` context and use the independent `<FranchiseLayout />` sidebar layout.

> **Subscription Gating (added 2026-07-23):** FranchiseLayout is wrapped with `<FeatureLock feature="franchise.dashboard">`. The sidebar `hrefToComponentMap` maps `/franchise` → `"franchise"` subscription component. Feature Permissions Manager exposes 9 franchise checkboxes.

| Route | Page File | Permission/Role | Sidebar Label | Description |
|---|---|---|---|---|
| `/franchise` | `pages/Franchise/FranchiseDashboard.tsx` | Franchise role | **Dashboard** | Consolidated branch dashboard with Mum/Pun/Nas charts |
| `/franchise/branches` | `pages/Franchise/BranchManagement.tsx` | Franchise Owner/Admin | **Branches** | Branch CRUD with color presets, 3D icons, stats panel |
| `/franchise/team` | `pages/Franchise/TeamManagement.tsx` | Franchise Owner/Admin | **Team** | Organization directory showing user profiles & org roles |
| `/franchise/menu-sync` | `pages/Franchise/MenuSync.tsx` | Franchise Owner/Admin | **Menu Sync** | Central menu manager with status, overrides, and inheritance |
| `/franchise/orders` | `pages/Franchise/CrossBranchOrders.tsx` | Franchise role | **Orders** | Cross-branch order logs with branch switcher filter |
| `/franchise/inventory` | `pages/Franchise/CrossBranchInventory.tsx` | Franchise role | **Inventory** | Stock overview, transfer stock, and allocate bulk purchase |
| `/franchise/staff` | `pages/Franchise/CrossBranchStaff.tsx` | Franchise role | **Staff** | Daily attendance and roaming staff configurations |
| `/franchise/pnl` | `pages/Franchise/CrossBranchPnL.tsx` | Franchise role | **P&L Report** | Financial P&L, period scaling, date range picker & CSV export |
| `/franchise/settings` | `pages/Franchise/FranchiseSettings.tsx` | Franchise Owner/Admin | **Settings** | Organization details, profile metadata, audit logger |

---

### 🔧 Standalone Items (Outside Groups)

| Route | Page File | Permission/Role | Sidebar Label | Description |
|-------|-----------|-----------------|---------------|-------------|
| `/platform` | `pages/Platform/PlatformLayout.tsx` | **admin** role | **Platform Admin** | Super-admin panel |
| `/ai` | `pages/AI.tsx` | `dashboard.view` | **AI Assistant** | AI-powered assistant |
| `/security` | `pages/Security.tsx` | `audit.view` | **Security** | Security & compliance |
| `/settings` | `pages/Settings.tsx` | `settings.view` | **Settings** | System configuration |
| `/admin` | `pages/AdminPanel.tsx` | `users.manage` | — | Admin panel |
| `/daily-summary-history` | `pages/DailySummaryHistory.tsx` | _(none)_ | — | Daily summary reports |
| `/email-tester` | `components/Email/EmailTester.tsx` | **admin** role | — | Dev tool: email tester |

---

### 🏢 Platform Admin Sub-Routes (Admin Only)

All under `/platform/*`:

| Sub-Route | Page File | Purpose |
|-----------|-----------|---------|
| `/platform` (index) | `pages/Platform/PlatformDashboard.tsx` | Platform overview |
| `/platform/restaurants` | `pages/Platform/RestaurantManagement.tsx` | Manage all restaurants |
| `/platform/subscriptions` | `pages/Platform/SubscriptionManager.tsx` | Manage subscriptions |
| `/platform/feature-permissions` | `pages/Platform/FeaturePermissions.tsx` | Feature toggle per plan |
| `/platform/franchises` | `pages/Platform/FranchiseAdmin.tsx` | Franchise onboarding & management |
| `/platform/users` | `pages/Platform/AllUsers.tsx` | All users across restaurants |
| `/platform/analytics` | `pages/Platform/PlatformAnalytics.tsx` | Platform-wide analytics |
| `/platform/templates` | `components/Platform/AdminTemplateReview.tsx` | Template review |
| `/platform/whatsapp` | `components/Admin/WhatsAppProviderAdmin.tsx` | WhatsApp config |

---

## Sidebar Navigation Groups

```
┌─ Dashboard ─────────────────────────────────┐
│  Overview (/)                                │
├─ Operations ─────────────────────────────────┤
│  POS (/pos)                                  │
│  Orders (/orders)                            │
│  QSR POS (/qsr-pos)                          │
│  QuickServe POS (/quickserve-pos)            │
│  Kitchen (/kitchen)                          │
│  Recipes (/recipes)                          │
│  Menu (/menu)                                │
│  Tables (/tables)                            │
│  Inventory (/inventory)                      │
├─ Guest Services ─────────────────────────────┤
│  Rooms (/rooms)                              │
│  Reservations (/reservations)                │
│  Housekeeping (/housekeeping)                │
├─ Management ─────────────────────────────────┤
│  Staff (/staff)                              │
│  Customers (/customers)                      │
│  Marketing (/marketing)                      │
│  User & Access (/user-management)            │
│  Permission Management (/permission-mgmt)    │
│  Channel Management (/channel-management)    │
│  Analytics (/analytics)                      │
│  Financial (/financial)                      │
│  Reports (/reports)                          │
│  Expenses (/expenses)                        │
├─ Standalone ─────────────────────────────────┤
│  Platform Admin (/platform) [admin only]     │
│  AI Assistant (/ai)                          │
│  Security (/security)                        │
│  Settings (/settings)                        │
└──────────────────────────────────────────────┘
```

```
┌─ Franchise Portal (Independent Layout) ──────┐
│  Dashboard (/franchise)                      │
│  Branches (/franchise/branches)              │
│  Team (/franchise/team)                      │
│  Menu Sync (/franchise/menu-sync)            │
│  Orders (/franchise/orders)                  │
│  Inventory (/franchise/inventory)            │
│  Staff (/franchise/staff)                    │
│  P&L Report (/franchise/pnl)                 │
│  Settings (/franchise/settings)              │
└──────────────────────────────────────────────┘
```

---

## Detailed Component Reference

### components/AI\n
| File | Type/Purpose |
|------|--------------|
| AiCapabilities.tsx | Component |
| SampleQuestions.tsx | Component |

### components/Admin\n
| File | Type/Purpose |
|------|--------------|
| AdminDashboard.tsx | Dashboard wrapper/view |
| CreateRestaurantDialog.tsx | Dialog / Modal UI |
| DeleteRestaurantDialog.tsx | Dialog / Modal UI |
| EditRestaurantDialog.tsx | Dialog / Modal UI |
| GlobalUserManagement.tsx | Component |
| RestaurantManagement.tsx | Component |
| WhatsAppProviderAdmin.tsx | Component |

### components/Analytics\n
| File | Type/Purpose |
|------|--------------|
| AIChartBuilder.tsx | Component |
| AnalyticsHeader.tsx | Component |
| BusinessDashboard.tsx | Dashboard wrapper/view |
| BusinessReportExport.tsx | Component |
| ChartCards.tsx | Card UI component |
| ConsolidatedRevenueChart.tsx | Component |
| CustomerInsights.tsx | Component |
| ExcelAnalyzer.tsx | Component |
| ExpandedChartDialog.tsx | Dialog / Modal UI |
| FileAnalysisUploader.tsx | Component |
| HotelMetricsCards.tsx | Card UI component |
| ManualChartBuilder.tsx | Component |
| OperationalCostsManager.tsx | Component |
| RevenueByCategoryChart.tsx | Component |
| RevenueChart.tsx | Component |
| RevenueHighchart.tsx | Component |
| SalesPrediction.tsx | Component |
| StatCards.tsx | Card UI component |
| TimeRangeSelector.tsx | Component |
| TimeSeriesAnalysis.tsx | Component |
| TopProducts.tsx | Component |

### components/Analytics/BusinessDashboard\n
| File | Type/Purpose |
|------|--------------|
| DocumentItem.tsx | Component |
| DocumentRepository.tsx | Component |
| PromotionItem.tsx | Component |
| PromotionalCampaigns.tsx | Component |
| SmartInsightItem.tsx | Component |
| SmartInsights.tsx | Component |
| index.tsx | Component |

### components/Auth\n
| File | Type/Purpose |
|------|--------------|
| AppRoutes.tsx | Component |
| AuthForm.tsx | Form component |
| AuthLoader.tsx | Component |
| BrandingSection.tsx | Component |
| CombinedAccessGuard.tsx | Component |
| ComponentAccessGuard.tsx | Component |
| ComponentGuard.tsx | Component |
| FeatureLock.tsx | Component |
| ForgotPasswordForm.tsx | Form component |
| InquiryForm.tsx | Form component |
| PasswordResetForm.tsx | Form component |
| PermissionDeniedDialog.tsx | Dialog / Modal UI |
| PermissionGuard.tsx | Component |
| ProtectedRoute.tsx | Component |
| RouteGuards.tsx | Component |
| Routes.tsx | Component |
| SubscriptionGate.tsx | Component |
| SubscriptionGuard.tsx | Component |

### components/Branding\n
| File | Type/Purpose |
|------|--------------|
| SwadeshiLogo.tsx | Component |

### components/CRM\n
| File | Type/Purpose |
|------|--------------|
| CustomerDetail.tsx | Component |
| CustomerDialog.tsx | Dialog / Modal UI |
| CustomerFullProfile.tsx | Component |
| CustomerList.tsx | List view |
| CustomerProfile360.tsx | Component |
| EnhancedCustomerDetail.tsx | Component |
| LoyaltyManagement.tsx | Component |
| QRCodeGenerator.tsx | Component |
| RealtimeCustomers.tsx | Component |

### components/Chatbot\n
| File | Type/Purpose |
|------|--------------|
| ChatInput.tsx | Component |
| ChatMessage.tsx | Component |
| ChatWindow.tsx | Component |
| Chatbot.tsx | Component |
| FileUploadButton.tsx | Button element |

### components/CustomerOrder\n
| File | Type/Purpose |
|------|--------------|
| CartDrawer.tsx | Component |
| CheckoutForm.tsx | Form component |
| MenuBrowser.tsx | Component |
| MenuItemCard.tsx | Card UI component |
| OrderTracker.tsx | Component |

### components/Customers\n
| File | Type/Purpose |
|------|--------------|
| LoyaltyBadge.tsx | Component |

### components/Dashboard\n
| File | Type/Purpose |
|------|--------------|
| AttendanceReportsWidget.tsx | Component |
| CustomizableDashboard.tsx | Dashboard wrapper/view |
| DashboardHeader.tsx | Dashboard wrapper/view |
| EnhancedStats.tsx | Component |
| FoodTruckDashboard.tsx | Dashboard wrapper/view |
| InteractiveChart.tsx | Component |
| KPIWidget.tsx | Component |
| LaborCostWidget.tsx | Component |
| LiveOrderStatus.tsx | Component |
| LocationTodayWidget.tsx | Component |
| LowInventoryAlert.tsx | Component |
| NCStatsCard.tsx | Card UI component |
| OwnerAlertsWidget.tsx | Component |
| PerformanceMetrics.tsx | Component |
| PlanInsightsCard.tsx | Card UI component |
| PredictiveAnalytics.tsx | Component |
| QuickStats.tsx | Component |
| RecentOrdersTable.tsx | Component |
| RevenueBreakdown.tsx | Component |
| RevenuePieChart.tsx | Component |
| RoomStatusWidget.tsx | Component |
| StaffAttendanceWidget.tsx | Component |
| StaffLandingPage.tsx | Component |
| StaffSelfServiceSection.tsx | Component |
| StatCard.tsx | Card UI component |
| StatDetails.tsx | Component |
| Stats.tsx | Component |
| TodayScheduleWidget.tsx | Component |
| TrendAnalysis.tsx | Component |
| TrendingItems.tsx | Component |
| WeeklySalesChart.tsx | Component |

### components/Dashboard/widgets\n
| File | Type/Purpose |
|------|--------------|
| AvgOrderTrendWidget.tsx | Component |
| DailyOrdersWidget.tsx | Component |
| HourlySalesWidget.tsx | Component |
| LocationPerformanceWidget.tsx | Component |
| MenuMarginsWidget.tsx | Component |
| OwnerAttendanceWidget.tsx | Component |
| PaymentSplitWidget.tsx | Component |
| WeatherWidget.tsx | Component |
| WidgetPickerDialog.tsx | Dialog / Modal UI |
| WidgetRegistry.ts | Component |
| WidgetRenderer.tsx | Component |

### components/Email\n
| File | Type/Purpose |
|------|--------------|
| EmailTester.tsx | Component |

### components/Expenses\n
| File | Type/Purpose |
|------|--------------|
| ExpenseAnalytics.tsx | Component |
| ExpenseForm.tsx | Form component |
| ExpenseHelpDialog.tsx | Dialog / Modal UI |
| ExpenseWastageTab.tsx | Component |
| ExpensesList.tsx | List view |
| ExpensesOverview.tsx | Component |
| InventoryExpenseDialog.tsx | Dialog / Modal UI |
| StaffSalaryExpenseDialog.tsx | Dialog / Modal UI |

### components/Financial\n
| File | Type/Purpose |
|------|--------------|
| BudgetManagement.tsx | Component |
| CashFlowManagement.tsx | Component |
| CreateBudgetDialog.tsx | Dialog / Modal UI |
| EditBudgetDialog.tsx | Dialog / Modal UI |
| FinancialDashboard.tsx | Dashboard wrapper/view |
| FinancialReports.tsx | Component |
| GSTHelp.tsx | Component |
| InvoiceManagement.tsx | Component |
| InvoiceManager.tsx | Component |
| ProfitLossStatement.tsx | Component |
| TaxReporting.tsx | Component |

### components/Financial/GST\n
| File | Type/Purpose |
|------|--------------|
| FilingCalendar.tsx | Component |
| GSTDashboard.tsx | Dashboard wrapper/view |
| GSTR1Panel.tsx | Component |
| GSTR3BPanel.tsx | Component |
| HSNSummary.tsx | Component |
| InputTaxCredit.tsx | Component |
| index.ts | Component |

### components/GuestExperience\n
| File | Type/Purpose |
|------|--------------|
| GuestCheckIn.tsx | Component |

### components/Guests\n
| File | Type/Purpose |
|------|--------------|
| GuestCheckInDialog.tsx | Dialog / Modal UI |
| GuestCheckOutDialog.tsx | Dialog / Modal UI |
| GuestManagementDashboard.tsx | Dashboard wrapper/view |

### components/Help\n
| File | Type/Purpose |
|------|--------------|
| CustomersGuide.tsx | Component |
| DashboardGuide.tsx | Dashboard wrapper/view |
| HelpGuideShell.tsx | Component |
| HelpProvider.tsx | Component |
| InventoryGuide.tsx | Component |
| KitchenGuide.tsx | Component |
| MenuGuide.tsx | Component |
| OrdersGuide.tsx | Component |
| QSRGuide.tsx | Component |
| RecipesGuide.tsx | Component |
| ReservationsGuide.tsx | Component |
| StaffGuide.tsx | Component |
| TablesGuide.tsx | Component |

### components/Housekeeping\n
| File | Type/Purpose |
|------|--------------|
| AmenityDialog.tsx | Dialog / Modal UI |
| AmenityManagement.tsx | Component |
| CleaningScheduleDialog.tsx | Dialog / Modal UI |
| CleaningSchedules.tsx | Component |
| GuestFeedback.tsx | Component |
| HousekeepingCard.tsx | Card UI component |
| HousekeepingChecklistDialog.tsx | Dialog / Modal UI |
| HousekeepingDashboard.tsx | Dashboard wrapper/view |
| MaintenanceRequestDialog.tsx | Dialog / Modal UI |
| MaintenanceRequests.tsx | Component |
| RoomAmenities.tsx | Component |
| RoomStatusDashboard.tsx | Dashboard wrapper/view |
| index.tsx | Component |

### components/Inventory\n
| File | Type/Purpose |
|------|--------------|
| BillExtractedDataDialog.tsx | Dialog / Modal UI |
| BillUploadDialog.tsx | Dialog / Modal UI |
| CreatePurchaseOrder.tsx | Component |
| EnhancedInventoryForm.tsx | Form component |
| HomemadeIngredientPicker.tsx | Component |
| InventoryAlerts.tsx | Component |
| InventoryForecasting.tsx | Component |
| InventoryItemDetail.tsx | Component |
| InventoryKPIs.tsx | Component |
| InventoryLots.tsx | Component |
| InventoryTransactions.tsx | Component |
| ProduceMoreDialog.tsx | Dialog / Modal UI |
| PurchaseOrderSuggestions.tsx | Component |
| PurchaseOrders.tsx | Component |
| ReportExport.tsx | Component |
| Stocktake.tsx | Component |
| StorageLocations.tsx | Component |
| WastageReport.tsx | Component |

### components/Kitchen\n
| File | Type/Purpose |
|------|--------------|
| DateFilter.tsx | Component |
| KitchenDisplay.tsx | Component |
| OrderTicket.tsx | Component |
| OrdersColumn.tsx | Component |

### components/Landing\n
| File | Type/Purpose |
|------|--------------|
| AboutSection.tsx | Component |
| CTASection.tsx | Component |
| FAQSection.tsx | Component |
| FeaturesSection.tsx | Component |
| FooterSection.tsx | Component |
| HeroSection.tsx | Component |
| HowItWorksSection.tsx | Component |
| NavigationHeader.tsx | Component |
| PortfolioSection.tsx | Component |
| PricingSection.tsx | Component |
| TestimonialsSection.tsx | Component |
| WhyChooseUsSection.tsx | Component |

### components/Layout\n
| File | Type/Purpose |
|------|--------------|
| BottomNav.tsx | Component |
| ImprovedSidebarNavigation.tsx | Component |
| PageHeader.tsx | Component |
| Sidebar.tsx | Component |
| SidebarFooter.tsx | Component |
| SidebarHeader.tsx | Component |
| SidebarNavigation.tsx | Component |
| SimpleLayout.tsx | Component |
| SimpleSidebar.tsx | Component |
| SimpleSidebarNavigation.tsx | Component |
| Watermark.tsx | Component |

### components/LostFound\n
| File | Type/Purpose |
|------|--------------|
| LostFoundDialog.tsx | Dialog / Modal UI |
| LostFoundList.tsx | List view |
| index.tsx | Component |

### components/Marketing\n
| File | Type/Purpose |
|------|--------------|
| CampaignsList.tsx | List view |
| CreateCampaignDialog.tsx | Dialog / Modal UI |
| CreateTemplateDialog.tsx | Dialog / Modal UI |
| CustomerSegments.tsx | Component |
| EditCampaignDialog.tsx | Dialog / Modal UI |
| LoyaltyManager.tsx | Component |
| MarketingAnalytics.tsx | Component |
| TemplateManager.tsx | Component |
| WhatsAppCampaigns.tsx | Component |

### components/Menu\n
| File | Type/Purpose |
|------|--------------|
| AddMenuItemForm.tsx | Form component |
| MenuGrid.tsx | Grid view layout |

### components/NC\n
| File | Type/Purpose |
|------|--------------|
| NCOrdersReport.tsx | Component |

### components/NightAudit\n
| File | Type/Purpose |
|------|--------------|
| NightAuditDashboard.tsx | Dashboard wrapper/view |
| index.tsx | Component |

### components/Notifications\n
| File | Type/Purpose |
|------|--------------|
| NotificationListener.tsx | List view |
| OwnerNotificationBell.tsx | Component |
| OwnerNotificationListener.tsx | List view |

### components/Orders\n
| File | Type/Purpose |
|------|--------------|
| ActiveOrdersList.tsx | List view |
| AddOrderForm.tsx | Form component |
| CurrentOrder.tsx | Component |
| CustomExtrasPanel.tsx | Component |
| DuplicateOrderWarningDialog.tsx | Dialog / Modal UI |
| ImprovedAddOrderForm.tsx | Form component |
| MenuCategories.tsx | Component |
| MenuItemsGrid.tsx | Grid view layout |
| OrderActions.tsx | Component |
| OrderDetailsDialog.tsx | Dialog / Modal UI |
| OrderFilters.tsx | Component |
| OrderItem.tsx | Component |
| OrderList.tsx | List view |
| OrderStats.tsx | Component |
| OrderStatus.tsx | Component |
| WeightQuantityDialog.tsx | Dialog / Modal UI |

### components/Orders/OrdersView\n
| File | Type/Purpose |
|------|--------------|
| OrdersView.tsx | Component |
| SyncOrdersButton.tsx | Button element |

### components/Orders/POS\n
| File | Type/Purpose |
|------|--------------|
| CustomItemDialog.tsx | Dialog / Modal UI |
| POSHeader.tsx | Component |
| POSMode.tsx | Component |
| PaymentDialog.tsx | Dialog / Modal UI |

### components/Orders/POS/PaymentComponents\n
| File | Type/Purpose |
|------|--------------|
| OrderConfirmation.tsx | Component |
| OrderEditor.tsx | Component |
| PaymentMethodSelector.tsx | Component |
| PaymentSuccessStep.tsx | Component |
| QRPaymentStep.tsx | Component |
| index.ts | Component |
| types.ts | Component |

### components/Orders/POS/PaymentDialog\n
| File | Type/Purpose |
|------|--------------|
| index.ts | Component |
| types.ts | Component |

### components/Orders/POS/PaymentDialog/steps\n
| File | Type/Purpose |
|------|--------------|
| ConfirmStep.tsx | Component |
| EditOrderStep.tsx | Component |
| PaymentMethodStep.tsx | Component |
| QRPaymentStep.tsx | Component |
| SuccessStep.tsx | Component |
| index.ts | Component |

### components/Orders/POS/PaymentDialog/utils\n
| File | Type/Purpose |
|------|--------------|
| paymentCalculations.ts | Component |

### components/Orders/POS/payment\n
| File | Type/Purpose |
|------|--------------|
| CustomerDetailsForm.tsx | Form component |
| OrderItemsEditor.tsx | Component |
| PaymentMethodSelector.tsx | Component |
| PromotionApplicator.tsx | Component |
| index.ts | Component |

### components/Orders/Payment\n
| File | Type/Purpose |
|------|--------------|
| OrderPayment.tsx | Component |
| POSPayment.tsx | Component |

### components/Platform\n
| File | Type/Purpose |
|------|--------------|
| AdminTemplateReview.tsx | Component |

### components/Promotions\n
| File | Type/Purpose |
|------|--------------|
| PromotionsManager.tsx | Component |

### components/QR\n
| File | Type/Purpose |
|------|--------------|
| QRCodeManagement.tsx | Component |

### components/QSR\n
| File | Type/Purpose |
|------|--------------|
| CategoryList.tsx | List view |
| MenuItemsGrid.tsx | Grid view layout |
| OrderHistory.tsx | Component |
| OrderSummary.tsx | Component |
| QSRActiveOrdersDrawer.tsx | Component |
| QSRCartBottomSheet.tsx | Component |
| QSRCustomItemDialog.tsx | Dialog / Modal UI |
| QSRMenuGrid.tsx | Grid view layout |
| QSRModeSelector.tsx | Component |
| QSROrderPad.tsx | Component |
| QSRPastOrdersDrawer.tsx | Component |
| QSRPosMain.tsx | Component |
| QSRTableGrid.tsx | Grid view layout |
| ToastNotification.tsx | Component |

### components/QuickServe\n
| File | Type/Purpose |
|------|--------------|
| DailySummaryDialog.tsx | Dialog / Modal UI |
| QSActiveOrders.tsx | Component |
| QSCustomItemDialog.tsx | Dialog / Modal UI |
| QSCustomerInput.tsx | Component |
| QSHeldOrdersDrawer.tsx | Component |
| QSMenuGrid.tsx | Grid view layout |
| QSOrderHistory.tsx | Component |
| QSOrderPanel.tsx | Component |
| QSPaymentSheet.tsx | Component |

### components/Recipes\n
| File | Type/Purpose |
|------|--------------|
| BatchProductionManager.tsx | Component |
| MenuEngineering.tsx | Component |
| RecipeCostingCard.tsx | Card UI component |
| RecipeDialog.tsx | Dialog / Modal UI |
| RecipeList.tsx | List view |

### components/Reporting\n
| File | Type/Purpose |
|------|--------------|
| AdvancedAnalytics.tsx | Component |
| CustomReportBuilder.tsx | Component |
| DefaultReports.tsx | Component |
| ExportCenter.tsx | Component |
| NCOrdersReport.tsx | Component |
| ReportHelpDialog.tsx | Dialog / Modal UI |
| ReportViewer.tsx | Component |

### components/Reports\n
| File | Type/Purpose |
|------|--------------|
| ArrivalsAndDeparturesReport.tsx | Component |

### components/Reservations\n
| File | Type/Purpose |
|------|--------------|
| ReservationConfirmations.tsx | Component |
| RoomReservationsList.tsx | List view |
| TableAvailabilityHeatMap.tsx | Component |
| UnifiedReservationsList.tsx | List view |
| WaitlistManager.tsx | Component |

### components/Revenue\n
| File | Type/Purpose |
|------|--------------|
| AddChannelDialog.tsx | Dialog / Modal UI |
| AdvancedChannelSync.tsx | Component |
| AdvancedIntegration.tsx | Component |
| BookingConsolidation.tsx | Component |
| ChannelIntegrationManager.tsx | Component |
| ChannelManagementDashboard.tsx | Dashboard wrapper/view |
| ChannelManagementGuide.tsx | Component |
| DynamicPricingEngine.tsx | Component |
| EditChannelDialog.tsx | Dialog / Modal UI |
| EnhancedRateManagement.tsx | Component |
| HotelRevenueManager.tsx | Component |
| InventoryAllocation.tsx | Component |
| MetaSearchIntegration.tsx | Component |
| PoolInventoryManagement.tsx | Component |
| PriceManagement.tsx | Component |
| RevenueManagementDashboard.tsx | Dashboard wrapper/view |
| RoomSpecificRateManager.tsx | Component |

### components/RoleManagement\n
| File | Type/Purpose |
|------|--------------|
| CreateRoleDialog.tsx | Dialog / Modal UI |
| DeleteRoleDialog.tsx | Dialog / Modal UI |
| EditRoleDialog.tsx | Dialog / Modal UI |
| RoleManagementDashboard.tsx | Dashboard wrapper/view |

### components/Rooms\n
| File | Type/Purpose |
|------|--------------|
| BillingHistory.tsx | Component |
| Checkbox.tsx | Component |
| Label.tsx | Component |
| PromotionsManager.tsx | Component |
| ReservationDialog.tsx | Dialog / Modal UI |
| RoomCard.tsx | Card UI component |
| RoomCheckout.tsx | Component |
| RoomDialog.tsx | Dialog / Modal UI |
| RoomMoveDialog.tsx | Dialog / Modal UI |
| RoomOrderForm.tsx | Form component |
| RoomOrdersDialog.tsx | Dialog / Modal UI |
| RoomsList.tsx | List view |
| SpecialOccasions.tsx | Component |
| SplitBillingDialog.tsx | Dialog / Modal UI |
| WalkInCheckInDialog.tsx | Dialog / Modal UI |

### components/Rooms/AvailabilityCalendar\n
| File | Type/Purpose |
|------|--------------|
| AvailabilityCalendarGrid.tsx | Grid view layout |
| CalendarCell.tsx | Component |
| CalendarLegend.tsx | Component |
| index.tsx | Component |

### components/Rooms/CheckoutComponents\n
| File | Type/Purpose |
|------|--------------|
| AdditionalChargesSection.tsx | Component |
| BillPrint.tsx | Component |
| CheckoutSuccessDialog.tsx | Dialog / Modal UI |
| DiscountSection.tsx | Component |
| FoodOrdersList.tsx | List view |
| PaymentMethodSelector.tsx | Component |
| PrintBillButton.tsx | Button element |
| PromoCodeSection.tsx | Component |
| QRPaymentDialog.tsx | Dialog / Modal UI |
| RoomChargesTable.tsx | Component |
| RoomCheckout.tsx | Component |
| RoomCheckoutPage.tsx | Component |
| RoomDetailsCard.tsx | Card UI component |
| ServiceChargeSection.tsx | Component |

### components/Rooms/CorporateBooking\n
| File | Type/Purpose |
|------|--------------|
| CorporateBookingSection.tsx | Component |
| index.tsx | Component |

### components/Rooms/GroupReservation\n
| File | Type/Purpose |
|------|--------------|
| GroupBadge.tsx | Component |
| GroupReservationDialog.tsx | Dialog / Modal UI |
| RoomSelector.tsx | Component |
| index.tsx | Component |

### components/Rooms/GuestLoyalty\n
| File | Type/Purpose |
|------|--------------|
| GuestTierBadge.tsx | Component |
| index.tsx | Component |

### components/Rooms/GuestPreferences\n
| File | Type/Purpose |
|------|--------------|
| GuestPreferencesEditor.tsx | Component |
| PreferenceChips.tsx | Component |
| index.tsx | Component |

### components/Rooms/OccupancyForecast\n
| File | Type/Purpose |
|------|--------------|
| OccupancyChart.tsx | Component |
| index.tsx | Component |

### components/Rooms/OrderForm\n
| File | Type/Purpose |
|------|--------------|
| MenuFilter.tsx | Component |
| MenuItemsList.tsx | List view |
| OrderSummary.tsx | Component |
| RoomOrderForm.tsx | Form component |

### components/Rooms/PromotionComponents\n
| File | Type/Purpose |
|------|--------------|
| DateFilter.tsx | Component |

### components/Root Components\n
| File | Type/Purpose |
|------|--------------|
| SubscriptionCheck.tsx | Component |
| SubscriptionPlans.tsx | Component |
| ThemeToggle.tsx | Component |
| UnifiedReservationDialog.tsx | Dialog / Modal UI |
| UpdateNotification.tsx | Component |

### components/Security\n
| File | Type/Purpose |
|------|--------------|
| AuditTrail.tsx | Component |
| BackupRecovery.tsx | Component |
| GDPRCompliance.tsx | Component |

### components/Settings\n
| File | Type/Purpose |
|------|--------------|
| AuditLogTab.tsx | Component |
| DailyReportScheduleSettings.tsx | Scheduled daily report email configuration |
| LocationSettingsTab.tsx | Component |
| PaymentSettingsTab.tsx | Component |
| QRSettingsTab.tsx | Component |
| SystemConfigurationTab.tsx | Component |

### components/Shared\n
| File | Type/Purpose |
|------|--------------|
| ErrorBoundary.tsx | Component |
| PaymentMethodSelector.tsx | Component |
| UpgradeDialog.tsx | Dialog / Modal UI |

### components/Staff\n
| File | Type/Purpose |
|------|--------------|
| AutoClockInPrompt.tsx | Component |
| DocumentUpload.tsx | Component |
| DocumentUploadInline.tsx | Component |
| LeaveRequestDialog.tsx | Dialog / Modal UI |
| MultipleDocumentUpload.tsx | Component |
| ShiftManagementContent.tsx | Component |
| StaffDetail.tsx | Component |
| StaffDialog.tsx | Dialog / Modal UI |
| StaffLeaveManager.tsx | Component |
| StaffList.tsx | List view |
| StaffTaskDashboard.tsx | Dashboard wrapper/view |
| TimeClockDialog.tsx | Dialog / Modal UI |
| TodayShiftWidget.tsx | Component |

### components/Staff/ProfileComponents\n
| File | Type/Purpose |
|------|--------------|
| LeaveTab.tsx | Component |
| PermissionsTab.tsx | Component |
| ProfileTab.tsx | Component |
| ScheduleTab.tsx | Component |
| StaffHeader.tsx | Component |
| StaffStatusDialog.tsx | Dialog / Modal UI |
| TimeClockTab.tsx | Component |

### components/Staff/utilities\n
| File | Type/Purpose |
|------|--------------|
| staffUtils.ts | Component |

### components/Subscription\n
| File | Type/Purpose |
|------|--------------|
| CurrentPlanBanner.tsx | Component |
| PlanCard.tsx | Card UI component |
| SubscriptionPage.tsx | Component |

### components/Suppliers\n
| File | Type/Purpose |
|------|--------------|
| SupplierPerformance.tsx | Component |

### components/Tables\n
| File | Type/Purpose |
|------|--------------|
| ReservationDialog.tsx | Dialog / Modal UI |
| ReservationsList.tsx | List view |
| TableCard.tsx | Card UI component |
| TableDialog.tsx | Dialog / Modal UI |

### components/UserManagement\n
| File | Type/Purpose |
|------|--------------|
| CreateUserDialog.tsx | Dialog / Modal UI |
| EditUserDialog.tsx | Dialog / Modal UI |
| PermissionManager.tsx | Component |
| UserList.tsx | List view |
| UserManagementDashboard.tsx | Dashboard wrapper/view |

### components/ui\n
| File | Type/Purpose |
|------|--------------|
| OfflineBanner.tsx | Component |
| accordion.tsx | Component |
| alert-dialog.tsx | Component |
| alert.tsx | Component |
| aspect-ratio.tsx | Component |
| avatar.tsx | Component |
| badge.tsx | Component |
| breadcrumb.tsx | Component |
| button.tsx | Component |
| calendar.tsx | Component |
| card.tsx | Component |
| carousel.tsx | Component |
| chart.tsx | Component |
| checkbox.tsx | Component |
| collapsible.tsx | Component |
| command.tsx | Component |
| context-menu.tsx | Component |
| currency-display.tsx | Component |
| custom-badge.tsx | Component |
| data-table-pagination.tsx | Component |
| date-picker-with-range.tsx | Component |
| dialog.tsx | Component |
| drawer.tsx | Component |
| dropdown-menu.tsx | Component |
| enhanced-chart.tsx | Component |
| enhanced-dialog.tsx | Component |
| enhanced-form.tsx | Component |
| enhanced-skeleton.tsx | Component |
| error-boundary.tsx | Component |
| form-fields.tsx | Component |
| form.tsx | Component |
| highcharts.tsx | Component |
| hover-card.tsx | Component |
| input-otp.tsx | Component |
| input.tsx | Component |
| label.tsx | Component |
| lazy-components.tsx | Component |
| lazy-image.tsx | Component |
| loading-skeleton.tsx | Component |
| loading.tsx | Component |
| menubar.tsx | Component |
| mobile-card.tsx | Component |
| mobile-navigation.tsx | Component |
| navigation-menu.tsx | Component |
| page-loader.tsx | Component |
| pagination.tsx | Component |
| popover.tsx | Component |
| progress.tsx | Component |
| quick-actions-toolbar.tsx | Component |
| radio-group.tsx | Component |
| resizable.tsx | Component |
| role-badge.tsx | Component |
| scroll-area.tsx | Component |
| select.tsx | Component |
| separator.tsx | Component |
| sheet.tsx | Component |
| sidebar.tsx | Component |
| skeleton.tsx | Component |
| slider.tsx | Component |
| sonner.tsx | Component |
| standardized-button.tsx | Component |
| standardized-card.tsx | Component |
| standardized-layout.tsx | Component |
| standardized-modal.tsx | Component |
| switch.tsx | Component |
| table.tsx | Component |
| tabs.tsx | Component |
| textarea.tsx | Component |
| theme-provider.tsx | Component |
| toast.tsx | Component |
| toaster.tsx | Component |
| toggle-group.tsx | Component |
| toggle.tsx | Component |
| tooltip.tsx | Component |
| universal-chart.tsx | Component |
| use-toast.ts | Component |

### components/ui/charts\n
| File | Type/Purpose |
|------|--------------|
| HighchartsWrapper.tsx | Component |
| index.ts | Component |


---

## Hooks Reference

| Hook | File | Purpose |
|------|------|---------|
| `useAuth` | `hooks/useAuth.ts` | Auth state, user, role checks, permissions |
| `useSubscriptionAccess` | `hooks/useSubscriptionAccess.ts` | Check subscription plan access per component |
| `useRealtimeSubscription` | `hooks/useRealtimeSubscription.tsx` | Supabase realtime → auto-invalidate query |
| `useCurrencyContext` | `contexts/CurrencyContext.tsx` | Currency symbol (₹, $, etc.) |
| `useRestaurantId` | `hooks/useRestaurantId.ts` | Current restaurant ID + name |
| `useIsMobile` | `hooks/use-mobile.ts` | Responsive breakpoint |
| `usePagination` | `hooks/usePagination.ts` | Client-side pagination |
| `useToast` | `hooks/use-toast.ts` | Toast notifications |

---

## Type Definitions

| File | Key Types |
|------|-----------|
| `types/orders.ts` | `Order`, `OrderItem`, `TableData` |
| `types/auth.ts` | `Permission`, user types |
| `integrations/supabase/types.ts` | Full Supabase DB schema (auto-generated, 8000+ lines) |

---

## Subscription Component Mapping

Routes map to subscription component names for access control:

| Component Name | Routes |
|---------------|--------|
| `dashboard` | `/` |
| `pos` | `/pos` |
| `qsr-pos` | `/qsr-pos` |
| `quickserve` | `/quickserve-pos` |
| `orders` | `/orders`, `/nc-orders` |
| `kitchen` | `/kitchen` |
| `menu` | `/menu`, `/recipes` |
| `tables` | `/tables` |
| `inventory` | `/inventory` |
| `staff` | `/staff`, `/shift-management` |
| `customers` | `/customers` |
| `marketing` | `/marketing` |
| `users_permissions` | `/user-management`, `/role-management`, `/permission-management` |
| `reservations` | `/reservations`, `/channel-management` |
| `rooms` | `/rooms`, `/housekeeping` |
| `reports` | `/analytics`, `/reports` |
| `financial` | `/financial` |
| `expenses` | `/expenses` |
| `suppliers` | `/suppliers` |
| `ai` | `/ai` |
| `settings` | `/settings`, `/security` |
| `franchise` | `/franchise` |
