# 📋 Hotel PMS - Development Roadmap

> Last Updated: December 28, 2025

---

## Phase 1: Core Operations (3-4 weeks)

### Front Desk
- [ ] **Walk-in Check-in** - Quick reservation + check-in in single flow
- [ ] **Room Move/Upgrade** - Mid-stay room change with rate adjustment
- [ ] **Early Check-in** - Check availability, apply extra charges
- [ ] **Late Checkout** - Extend stay with hourly/half-day charges
- [ ] **Express Checkout** - Self-service quick checkout

### Night Audit
- [ ] **Daily Close Process** - End-of-day reconciliation
- [ ] **Auto Room Charges** - Post daily rates to guest folios
- [ ] **Revenue Summary Report** - Day's earnings breakdown
- [ ] **Discrepancy Report** - Cash vs system mismatch detection

### Reports
- [ ] **Arrivals/Departures List** - Daily movement report
- [ ] **No-show Report** - Guests who didn't arrive
- [ ] **Outstanding Balance Report** - Unpaid folios

---

## Phase 2: Enhanced Features (3-4 weeks)

### Reservations
- [ ] **Group Reservations** - Multiple rooms, single booking
- [ ] **Corporate Booking** - Company rates, master billing
- [ ] **Waitlist Management** - Queue when fully booked
- [ ] **Rate Restrictions** - Min stay, closed to arrival

### Visual Tools
- [ ] **Availability Calendar Grid** - Visual room availability by date
- [ ] **Drag-drop Reservations** - Move bookings on calendar
- [ ] **Occupancy Forecast** - Predicted occupancy trends

### Guest Management
- [ ] **Guest ID Document Upload** - Store ID, passport, DL scans
- [ ] **VIP/Loyalty Tiers** - Guest categorization
- [ ] **Guest Preferences** - Room type, floor, amenity preferences
- [ ] **Registration Card** - Digital/printed with signature capture

---

## Phase 3: Revenue & Billing (2-3 weeks)

### Billing Enhancements
- [ ] **Split Billing** - Divide bill across multiple payers
- [ ] **Folio Transfer** - Move charges between rooms
- [ ] **Refund Processing** - Track and process refunds
- [ ] **Advance/Deposit Handling** - Pre-payment management
- [ ] **Proforma Invoice** - Pre-checkout estimates
- [ ] **Credit Note Generation** - For refunds/adjustments

### Rate Features
- [ ] **Package Rates** - Room + meals, room + spa bundles
- [ ] **Dynamic Pricing** - Occupancy-based rate adjustment

### Metrics
- [ ] **ADR Calculation** - Average Daily Rate
- [ ] **RevPAR Tracking** - Revenue Per Available Room
- [ ] **Segment Analysis** - Revenue by source/guest type

---

## Phase 4: Guest Communication (2 weeks)

### Email Automation
- [ ] **Booking Confirmation** - Auto-send on reservation
- [ ] **Pre-arrival Email** - Directions, upsell offers
- [ ] **Thank You Email** - Post-checkout with feedback link
- [ ] **Email Templates** - Customizable branded templates

### Notifications
- [ ] **WhatsApp/SMS Integration** - Booking confirmations
- [ ] **Post-stay Survey** - Automated feedback collection
- [ ] **Inter-department Messages** - Front desk ↔ Housekeeping

---

## Phase 5: Housekeeping Enhancements

- [ ] **Turndown Service** - Evening service tracking
- [ ] **Deep Cleaning Schedule** - Periodic thorough cleaning
- [ ] **Minibar Check** - Stock verification workflow
- [ ] **Preventive Maintenance** - Scheduled equipment checks
- [ ] **Maintenance Cost Tracking** - Expense monitoring

---

## Phase 6: Guest Services

- [ ] **Laundry Service** - Pickup, delivery, charges
- [ ] **Wake-up Calls** - Scheduled notifications
- [ ] **Concierge Requests** - Tour booking, taxi, etc.
- [ ] **Special Occasion Alerts** - Birthday/anniversary reminders

