# Tasty Bite Harbor - Codebase Catalog

Last updated: 2026-06-04

## 1. Route and Permission Matrix

Primary route permissions from `src/components/Auth/AppRoutes.tsx`.

| Route | Guard |
|---|---|
| `/` | `dashboard.view` (fallback staff landing) |
| `/orders` | `orders.view` |
| `/pos` | `orders.view` |
| `/qsr-pos` | `orders.view` |
| `/quickserve-pos` | `orders.view` |
| `/menu` | `menu.view` |
| `/recipes` | `menu.view` |
| `/staff` | `staff.view` |
| `/shift-management` | `staff.update` |
| `/analytics` | `analytics.view` |
| `/financial` | `financial.view` |
| `/settings` | `settings.view` |
| `/inventory` | `inventory.view` |
| `/tables` | `tables.view` |
| `/rooms` | `rooms.view` |
| `/housekeeping` | `housekeeping.view` |
| `/reservations` | `reservations.view` |
| `/customers` | `customers.view` |
| `/suppliers` | `inventory.view` |
| `/expenses` | `financial.view` |
| `/ai` | `dashboard.view` |
| `/channel-management` | `analytics.view` |
| `/kitchen` | `kitchen.view` |
| `/security` | `audit.view` |
| `/user-management` | `users.manage` |
| `/admin` | `users.manage` |
| `/role-management` | `users.manage` |
| `/permission-management` | `staff.manage_roles` |
| `/marketing` | `customers.view` |
| `/reports` | `analytics.view` |
| `/nc-orders` | no explicit permission guard |
| `/email-tester` | admin role only |
| `/platform/*` | admin role only |
| `/daily-summary-history` | no explicit permission guard |
| `/franchise` | franchise roles (`owner`/`admin`/`member`/`viewer`) |
| `/franchise/branches` | franchise roles (`owner`/`admin`) |
| `/franchise/team` | franchise roles (`owner`/`admin`) |
| `/franchise/menu-sync` | franchise roles (`owner`/`admin`) |
| `/franchise/orders` | franchise roles (`owner`/`admin`/`member`/`viewer`) |
| `/franchise/inventory` | franchise roles (`owner`/`admin`/`member`/`viewer`) |
| `/franchise/staff` | franchise roles (`owner`/`admin`/`member`/`viewer`) |
| `/franchise/pnl` | franchise roles (`owner`/`admin`/`member`/`viewer`) |
| `/franchise/settings` | franchise roles (`owner`/`admin`) |


## 2. Pages Inventory (`src/pages`)

- `AdminPanel.tsx`
- `AI.tsx`
- `Analytics.tsx`
- `Auth.tsx`
- `AuthCallback.tsx`
- `ChannelManagement.tsx`
- `CRM.tsx`
- `CustomerOrder.tsx`
- `Customers.tsx`
- `DailySummaryHistory.tsx`
- `Dashboard.tsx`
- `DeleteAccount.tsx`
- `EnhancedDashboard.tsx`
- `Expenses.tsx`
- `Financial.tsx`
- `Franchise/BranchManagement.tsx`
- `Franchise/CrossBranchInventory.tsx`
- `Franchise/CrossBranchOrders.tsx`
- `Franchise/CrossBranchPnL.tsx`
- `Franchise/CrossBranchStaff.tsx`
- `Franchise/FranchiseDashboard.tsx`
- `Franchise/FranchiseSettings.tsx`
- `Franchise/MenuSync.tsx`
- `Franchise/TeamManagement.tsx`
- `Housekeeping.tsx`
- `Index.tsx`
- `Inventory.tsx`
- `InvoicePage.tsx`
- `Kitchen.tsx`
- `LandingWebsite.tsx`
- `Marketing.tsx`
- `Menu.tsx`
- `NCOrders.tsx`
- `NotFound.tsx`
- `Orders.tsx`
- `PermissionManagement.tsx`
- `POS.tsx`
- `PrivacyPolicy.tsx`
- `PublicBillPage.tsx`
- `PublicEnrollmentPage.tsx`
- `PublicTruckPage.tsx`
- `QSRPos.tsx`
- `QuickServePOS.tsx`
- `RecipeManagement.tsx`
- `Reports.tsx`
- `Reservations.tsx`
- `RoleManagement.tsx`
- `Rooms.tsx`
- `Security.tsx`
- `Settings.tsx`
- `ShiftManagement.tsx`
- `Staff.tsx`
- `Suppliers.tsx`
- `Tables.tsx`
- `UserManagement.tsx`

