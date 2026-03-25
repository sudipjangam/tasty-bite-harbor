# Tasty Bite Harbor — Project Memory

## Project Overview
Restaurant management SaaS platform built with **React + TypeScript + Supabase**. Targets food truck owners, restaurants, and hospitality businesses. Deployed on **Netlify**.

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | TailwindCSS + custom CSS (premium glassmorphism, gradients, dark mode) |
| State | React Query (TanStack), useState, localStorage for ephemeral data |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions, Storage) |
| Deployment | Netlify |
| Testing | Vitest + React Testing Library |

## Key Architecture Patterns

### POS Systems (Two Variants)
1. **QuickServe POS** (`/quickserve`) — Simplified counter/takeaway POS for food trucks
   - Main page: `src/pages/QuickServePOS.tsx` (state coordinator)
   - Components: `src/components/QuickServe/QS*.tsx`
   - Flow: Menu Grid → Order Panel cart → Payment Sheet OR Send to Kitchen
2. **QSR POS** (`/qsr`) — Full restaurant POS
   - Main page: `src/components/QSR/QSRPosMain.tsx`
   - Has kitchen display, table management, etc.

### Order Lifecycle
```
Menu Item Selected → Cart (QSOrderPanel)
  ├── "Pay ₹X" → QSPaymentSheet → Transaction logged → Order "paid"
  ├── "Kitchen" → Order created (payment_status: "pending") → Kitchen Order created
  │   ├── "Collect Payment" → QSPaymentSheet (existingOrder mode) → "paid"
  │   └── "Add Items" → Edit mode → Append to existing order
  └── "Hold" → localStorage (useHeldOrders hook)
```

### Database Tables (Key)
- `orders` — Main order records (items as string[], total, status, payment_status, item_completion_status)
- `kitchen_orders` — Kitchen display records (linked to orders via order_id)
- `pos_transactions` — Payment transaction log
- `menu_items` — Menu catalog
- `customers` — CRM customer records
- `loyalty_programs` — Loyalty point configuration
- `promotion_campaigns` — Coupon/discount campaigns

### Item Format Convention
Orders store items as formatted strings: `"2x Veg Manchurian @150"`
- Parser regex: `/^(\d+)x\s+(.+?)\s+@(\d+(?:\.\d+)?)$/`
- Used in `parseOrderItem()` in QSActiveOrders and QuickServePOS

### Payment Flow
- `QSPaymentSheet.tsx` handles both new orders and existing order payments
- Supports: Cash, UPI (QR code generation), Card, Non-Chargeable
- `existingOrder` prop bypasses order creation, only logs transaction
- Shows token number, QR code, WhatsApp receipt sharing

### Held Orders (Park Feature)
- Stored in `localStorage` via `useHeldOrders.ts` hook
- Key: `qs-held-orders`
- Contains full cart state: items, customer info, discounts, loyalty info
- UI: `QSHeldOrdersDrawer.tsx`

### Edit/Add Items Mode
- `editingOrderId` + `editingOrderItems` state in QuickServePOS
- Existing items shown greyed-out in QSOrderPanel
- "Kitchen" button appends new items to existing order (UPDATE instead of INSERT)
- Creates new kitchen_order for new items only (inventory deduction scoped)

## Component Conventions

### Naming
- QuickServe components: `QS` prefix (e.g., `QSMenuGrid`, `QSOrderPanel`)
- QSR components: `QSR` prefix (e.g., `QSRPosMain`, `QSRActiveOrdersDrawer`)

### Styling Patterns
- Premium gradients: `bg-gradient-to-r from-orange-500 via-rose-500 to-pink-600`
- Glassmorphism: `backdrop-blur-md bg-white/20 border border-white/20`
- Dark mode: Always include `dark:` variants
- Rounded corners: `rounded-2xl` for cards, `rounded-xl` for buttons
- Status colors: orange=preparing, blue=completed, amber=unpaid, emerald=paid

### State Management
- React Query for server state (`useQuery`, `useMutation`, `queryClient.invalidateQueries`)
- `useState` for UI state
- `localStorage` for client-only persistent state (held orders)
- Context: `CurrencyContext`, `AuthContext`

### Testing
- Test files: `src/tests/components/QuickServe/*.test.tsx`
- Mock Supabase in tests: `vi.mock("@/integrations/supabase/client")`
- Run: `npx vitest run src/tests/components/QuickServe/ --reporter=verbose`
- Currently 28 tests across 7 test files

## Important Hooks
- `useRestaurantId()` — Gets current restaurant ID from auth context
- `useAuth()` — User authentication state
- `useCRMSync()` — Syncs customer data to CRM on order
- `useHeldOrders()` — Manages parked/held orders in localStorage
- `useQSRMenuItems()` — Fetches menu items from Supabase
- `useCurrencyContext()` — Currency symbol (₹)

## Edge Functions (Supabase)
- `deduct-inventory-on-prep` — Deducts ingredient inventory when kitchen order created
- `send-msg91-whatsapp` — Sends WhatsApp messages via MSG91

## Recent Features Added
1. **Order Hold/Park** — Save cart to localStorage, resume later
2. **Send to Kitchen (KOT-first)** — Create order without payment, collect later
3. **Collect Payment** — Full QSPaymentSheet for pending orders
4. **Add Items to Existing Order** — Append new items to orders already in kitchen
5. **Loyalty Points** — Earn/redeem points with configurable caps
6. **Coupon System** — Apply promotional discounts
7. **QR Code UPI** — Dynamic QR for UPI payments
8. **WhatsApp Receipts** — Digital bill sharing via WhatsApp
