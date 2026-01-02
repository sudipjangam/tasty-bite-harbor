# Project Memory - Tasty Bite Harbor

> Auto-updated summary of key implementations and decisions

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

## 🔌 Edge Functions

| Function | Purpose | Rate Limit |
|----------|---------|------------|
| `chat-with-gemini` | AI insights | 30/min |
| `send-email-bill` | Email bills | 50/hr |
| `send-whatsapp` | WhatsApp msgs | 100/hr |
| `validate-promo-code` | Promo validation | - |
| `check-low-stock` | Inventory alerts | - |
| `backup-restore` | DB backup | - |

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
- [ ] `ActiveOrdersList.tsx` (787 lines)
- [ ] `Settings.tsx` (576 lines)

### Performance
- [ ] Migrate Recharts → Highcharts (~300KB savings)
- [ ] Lazy loading optimizations

### Features
- See `TODO.md` for Hotel PMS roadmap

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
npm run dev      # Start dev server
npm test         # Run tests
npm run build    # Production build
```

### Supabase CLI
```bash
npx supabase functions deploy <function-name> --project-ref <id>
npx supabase secrets set KEY=value --project-ref <id>
```

---

*Last updated: January 2026*