## 3. Hook Inventory (`src/hooks`)

- `use-mobile.tsx`
- `use-toast.ts`
- `useAccessControl.tsx`
- `useActiveKitchenOrders.tsx`
- `useAnalyticsData.tsx`
- `useAuditLog.ts`
- `useAuth.tsx`
- `useAuthState.tsx`
- `useAutoClockOut.tsx`
- `useAvailabilityCalendar.tsx`
- `useBillSharing.ts`
- `useBusinessDashboardData.tsx`
- `useCategories.tsx`
- `useChannelManagement.tsx`
- `useChatWithApi.tsx`
- `useCRMSync.ts`
- `useCurrency.tsx`
- `useCurrentStaff.tsx`
- `useCustomerData.tsx`
- `useDebounce.ts`
- `useEmail.ts`
- `useEnhancedCustomerData.tsx`
- `useErrorMonitoring.tsx`
- `useExpenseData.tsx`
- `useFeatureGate.ts`
- `useFinancialData.tsx`
- `useFinancialTabAccess.ts`
- `useFinancialTrends.tsx`
- `useFranchise` (defined in `src/contexts/FranchiseContext.tsx`)
- `useGroupReservations.tsx`
- `useGSTData.ts`
- `useGuestLoyalty.tsx`
- `useGuestManagement.tsx`
- `useGuestPreferences.tsx`
- `useHeldOrders.ts`
- `useHousekeeping.tsx`
- `useImageOptimization.tsx`
- `useLostFound.tsx`
- `useMarketingData.tsx`
- `useNCMetrics.ts`
- `useNightAudit.tsx`
- `useOfflineCache.ts`
- `usePagination.tsx`
- `usePastOrders.tsx`
- `usePaymentNotification.ts`
- `usePaymentStatus.ts`
- `usePerformanceMetrics.tsx`
- `usePlanType.ts`
- `useProfitLoss.tsx`
- `useQSRMenuItems.tsx`
- `useQSRTables.tsx`
- `useRealtimeAnalytics.tsx`
- `useRealTimeBusinessData.tsx`
- `useRealtimeSubscription.tsx`
- `useRecipes.tsx`
- `useRefetchOnNavigation.tsx`
- `useReportsData.tsx`
- `useReservationDragDrop.tsx`
- `useReservations.tsx`
- `useRestaurantId.tsx`
- `useRevenueManagement.tsx`
- `useRoomMove.tsx`
- `useRooms.tsx`
- `useSimpleAuth.tsx`
- `useSpeechAnnouncement.ts`
- `useSplitBilling.tsx`
- `useStatsData.tsx`
- `useSubscription.ts`
- `useSubscriptionAccess.ts`
- `useTableAvailability.tsx`
- `useTables.tsx`
- `useTheme.tsx`
- `useTrendingItems.ts`
- `useWaitlist.tsx`
- `useWhatsAppCampaigns.tsx`
- `useWhatsAppTemplates.tsx`
- `useWidgetPreferences.ts`

## 4. Component Domain Inventory (`src/components` directories)

- `Admin`
- `AI`
- `Analytics`
- `Auth`
- `Branding`
- `Chatbot`
- `CRM`
- `CustomerOrder`
- `Customers`
- `Dashboard`
- `Email`
- `Expenses`
- `Financial`
- `Franchise`
- `GuestExperience`
- `Guests`
- `Help`
- `Housekeeping`
- `Inventory`
- `Kitchen`
- `Landing`
- `Layout`
- `LostFound`
- `Marketing`
- `Menu`
- `NC`
- `NightAudit`
- `Notifications`
- `Orders`
- `Platform`
- `Promotions`
- `QR`
- `QSR`
- `QuickServe`
- `Recipes`
- `Reporting`
- `Reports`
- `Reservations`
- `Revenue`
- `RoleManagement`
- `Rooms`
- `Security`
- `Settings`
- `Shared`
- `Staff`
- `Subscription`
- `Suppliers`
- `Tables`
- `ui`
- `UserManagement`

## 5. Edge Function Inventory (`supabase/functions`)

