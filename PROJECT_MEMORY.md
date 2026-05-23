# Project Memory - Tasty Bite Harbor

> Auto-updated summary of key implementations and decisions
> Last scanned: 2026-05-23

---

## 🔢 Project Stats

| Metric | Count |
|--------|-------|
| Pages | 46 |
| Component modules | 49 dirs |
| Custom hooks | 76 |
| Edge functions | 47 |
| Utility files | 22 |
| Type files | 11 |
| Context providers | 4 |
| Tests | 229+ |

---

## 🔄 Recent Changes

### Email Bill Implementation (Dec 2025)
- **File**: `supabase/functions/send-email-bill/index.ts`
- **Purpose**: Send HTML bills via Resend API
- **Features**:
  - Fetches restaurant name from DB when not provided
  - Rate limited (50 emails/hour)
  - Professional HTML template with invoice number
- **Frontend**: `PaymentDialog.tsx`, `CheckoutSuccessDialog.tsx`
- **Secret**: `RESEND_API_KEY` configured in Supabase

### QSR POS System (Dec 2025 - Jan 2026)
- **Files**: `src/components/QSR/`, `src/pages/QSRPos.tsx`
- **Testing**: `docs/QSR-POS-Test-*.md`
- Quick service restaurant mode with touch-friendly UI

---

## 🗄️ Database Schema (Key Tables)

| Table | Purpose |
|-------|---------| 
| `restaurants` | Restaurant profiles |
| `profiles` | User profiles linked to restaurant |
| `menu_items` | Menu items with categories |
| `orders` | Order records |
| `kitchen_orders` | Kitchen queue (real-time) |
| `reservations` | Table/room bookings |
| `room_reservations` | Hotel room bookings |
| `inventory_items` | Stock items |
| `purchase_orders` | Supplier orders |
| `staff` | Employee records |
| `customers` | CRM customer data |
| `expense_entries` | Financial expenses |

---

## ⚡ Edge Functions (47)

| Category | Functions |
|----------|-----------|
| AI | `chat-with-gemini` |
| Email | `send-email`, `send-email-bill`, `send-inquiry` |
| WhatsApp | `send-whatsapp`, `send-whatsapp-bill`, `send-whatsapp-cloud`, `send-whatsapp-unified`, `send-msg91-whatsapp`, `whatsapp-webhook` |
| Reservations | `send-reservation-confirmation`, `send-reservation-reminder`, `find-active-reservation` |
| Inventory | `check-low-stock`, `deduct-inventory-on-prep` |
| Staff | `record-clock-entry`, `check-missed-clocks`, `auto-clock-out` |
| Auth/RBAC | `role-management`, `user-management`, `get-user-components`, `migrate-roles-data`, `forgot-password`, `reset-password` |
| Payments | `create-razorpay-order`, `verify-razorpay-payment`, `process-razorpay-refund`, `create-paytm-qr`, `check-paytm-status`, `paytm-webhook`, `create-payment-qr` |
| Customer | `customer-menu-api`, `enroll-customer`, `submit-qr-order`, `validate-promo-code`, `log-promotion-usage` |
| Media | `upload-image`, `freeimage-upload`, `google-drive-upload` |
| Channels | `sync-channels` |
| Subscription | `send-subscription-confirmation` |
| Templates | `create-msg91-template`, `sync-msg91-template-status` |
| QR/Bill | `generate-qr-code`, `extract-bill-details` |
| Backup | `backup-restore` |

### Rate Limits
- AI Chat: 30 req/min
- WhatsApp: 100 msg/hr
- Email: 50/hr

---

## 🧪 Testing

- **Framework**: Vitest + React Testing Library
- **Coverage**: 229+ tests
- **Run**: `npm test`
- **Docs**: `docs/TESTING.md`

---

## 📋 Known TODOs

### Code Refactoring (Large Files)
- [ ] `POSMode.tsx` (986 lines)
- [ ] `ImprovedAddOrderForm.tsx` (810 lines)
- [ ] `ActiveOrdersList.tsx` (787 lines)
- [ ] `Settings.tsx` (576 lines)
- [ ] `ImprovedSidebarNavigation.tsx` (568 lines)
- [ ] `StaffDialog.tsx` (556 lines)

### Large Pages (need splitting)
- [ ] `Inventory.tsx` (79KB)
- [ ] `Suppliers.tsx` (55KB)
- [ ] `Customers.tsx` (50KB)
- [ ] `QuickServePOS.tsx` (46KB)
- [ ] `Settings.tsx` (44KB)

### Performance
- [ ] Migrate Recharts → Highcharts (~300KB savings)
  - ✅ Phase 1 done (wrapper + 2 charts)
  - ⬜ Phase 2-4 remaining
- [ ] Lazy loading optimizations

### Features
- See `TODO.md` for Hotel PMS roadmap (6 phases)

---

## 🔐 Environment Variables

```env
VITE_SUPABASE_URL=<supabase_url>
VITE_SUPABASE_ANON_KEY=<anon_key>
```

### Edge Function Secrets (Supabase Dashboard)
- `RESEND_API_KEY` - Email service
- `TWILIO_ACCOUNT_SID` - WhatsApp (frozen)
- `TWILIO_AUTH_TOKEN` - WhatsApp (frozen)
- `GOOGLE_AI_API_KEY` - Gemini AI

---

## 📝 Development Notes

### Common Commands
```bash
npm run dev      # Start dev server (port 8080)
npm test         # Run tests
npm run build    # Production build
npm run cap:sync # Sync Capacitor Android
```

### Supabase CLI
```bash
npx supabase functions deploy <function-name> --project-ref <id>
npx supabase secrets set KEY=value --project-ref <id>
```

### Deploy
- **Netlify**: auto-deploy, proxy for Supabase ISP bypass
- **Vercel**: `vercel.json` config, analytics integrated
- **Android**: Capacitor 8

---

*Last updated: May 2026*
