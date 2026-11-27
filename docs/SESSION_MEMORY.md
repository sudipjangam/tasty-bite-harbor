# Session & Codebase Fast Memory Index

> Read this file first in any session (~150 lines) instead of scanning full files or legacy docs.
> Update key line numbers only when structural edits shift sections significantly.

---

## 1. Verified Schema, RLS & Platform Invariants (Do Not Re-Check Unless Migration Added)

- **`kitchen_orders` columns:** Has `table_number` (`text | null`), **`order_id` (`uuid | null`)**, `item_completion_status` (`jsonb`), `items` (`jsonb`), `status`, `priority`, `source`, `restaurant_id` (`nullable`), `nc_reason`. **NO `table_id` column** in Supabase schema — never add `table_id` to `.select()`.
- **RLS `orders` vs `kitchen_orders`:** Identical franchise-aware policies (`20260808_fix_franchise_rls_complete.sql`): `restaurant_id = ANY(public.get_user_accessible_restaurants(auth.uid())) OR public.is_platform_admin()`.
- **Realtime `DELETE` (`kitchen_orders`):** `supabase/migrations/20261122150733_prune_realtime_publication_tables.sql` L33 sets `REPLICA IDENTITY FULL` so `DELETE` carries `restaurant_id` for filtered channels.
- **Staff clock table:** Production table is **`staff_time_clock`** (edge functions `auto-clock-out`, `record-clock-entry`, `useAutoClockOut`), NOT `time_clock_entries`. Migration `20261127000001_fix_check_stale_clock_ins_table.sql` fixes `check_stale_clock_ins()`.
- **`restaurants` timezone:** No `timezone` column on `restaurants` table; stored on `restaurant_settings.timezone` (default `'UTC'`) and `scheduled_report_settings.timezone` (default `'Asia/Kolkata'`).
- **Loyalty RPCs:** `add_loyalty_transaction` inserts logs only (does NOT update `customers.loyalty_points` and has no unique `source_id` index). Offline `loyalty_redemption` in `syncManager.ts` updates `customers` then inserts `loyalty_transactions`.
- **Android permissions (`targetSdk = 36`):** Web (`<input type="file">`) & Flutter (`image_picker: ^1.1.2`) use Android Photo Picker / temporary URI grants. **Do NOT add `READ_MEDIA_IMAGES`** to `AndroidManifest.xml`.
- **Currency provider:** Top-level `<CurrencyProvider>` in `App.tsx` wraps all routes (including `/franchise/*` and demo mode) and defaults safely when `restaurantId` is null.

---

## 2. Monolith Map (Jump Directly to Line Ranges)

