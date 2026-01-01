# QSR POS - Component Architecture

> **Purpose:** Technical reference for developers and testers to understand QSR POS structure

---

## Component Hierarchy

```
QSRPosMain.tsx (Main Container)
├── Header
│   ├── Back Button (when table selected)
│   ├── Title (QSR POS / Table Name)
│   └── Active Orders Button
│
├── QSRModeSelector
│   ├── Dine In (default)
│   ├── Takeaway
│   ├── Delivery
│   └── NC (No Charge)
│
├── Main Content Area
│   ├── QSRTableGrid (when dine-in, no table selected)
│   │   └── Table Cards (status-colored)
│   │
│   └── QSRMenuGrid (when table selected or non-dine-in)
│       ├── Category Tabs
│       └── Menu Item Cards
│
├── Desktop: QSROrderPad (sidebar)
│   ├── Order Items List
│   ├── Price Summary
│   └── Action Buttons
│
├── Mobile: QSRCartBottomSheet
│   ├── Collapsible drawer
│   ├── Order Items
│   └── Action Buttons
│
├── QSRCartFAB (mobile only)
│   └── Floating button showing count
│
├── QSRActiveOrdersDrawer
│   ├── Search & Filters
│   └── Order Cards with Recall
│
├── QSRCustomItemDialog
│   └── Form for custom items
│
└── PaymentDialog (shared with POS)
    ├── Confirm Step
    ├── Payment Method Step
    ├── QR Code Step (UPI)
    └── Success Step
```

---

## State Management

### Key State Variables (QSRPosMain.tsx)

| State | Type | Purpose |
|-------|------|---------|
| `orderMode` | `QSROrderMode` | Current order type (dine_in, takeaway, etc.) |
| `selectedTable` | `QSRTable \| null` | Currently selected table |
| `orderItems` | `QSROrderItem[]` | Items in current order |
| `showActiveOrders` | `boolean` | Active orders drawer visibility |
| `showPaymentDialog` | `boolean` | Payment dialog visibility |
| `pendingKitchenOrderId` | `string \| null` | ID of order sent to kitchen |
| `recalledKitchenOrderId` | `string \| null` | ID of recalled order |
| `paymentOrderItems` | `QSROrderItem[]` | Items stored for post-pay flow |

---

## Data Flow

### Order Creation Flow

```
User Action                    State Change                   Database
─────────────────────────────────────────────────────────────────────────
Select Table          →   setSelectedTable(table)       →   (none)
Add Item              →   setOrderItems([...items])     →   (none)
Send to Kitchen       →   setOrderItems([])             →   INSERT kitchen_orders
                          setPendingKitchenOrderId(id)      UPDATE restaurant_tables
```

### Payment Flow

```
User Action                    State Change                   Database
─────────────────────────────────────────────────────────────────────────
Open Payment          →   setShowPaymentDialog(true)    →   (none)
Complete Payment      →   setShowPaymentDialog(false)   →   UPDATE orders.status
                          setSelectedTable(null)            UPDATE kitchen_orders.status
                                                            UPDATE restaurant_tables.status
```

---

## Hooks Used

| Hook | File | Purpose |
|------|------|---------|
| `useQSRTables` | `hooks/useQSRTables.tsx` | Fetch tables with active order status |
| `useQSRMenuItems` | `hooks/useQSRMenuItems.tsx` | Fetch menu items and categories |
| `useActiveKitchenOrders` | `hooks/useActiveKitchenOrders.tsx` | Fetch active orders for recall |
| `useRestaurantId` | `hooks/useRestaurantId.tsx` | Get current restaurant context |
| `useAuth` | `hooks/useAuth.tsx` | Authentication and user info |
| `useToast` | `hooks/use-toast.ts` | Toast notifications |

---

## Database Schema Reference

### kitchen_orders
```sql
CREATE TABLE kitchen_orders (
  id UUID PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id),
  order_id UUID REFERENCES orders(id),
  source TEXT,                    -- "QSR-Table T1", "QSR-Takeaway"
  status TEXT,                    -- "new", "preparing", "ready", "completed"
  items JSONB,                    -- Array of {name, quantity, price, notes}
  item_completion_status BOOLEAN[], -- Per-item completion for strikethrough
  order_type TEXT,                -- "dine_in", "takeaway", "delivery"
  customer_name TEXT,
  server_name TEXT,
  created_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  bumped_at TIMESTAMP
);
```

### restaurant_tables
```sql
CREATE TABLE restaurant_tables (
  id UUID PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id),
  name TEXT,
  capacity INTEGER,
  status TEXT                     -- "available", "occupied", "reserved"
);
```

---

## Key Functions

### handleSendToKitchen()
- Creates/updates kitchen_orders record
- Creates orders record
- Updates table status if dine-in
- Clears cart and closes mobile sheet

### handlePaymentSuccess()
- Handles both pre-pay and post-pay flows
- Updates order status to "completed"
- Frees table if dine-in
- Clears all pending state

### handleRecallOrder(order)
- Loads order items into cart
- Sets recalledKitchenOrderId
- Closes active orders drawer
- Attempts to match table from source

---

## File Locations

```
src/
├── components/
│   └── QSR/
│       ├── QSRPosMain.tsx          # Main component
│       ├── QSRTableGrid.tsx        # Table selection grid
│       ├── QSRMenuGrid.tsx         # Menu items display
│       ├── QSROrderPad.tsx         # Desktop order sidebar
│       ├── QSRCartBottomSheet.tsx  # Mobile cart sheet
│       ├── QSRModeSelector.tsx     # Order mode tabs
│       ├── QSRActiveOrdersDrawer.tsx # Recall orders drawer
│       └── QSRCustomItemDialog.tsx # Custom item form
│
├── hooks/
│   ├── useQSRTables.tsx
│   ├── useQSRMenuItems.tsx
│   └── useActiveKitchenOrders.tsx
│
├── types/
│   └── qsr.ts                      # TypeScript interfaces
│
└── components/Orders/POS/
    └── PaymentDialog.tsx           # Shared payment component
```

---

## Testing Tips

1. **Real-time Updates:** QSR tables refresh every 30 seconds and on Supabase realtime events
2. **Mobile Testing:** Use Chrome DevTools device emulation (iPhone 12 Pro)
3. **KDS Testing:** Open `/kitchen` in separate tab to verify order sync
4. **Strikethrough:** Mark items complete in KDS, then check payment dialog
