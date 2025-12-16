# Supabase Edge Functions - API Documentation

This document provides comprehensive documentation for all edge functions available in the Swadeshi Solutions RMS.

---

## Table of Contents

1. [AI & Chat Functions](#ai--chat-functions)
2. [WhatsApp Integration](#whatsapp-integration)
3. [Reservation Functions](#reservation-functions)
4. [Inventory Functions](#inventory-functions)
5. [Staff Management](#staff-management)
6. [Role & User Management](#role--user-management)
7. [File Upload Functions](#file-upload-functions)
8. [Backup Functions](#backup-functions)
9. [Utility Functions](#utility-functions)

---

## AI & Chat Functions

### `chat-with-gemini`
AI-powered chat assistant with restaurant data context.

**Rate Limit:** 30 requests/minute per user

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "What were my sales yesterday?" }
  ],
  "restaurantId": "uuid",
  "analysisType": "sales_forecast" | "inventory_recommendations" | null,
  "days": 7
}
```

**Response:**
```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Based on your data..."
      }
    }
  ]
}
```

---

### `chat-with-api`
Alternative chat endpoint for API-based integrations.

---

### `chat-with-ai`
Lightweight AI assistant without full restaurant data context.

---

## WhatsApp Integration

### `send-whatsapp`
Send WhatsApp messages via Twilio.

**Rate Limit:** 100 messages/hour per user

**Request:**
```json
{
  "phone": "+919876543210",
  "message": "Your order is ready!",
  "billingId": "uuid",
  "promotionId": "uuid",
  "recipientId": "uuid",
  "recipientType": "customer" | "reservation",
  "restaurantId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "phone": "+919876543210",
  "status": "sent",
  "twilioResponse": { ... }
}
```

---

### `send-whatsapp-bill`
Send billing/invoice details via WhatsApp.

**Request:**
```json
{
  "billingId": "uuid",
  "phone": "+919876543210"
}
```

---

## Reservation Functions

### `send-reservation-confirmation`
Send confirmation message for new reservations.

**Request:**
```json
{
  "reservationId": "uuid",
  "phone": "+919876543210",
  "guestName": "John Doe",
  "date": "2024-01-15",
  "time": "7:00 PM",
  "partySize": 4
}
```

---

### `send-reservation-reminder`
Send reminder for upcoming reservations (typically 24hrs before).

**Request:**
```json
{
  "reservationId": "uuid"
}
```

---

### `find-active-reservation`
Find a reservation by guest phone or booking ID.

**Request:**
```json
{
  "phone": "+919876543210",
  "bookingId": "ABC123"
}
```

---

## Inventory Functions

### `check-low-stock`
Check for inventory items below reorder level.

**Request:**
```json
{
  "restaurantId": "uuid"
}
```

**Response:**
```json
{
  "lowStockItems": [
    {
      "id": "uuid",
      "name": "Tomatoes",
      "quantity": 5,
      "reorderLevel": 10,
      "unit": "kg"
    }
  ]
}
```

---

### `deduct-inventory-on-prep`
Deduct inventory items when order preparation starts.

**Request:**
```json
{
  "orderId": "uuid",
  "items": [
    { "menuItemId": "uuid", "quantity": 2 }
  ]
}
```

---

## Staff Management

### `record-clock-entry`
Record staff clock-in/clock-out.

**Request:**
```json
{
  "staffId": "uuid",
  "type": "clock_in" | "clock_out",
  "timestamp": "2024-01-15T09:00:00Z",
  "location": { "lat": 19.0760, "lng": 72.8777 }
}
```

---

### `check-missed-clocks`
Check for missed clock-in/clock-out entries.

**Request:**
```json
{
  "restaurantId": "uuid",
  "date": "2024-01-15"
}
```

---

## Role & User Management

### `role-management`
CRUD operations for custom roles.

**Request (Create):**
```json
{
  "action": "create",
  "restaurantId": "uuid",
  "name": "Supervisor",
  "description": "Shift supervisor role",
  "components": ["uuid1", "uuid2"]
}
```

---

### `user-management`
User account management operations.

**Request:**
```json
{
  "action": "create" | "update" | "delete" | "assign_role",
  "userId": "uuid",
  "data": { ... }
}
```

---

### `get-user-components`
Get list of components accessible to a user.

**Request:**
```json
{
  "userId": "uuid"
}
```

**Response:**
```json
{
  "components": [
    { "id": "uuid", "name": "POS", "slug": "pos" },
    { "id": "uuid", "name": "Orders", "slug": "orders" }
  ]
}
```

---

### `migrate-roles-data`
Migrate legacy role data to new schema.

---

## File Upload Functions

### `upload-image`
Upload images to Supabase storage.

**Request:** `multipart/form-data`
- `file`: Image file
- `bucket`: Storage bucket name
- `path`: File path

---

### `freeimage-upload`
Upload images to FreeImage.host (free hosting).

**Request:** `multipart/form-data`
- `file`: Image file

**Response:**
```json
{
  "url": "https://freeimage.host/i/abc123.jpg"
}
```

---

### `google-drive-upload`
Upload files to Google Drive (for backups).

---

## Backup Functions

### `backup-restore`
Create or restore database backups.

**Request:**
```json
{
  "action": "create" | "restore",
  "backupId": "uuid",
  "restaurantId": "uuid"
}
```

---

## Utility Functions

### `validate-promo-code`
Validate and apply promotional codes.

**Request:**
```json
{
  "code": "SAVE20",
  "restaurantId": "uuid",
  "orderTotal": 500
}
```

**Response:**
```json
{
  "valid": true,
  "discount": 100,
  "discountType": "percentage",
  "discountValue": 20,
  "message": "20% off applied!"
}
```

---

### `log-promotion-usage`
Log when a promotion is used.

**Request:**
```json
{
  "promotionId": "uuid",
  "orderId": "uuid",
  "discountAmount": 100
}
```

---

### `send-purchase-order-notification`
Notify suppliers of new purchase orders.

**Request:**
```json
{
  "purchaseOrderId": "uuid"
}
```

---

### `sync-channels`
Sync inventory/pricing with external channels (Zomato, Swiggy, etc.).

**Request:**
```json
{
  "restaurantId": "uuid",
  "channels": ["zomato", "swiggy"]
}
```

---

## Authentication

All endpoints require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

## Error Responses

All endpoints return consistent error format:

```json
{
  "error": "Error message",
  "details": "Additional error details",
  "status": 400
}
```

## Rate Limiting

When rate limited, you'll receive:

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again in 45 seconds.",
  "retryAfter": 45,
  "resetAt": "2024-01-15T10:00:00Z"
}
```

HTTP Status: `429 Too Many Requests`