| File (Lines) | Key Sections & Line Ranges |
| --- | --- |
| `src/components/QSR/QSRPosMain.tsx` (~3195) | Refs `L120-150` · `todaysRevenue` `L340-430` · `handleModeChange` `L478-505` · `handleSelectTable` `L510-630` · `handleToggleItemCompletion` `L775-860` · `handleSendToKitchen` `L875-1410` · `handleHoldOrder` `L1425-1730` · `handleRecallOrder` `L1732-1800` · `handleProceedToPayment` `L1800-1865` · `handlePaymentSuccess` + `persistPrePayOffline` `L1875-2645` · `executeDeleteOrder` `L2665-2750` · `AdaptivePaymentDialog` props `L3170-3195` |
| `src/components/Orders/POS/PaymentDialog.tsx` (~2965) | Refs/reset `L118-265` · Legacy queue drain `L275-350` · Queries (`restaurant-info-pos`, `payment-settings-pos`) `L355-460` · `checkForActiveReservation` `L558-605` · `fetchOrder` `L610-650` · `generateQRCode` `L800-830` · `handleMarkPaymentPending` `L1080-1185` · `handleQuickPay` (offline `L1275-1505`, online `L1515-1735`, UI `L1850-1870`) |
| `src/components/Orders/POS/MobilePaymentDialog.tsx` (~2730) | `calcTotal` `L94-105` · Refs/queries `L325-445` · `loadOrderDetails` `L710-780` · Reset/attempt invalidation `L785-860` · `handleMarkPaymentPending` + `handlePrint` `L965-1125` · `processPayment` (offline `L1290-1490`, online `L1491-1640`) · `handleSplitPay` `L1640-1670` · Discount UI `L2020-2070` · Success UI `L2450-2550` |
| `src/components/QuickServe/QSPaymentSheet.tsx` (~2508) | Queries & `alreadyPaid` `L250-360` · `getUpiLink` & QR `L438-470` · `handleSendWhatsAppBill` `L509-725` · `handleCloseSuccess` `L725-755` · `enqueueQuickServeOfflinePayment` `L765-1170` · `handlePay` (edit `L1240-1420`, new `L1425-1700`) · `handlePaySplit` `L1720-2030` · Mark as Paid button `L2155-2265` |
| `src/components/Orders/ActiveOrdersList.tsx` (~1490) | Tokens & `fetchOrderDiscounts` `L160-245` · `scheduleDiscountUpdate` / `scheduleNewOrderEnrichment` `L246-335` · `reconcileSnapshotWithEvents` `L336-465` · `loadOrders` & profile `L466-610` · Realtime channel & buffering `L612-860` · `filteredOrders` `L905-925` · `onOrderUpdated` `L1444-1495` |
| `src/components/QuickServe/DailySummaryDialog.tsx` (~1557) | `useQuery` offline/merge `L134-345` · `mainOrders`/`kitchen_orders` fetch `L345-430` · `topItems`/`orderTypeBreakdown`/`syncedContributions` `L590-745` |
| `src/components/QuickServe/QSActiveOrders.tsx` (~1175) | `useQuery` + `mergeOrders` `L178-325` · Coalesced realtime `L357-420` · `upsertQuickServeLocalMirror` `L430-495` · Toggle/status mutations `L500-715` |
| `src/components/QuickServe/QSOrderHistory.tsx` (~488) | `useQuery` + `mergeOrders` `L90-220` · Reprint `handlePrintHistoryOrder` `L220-290` |
| `src/pages/QuickServePOS.tsx` (~1800) | `todaysRevenue` + `readCachedRevenue` `L264-375` · Edit-order offline/online `L770-1135` · `setEditingOrderPaidAmount` `L1625-1645` · Revenue UI pill `L1720` |
| `src/utils/syncManager.ts` (~805) | `getPendingCount` `L61-65` · `removeQueuedWritesForOrder` `L75-115` · `flushQueue` `L125-250` · `pruneSyncedLocalOrders` `L252-292` · `replayWrite` (`order`, `pos_transaction`, `room_food_order`, `loyalty_redemption`) `L412-630` · `replayWithConflictCheck` `L685-760` |
| `src/hooks/useActiveKitchenOrders.tsx` (~935) | `loadSnapshot`/`saveSnapshot` `L38-85` · `useQuery` `L126-345` · Realtime `L355-417` · `buildLocalMirror`/`commitMirrorAndEnqueue` `L438-515` · `getOrderById` `L516-560` · `toggleItemCompletion`/`updateOrderItems`/`handlePriorityChange` `L565-815` |
| `src/hooks/usePastOrders.tsx` (~458) | `loadPastSnapshot` `L47-67` · `useQuery` `L130-335` · `getOrderById` `L375-425` |
| `src/hooks/useQSRTables.tsx` (~398) | `useQuery` `tables` & `kitchen_orders` `L24-288` · `updateTableStatus` `L356-390` |

---

## 3. Fast Validation Commands

- **During fixes (fast):** `npx vitest run <specific-test-file>`
- **Only after final wave:** `npx tsc --noEmit` then `npx vitest run` then `npm run build`
- **Legacy detailed docs (on-demand only):** `docs/CODEBASE_CATALOG.md`, `docs/COMPONENTS_DETAILS.md`, `docs/FILE_REFERENCE_MAP.md`, `docs/franchise_migration_analysis.md`.