- `_shared`
- `auto-clock-out`
- `backup-restore`
- `chat-with-gemini`
- `check-low-stock`
- `check-missed-clocks`
- `check-paytm-status`
- `create-msg91-template`
- `create-payment-qr`
- `create-paytm-qr`
- `create-razorpay-order`
- `customer-menu-api`
- `deduct-inventory-on-prep`
- `enroll-customer`
- `extract-bill-details`
- `find-active-reservation`
- `forgot-password`
- `freeimage-upload`
- `generate-qr-code`
- `get-user-components`
- `google-drive-upload`
- `log-promotion-usage`
- `migrate-roles-data`
- `paytm-webhook`
- `process-razorpay-refund`
- `record-clock-entry`
- `reset-password`
- `role-management`
- `send-email`
- `send-email-bill`
- `send-inquiry`
- `send-msg91-whatsapp`
- `send-reservation-confirmation`
- `send-reservation-reminder`
- `send-subscription-confirmation`
- `send-whatsapp`
- `send-whatsapp-bill`
- `send-whatsapp-cloud`
- `submit-qr-order`
- `sync-channels`
- `sync-msg91-template-status`
- `upload-image`
- `user-management`
- `validate-promo-code`
- `verify-razorpay-payment`
- `whatsapp-webhook`

## 6. Database Table Inventory (from `src/integrations/supabase/types.ts`)

- `app_components`
- `audit_logs`
- `backup_settings`
- `backups`
- `batch_productions`
- `booking_channels`
- `budget_line_items`
- `budgets`
- `categories`
- `channel_inventory`
- `channel_rate_rules`
- `channel_restrictions`
- `channel_room_mapping`
- `chart_of_accounts`
- `check_ins`
- `competitor_pricing`
- `component_permissions`
- `component_table_mapping`
- `currencies`
- `customer_activities`
- `customer_notes`
- `customer_order_sessions`
- `customers`
- `daily_revenue_stats`
- `daily_summary_reports`
- `expense_categories`
- `expenses`
- `financial_reports`
- `guest_feedback`
- `guest_loyalty`
- `guest_preferences`
- `guest_profiles`
- `inventory_alerts`
- `inventory_items`
- `inventory_transactions`
- `invoice_line_items`
- `invoices`
- `journal_entries`
- `journal_entry_lines`
- `kitchen_orders`
- `lost_found_items`
- `loyalty_enrollments`
- `loyalty_programs`
- `loyalty_redemptions`
- `loyalty_rewards`
- `loyalty_tiers`
- `loyalty_transactions`
- `menu_item_variants`
- `menu_items`
- `monthly_budgets`
- `night_audit_logs`
- `operational_costs`
- `organization_members`
- `organization_subscriptions`
- `organizations`
- `orders`
- `orders_unified`
- `orders_unified_backup_20260111_000000`
- `ota_bookings`
- `ota_credentials`
- `owner_notifications`
- `payment_methods`
- `payment_settings`
- `payment_transactions`
- `payments`
- `pool_inventory`
- `pos_transactions`
- `pricing_rules`
- `profiles`
- `promotion_campaigns`
- `purchase_order_items`
- `purchase_orders`
- `qr_codes`
- `rate_parity_checks`
- `rate_plans`
- `recipe_ingredients`
- `recipes`
- `reservations`
- `restaurant_operating_hours`
- `restaurant_settings`
- `restaurant_subscriptions`
- `restaurant_tables`
- `restaurants`
- `revenue_metrics`
- `role_components`
- `roles`
- `room_amenities`
- `room_amenity_inventory`
- `room_billings`
- `room_cleaning_schedules`
- `room_food_orders`
- `room_maintenance_requests`
- `room_moves`
- `room_waitlist`
- `rooms`
- `sent_promotions`
- `shared_bills`
- `shifts`
- `split_bill_portions`
- `split_bills`
- `staff`
- `staff_documents`
- `staff_leave_balances`
- `staff_leave_requests`
- `staff_leave_types`
- `staff_leaves`
- `staff_notifications`
- `staff_roles`
- `staff_shift_assignments`
- `staff_shifts`
- `staff_time_clock`
- `subscription_plans`
- `supplier_order_items`
- `supplier_orders`
- `suppliers`
- `sync_logs`
- `sync_retry_queue`
- `table_availability_slots`
- `table_reservations`
- `tax_configurations`
- `user_roles`
- `waitlist`
- `whatsapp_campaign_sends`
- `whatsapp_templates`

## 7. Recent Migration Themes

Recent migration files (latest set) show active work in:
- QR ordering
- NC tracking (Migrated to premium tab inside `/reports` component with full filtering/sorting and 3D glassmorphic UI)
- Paytm integration
- critical RLS fixes
- WhatsApp campaign/template support
- inventory parity and deduplication
- granular feature permissions
- POS customer mapping
- Franchise Management (multi-branch tenancy, central menu sync, roaming staff, cross-branch orders/inventory/PnL, organization and subscription tables, RLS isolation bypass helpers)


