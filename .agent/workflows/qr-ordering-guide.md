---
description: QR Ordering System Guide
---

# QR Ordering System - Complete Guide

## Overview
Customer-facing mobile ordering system using QR codes for tables and rooms with integrated UPI payments.

## System Architecture

### Flow
1. **Admin generates QR codes** → QR Settings (Settings page)
2. **Customer scans QR** → Decodes to `/order/:encodedData`
3. **Browse menu & add to cart** → CartContext manages state
4. **Checkout** → Collects customer info
5. **Submit order** → Edge function creates order
6. **Payment screen** → UPI deep link for payment

### Key Files
```
Frontend:
├── src/pages/CustomerOrder.tsx (main ordering page)
├── src/components/CustomerOrder/
│   ├── MenuBrowser.tsx (menu grid display)
│   ├── MenuItemCard.tsx (food item cards)
│   ├── CartDrawer.tsx (bottom sheet cart)
│   └── CheckoutForm.tsx (checkout form)
└── src/contexts/CartContext.tsx (cart state)

Backend:
└── supabase/functions/submit-qr-order/index.ts
```

## Database Schema

### Tables Modified
```sql
-- Orders table (entity tracking)
ALTER TABLE orders 
ADD COLUMN table_id uuid REFERENCES restaurant_tables(id),
ADD COLUMN room_id uuid REFERENCES rooms(id),
ADD COLUMN entity_name text;

-- Existing tables used
payment_settings (upi_id, upi_name, is_active)
qr_codes (token, entity_type, entity_id)
```

## Edge Function: submit-qr-order

### Input
```json
{
  "restaurantId": "uuid",
  "entityType": "table" | "room",
  "entityId": "uuid",
  "customerName": "string",
  "customerPhone": "string",
  "specialInstructions": "string",
  "items": [
    {
      "menuItemId": "uuid",
      "quantity": number,
      "price": number,
      "modifiers": []
    }
  ],
  "totalAmount": number
}
```

### Output
```json
{
  "success": true,
  "orderId": "uuid",
  "orderNumber": "ABCD1234",
  "message": "Order placed successfully!",
  "payment": {
    "required": true,
    "method": "upi",
    "upi": {
      "id": "premmore003@okaxis",
      "name": "Prem More",
      "paymentLink": "upi://pay?pa=...",
      "amount": 280
    }
  }
}
```

### What It Does
1. Validates input data
2. Fetches menu items and entity names
3. Creates order in `orders` table with entity tracking
4. Creates kitchen_order entry
5. Updates table/room status to occupied
6. Fetches UPI payment settings
7. Generates UPI deep link
8. Returns payment info

## Cart Persistence Fix

### Problem
Cart items persisted when scanning different table QR codes.

### Solution
```typescript
useEffect(() => {
  const currentEntityKey = `${restaurantId}-${entityType}-${entityId}`;
  const storedEntityKey = localStorage.getItem('qr_order_entity');
  
  if (storedEntityKey && storedEntityKey !== currentEntityKey) {
    clearCart(); // Different table/room detected
  }
  
  localStorage.setItem('qr_order_entity', currentEntityKey);
}, [restaurantId, entityType, entityId, clearCart]);
```

**Result**: Cart automatically clears when scanning new QR code

## UPI Payment Integration

### Configuration
Settings → Payments → UPI Payment Settings
- UPI ID: `premmore003@okaxis`
- Business Name: `Prem More`
- Enable toggle: ON

### UPI Deep Link Format
```
upi://pay?pa={UPI_ID}&pn={BUSINESS_NAME}&am={AMOUNT}&cu=INR&tn=Order%20{ORDER_REF}
```

### Payment Screen
- Displays order confirmation
- Shows UPI payment details
- "Pay Now with UPI" button → Opens payment app
- Order instructions for customer

## Deployment

### Deploy Edge Function
```bash
npx supabase functions deploy submit-qr-order --project-ref clmsoetktmvhazctlans
```

### Apply Migration
```sql
-- Already applied: add_entity_tracking_to_orders
-- Adds table_id, room_id, entity_name columns
```

## Common Issues & Fixes

### Issue: Array format error
**Error**: `malformed array literal`
**Fix**: Pass array directly, not JSON stringified
```typescript
// ❌ Wrong
items: JSON.stringify(orderItems)

// ✅ Correct  
items: orderItems
```

### Issue: Cart persists across tables
**Fix**: Added localStorage entity tracking (see Cart Persistence section)

### Issue: Missing table/room in orders
**Fix**: Added table_id, room_id, entity_name columns to orders table

### Issue: Special instructions error
**Error**: `column "special_instructions" does not exist`
**Fix**: Removed from insert statement (column doesn't exist in orders table)

## Future Enhancements

### Payment Gateway Support
Architecture ready for:
- Razorpay
- Paytm Business
- Instamojo
- PhonePe Business
- Google Pay for Business

Add `payment_gateway_type` field to switch between providers.

### Payment Verification
TODO:
- Add webhook endpoint for payment callbacks
- Update order payment_status after confirmation
- Send order to kitchen only after payment
- Handle payment timeouts

### Real-time Updates
TODO:
- Supabase Realtime subscriptions
- Order status notifications
- Live order tracking for customers

## Testing Checklist

- [ ] Generate QR code for table
- [ ] Scan QR code → Opens customer order page
- [ ] Browse menu, search works
- [ ] Add items to cart
- [ ] Cart displays correct total
- [ ] Scan different table QR → Cart clears
- [ ] Checkout shows table/room info
- [ ] Submit order → Success screen appears
- [ ] UPI payment link opens payment app
- [ ] Order appears in kitchen with table info
- [ ] Table status updates to occupied

## Troubleshooting

### QR code doesn't work
- Check `qr_ordering_enabled` in restaurant settings
- Verify QR token exists in database
- Check URL encoding is correct

### Payment not displaying
- Verify payment_settings has active UPI config
- Check edge function logs
- Ensure payment_settings.is_active = true

### Order not creating
- Check edge function logs at Supabase Dashboard
- Verify all required fields in request
- Check database permissions
- Ensure menu items exist

## Database Queries

### Get orders with entity info
```sql
SELECT 
  id,
  customer_name,
  total,
  status,
  entity_name,
  order_type,
  created_at
FROM orders
WHERE is_qr_order = true
ORDER BY created_at DESC;
```

### Get active payment settings
```sql
SELECT upi_id, upi_name
FROM payment_settings
WHERE is_active = true
LIMIT 1;
```