---

## 🚫 Deferred (Channel Management)

> Requires external API partnerships - will revisit later

- [ ] OTA Sync (Booking.com, Expedia)
- [ ] Rate Parity Management
- [ ] Booking Engine Widget
- [ ] Online Payment Gateway

---

## 🔧 Code Refactoring

### Pending - Large Files 🔴

| Lines | File | Status |
|-------|------|--------|
| 986 | `POSMode.tsx` | Pending |
| 810 | `ImprovedAddOrderForm.tsx` | Pending |
| 787 | `ActiveOrdersList.tsx` | Pending |
| 576 | `Settings.tsx` | Pending |
| 568 | `ImprovedSidebarNavigation.tsx` | Pending |
| 556 | `StaffDialog.tsx` | Pending |

---

## 🚀 Performance Optimization

### Pending - Recharts → Highcharts Migration 🟠

> **Goal:** Remove Recharts dependency to reduce chart-vendor bundle by ~300KB

#### Phase 1: Setup (Low effort)
- [x] Create `src/components/ui/charts/HighchartsWrapper.tsx` - Reusable wrapper
- [x] Create `src/components/ui/charts/index.ts` - Export all chart types
- [x] Migrate `ExpensesOverview.tsx` - Simple BarChart only
- [x] Migrate `OccupancyChart.tsx` - Simple AreaChart only

#### Phase 2: Dashboard Charts (Medium effort)
- [ ] Migrate `PlatformDashboard.tsx` - AreaChart, BarChart
- [ ] Migrate `PredictiveAnalytics.tsx` - LineChart
- [ ] Migrate `BusinessDashboard.tsx` - Mixed charts

#### Phase 3: Analytics & Reports (High effort)
- [ ] Migrate `SmartInsights.tsx` - PieChart, BarChart, LineChart
- [ ] Migrate `ExpenseAnalytics.tsx` - BarChart, LineChart
- [ ] Migrate `ReportViewer.tsx` - LineChart, BarChart, PieChart
- [ ] Migrate `AdvancedAnalytics.tsx` - LineChart, BarChart, PieChart
- [ ] Migrate `ExcelAnalyzer.tsx` - Various charts

#### Phase 4: Cleanup
- [ ] Update `lazy-components.tsx` - Remove Recharts lazy imports
- [ ] Remove `recharts` from `package.json`
- [ ] Remove `recharts` from `vite.config.ts` manual chunks
- [ ] Verify build - Confirm ~300KB savings

---

## Issues

### ActiveOrdersList Component Out of Memory (OOM) Error
- The `ActiveOrdersList` component causes an OOM error when running tests, specifically in `src/tests/StaffFlow.test.tsx`.
- This is likely due to the Supabase real-time subscription setup in `useEffect` creating a memory leak or infinite loop during testing, even with mocked clients.
- The component has been mocked in `src/tests/StaffFlow.test.tsx` to bypass this issue and allow other tests to run.
- **Action Required:** Investigate `ActiveOrdersList.tsx` for proper cleanup of subscriptions and `useEffect` dependencies. Ensure mocks in tests correctly handle the subscription lifecycle or use a more robust mock for the realtime channel.

### StaffFlow Tests Failures
- `adds items to the order`: Fails to find "Burger" item.
- `increments quantity`: Fails to find "Burger" item or quantity.
- `removes items from order`: Fails to find "Burger" item or clear button correctly.
- `allows sending order to kitchen`: Fails to find "Send to Kitchen" button or verify completion.
- These failures might be due to asynchronous rendering or incorrect selectors. The component structure might have changed or the mocks are not returning data as expected by the component logic (e.g., category filtering).

## Next Steps
- Fix the `ActiveOrdersList` memory leak.
- Debug and fix the selectors/timing in `src/tests/StaffFlow.test.tsx`.

## Notes

```markdown
Priority Guide:
🔴 Critical - Business blocking
🟠 High - Important for operations  
🟡 Medium - Nice to have
🟢 Low - Future enhancement
```
