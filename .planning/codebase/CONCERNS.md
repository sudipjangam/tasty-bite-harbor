# Codebase Concerns

**Analysis Date:** 2026-09-12

## Tech Debt

**1. Massive Monolithic Files & Complex POS State:**
- **Issue:** Several critical components and type definitions exceed recommended maintainability sizes. For example:
  - `src/integrations/supabase/types.ts`: >8,200 lines of generated schema definitions.
  - `src/components/Orders/POS/POSMode.tsx`: High-complexity state machine managing tables, active order items, payment sheets, and discount calculations in a single component.
  - `src/components/Kitchen/KitchenDisplay.tsx`: Dense rendering logic mixing audio alerts, card animation, station routing, and preparation timing.
- **Why:** Rapid feature iteration to deliver competitive POS, KDS, and restaurant management capabilities.
- **Impact:** Elevated cognitive load for new developers, risk of unintended regression when editing shared state, and slow TypeScript language server response times.
- **Fix approach:** Decompose monolithic POS views into smaller presenter subcomponents (`TableSelector`, `CartSummary`, `DiscountDialog`, `PaymentActionSheet`) and isolate domain logic inside custom state hooks.

**2. Dual Order Schema Legacy (`orders` vs `orders_unified`):**
- **Issue:** The codebase references both `orders` and `orders_unified` tables in different legacy modules and backup migration references (`orders_unified_backup_20260111_000000`).
- **Why:** A major schema refactoring was performed to unify table dining, takeaway, QSR, and QR ordering into a single table structure.
- **Impact:** Confusion over which table is authoritative for reporting, potential synchronization drift if an older hook writes to `orders`.
- **Fix approach:** Verify and complete full deprecation of legacy `orders` table references across all reports and hooks in favor of `orders_unified`.

**3. ISP Domain Block Proxying Workarounds:**
- **Issue:** Special proxy configuration in `vite.config.ts`, `netlify.toml`, and `src/integrations/supabase/client.ts` to redirect `/api/supabase/*` to bypass Indian ISP (e.g. Jio) DNS blocks on `*.supabase.co`.
- **Why:** Real-world connectivity issues for restaurant staff operating in India where certain telecom providers intermittently block Supabase cloud subdomains.
- **Impact:** Bypassing proxy for WebSocket realtime (`wss://...`) requires direct connection fallback; OAuth redirection requires distinct handling (`SUPABASE_DIRECT_URL`).
- **Fix approach:** Ensure custom domain mapping on Supabase (e.g. `api.swadeshisolutions.co.in`) is finalized to eliminate manual proxy configurations and path rewrites.

## Known Bugs & Operational Workarounds

**1. Native Android Focus Refetch Storm:**
- **Symptoms:** App stutter or multiple simultaneous queries firing when switching between apps or waking an Android tablet.
- **Trigger:** TanStack React Query default behavior refetches all active queries on window focus (`refetchOnWindowFocus: true`).
- **Workaround:** Disabled globally on native Android container (`refetchOnWindowFocus: !isNativeApp()` in `src/App.tsx`).
- **Root Cause:** Android OS resumes webview activity and sends false window focus events repeatedly.

**2. Franchise Branch Switching Cache Stale Reads:**
- **Symptoms:** Switching branches in the franchise dashboard can briefly display the previous branch's order numbers or stock counts.
- **Trigger:** Switching branch in `FranchiseContext` without immediately purging or invalidating all restaurant-keyed React Query caches.
- **Workaround:** Context forces cache invalidation via `queryClient.invalidateQueries()`, but race conditions can occur if queries are in-flight.
- **Root Cause:** Query keys that omit `restaurantId` or query caching delays.

## Security Considerations

**1. Multi-Tenant Data Isolation Enforcement (Row Level Security):**
- **Risk:** Accidental cross-tenant data leakage if a query bypasses tenant filtering or if an RLS policy has a logical flaw.
- **Current Mitigation:**
  - 100% of the 126+ tables have RLS enabled with explicit tenant isolation policies (`restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid())`).
  - Franchise cross-branch operations use strict Security Definer helper `get_user_accessible_restaurants()` verifying membership in `organization_members`.
- **Recommendations:**
  - Regularly run automated Supabase security linters (`get_advisors`) to detect any tables with RLS disabled or missing indexes on foreign keys.
  - Never allow raw user-supplied `restaurant_id` in mutations without database trigger verification against authenticated user profile.

**2. Edge Function Service Role Key Usage:**
- **Risk:** Privileged Edge Functions executing with `SUPABASE_SERVICE_ROLE_KEY` bypass all RLS policies.
- **Current Mitigation:** Functions validate authorization headers and user claims before executing administrative actions.
- **Recommendations:**
  - Enforce strict input validation with Zod schemas inside all 46 Edge functions.
  - Never return unredacted service-role query results directly to client responses.

## Performance Bottlenecks

**1. Heavy Analytics Aggregations on Large Date Ranges:**
- **Problem:** Generating yearly P&L, GST reports, or top-product rankings can take several seconds if calculating over tens of thousands of individual order items in client memory.
- **Cause:** Historical reporting queries fetching row-level details and performing aggregations in JavaScript (`src/pages/Analytics.tsx`, `src/hooks/useFinancialData.tsx`).
- **Improvement Path:** Leverage PostgreSQL materialized views and server-side aggregation functions (`daily_summary_reports`, `revenue_metrics`) rather than downloading raw line items to the client.

**2. Large Vendor Chunk Bundles:**
- **Problem:** PDF generation (`jspdf`, `html2canvas`, `html2pdf.js`), Excel processing (`exceljs`, `xlsx`), and chart libraries (`highcharts`, `recharts`, `pixi.js`, `three`) produce large vendor chunks.
- **Current Mitigation:** Vite `manualChunks` in `vite.config.ts` isolates these into separate lazy-loaded chunks (`pdf-vendor`, `excel-vendor`, `chart-vendor`).
- **Improvement Path:** Dynamically import export libraries only upon user click (e.g. `const { jsPDF } = await import('jspdf')`) rather than importing at top of components.

**3. Low-End Android POS Tablet Memory Footprint:**
- **Problem:** Cheap Android POS terminals (1GB–2GB RAM) may run low on memory if too many DOM nodes remain mounted or if sound files and images are unoptimized.
- **Current Mitigation:** Reduced garbage collection time (`gcTime: 1000 * 60 * 10`) in React Query and pure console logging in production.
- **Improvement Path:** Virtualize large lists (`@tanstack/react-virtual`) for order histories and product catalogs with >500 items.

## Fragile Areas

**1. Order Calculation & Bill Rounding Engine:**
- **Why Fragile:** Real-world taxation compliance in India requires exact precision: CGST (2.5%), SGST (2.5%), round-off to nearest rupee, item-level discounts vs order-level discounts, and split billing across multiple payment modes (Cash + UPI + Card).
- **Common Failures:** Discrepancies of ₹1 or ₹0.50 between KOT totals, bill prints, and payment gateway capture amounts.
- **Safe Modification:** Always run `npx vitest run src/tests/billFormatter.test.ts` before modifying `src/utils/orderCalculations.ts` or `src/utils/billCalculation.ts`.

**2. Multi-Branch Realtime WebSockets:**
- **Why Fragile:** Subscribing to too many tables or branches simultaneously can overwhelm the Supabase Realtime channel quota and lead to dropped message notifications on POS and Kitchen TV.
- **Safe Modification:** Ensure channels unsubscribe cleanly during React component unmount (`useEffect` cleanup return).

## Dependencies at Risk

- `xlsx` via SheetJS CDN link (`https://cdn.sheetjs.com/xlsx-0.20.2/xlsx-0.20.2.tgz`): External tarball dependency in `package.json`; could cause build failures if CDN experiences downtime. Migration to standard npm package or pure `exceljs` recommended.
- `cordova-plugin-bluetooth-serial`: Legacy Cordova plugin used inside modern Capacitor container. May require upgrade or replacement if future Android SDK versions deprecate legacy Bluetooth serial APIs.

---

*Concerns analysis: 2026-09-12*
*Update after major audit*
