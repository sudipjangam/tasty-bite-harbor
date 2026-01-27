# Project Context - Tasty Bite Harbor

## Overview
Full-featured restaurant + hotel management system built with React, TypeScript, and Supabase.

## Tech Stack
- **Frontend**: React 18, TypeScript, Vite
- **UI**: Shadcn UI, Radix UI, Tailwind CSS  
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- **AI**: Google Gemini
- **Charts**: Recharts (migrating to Highcharts)
- **Testing**: Vitest, React Testing Library

## Project Structure
```
src/
├── components/    # 449+ React components
├── pages/         # 37+ page components
├── hooks/         # 60+ custom hooks
├── types/         # TypeScript definitions
├── tests/         # Comprehensive test suite
└── utils/         # Utility functions

supabase/
└── functions/     # 27+ Edge Functions
```

## Key Features
1. **POS System** - Full point-of-sale with QSR mode
2. **Order Management** - Kitchen display, order lifecycle
3. **QR Ordering System** - Table/room QR codes with mobile ordering & UPI payments
4. **Menu Management** - Categories, items, modifiers
5. **Inventory** - Stock tracking, purchase orders, suppliers
6. **Reservations** - Table booking, waitlist
7. **Room Management** - Hotel room booking, housekeeping
8. **CRM** - Customer profiles, loyalty, segmentation
9. **Staff** - Attendance, shifts, salary calculation
10. **Analytics** - Sales trends, forecasting
11. **Reports** - CSV/PDF export, scheduled reports
12. **AI Assistant** - Gemini-powered insights

## Important Files
- `README.md` - Project documentation
- `TODO.md` - Development roadmap
- `docs/TESTING.md` - Testing guide
- `supabase/functions/API_DOCUMENTATION.md` - API docs

## Supabase Project
- **Project ID**: Check `.env` for `VITE_SUPABASE_URL`
- **Project Ref**: clmsoetktmvhazctlans
- **Edge Functions**: 27+ serverless functions

## Common Patterns
- Use `useQuery` from TanStack Query for data fetching
- Supabase client: `import { supabase } from "@/integrations/supabase/client"`
- Toast notifications: `import { useToast } from "@/hooks/use-toast"`
- UI components from `@/components/ui/`

## QR Ordering System
### Architecture
- **Customer Flow**: `/order/:encodedData` route decodes QR data
- **Cart Management**: `CartContext` with localStorage entity tracking
- **Payment**: UPI integration via payment_settings table
- **Order Submission**: `submit-qr-order` edge function

### Key Components
- `CustomerOrder.tsx` - Main ordering page
- `MenuBrowser.tsx` - 2-column grid menu display
- `MenuItemCard.tsx` - Visual food item cards
- `CartDrawer.tsx` - Modern bottom sheet cart
- `CheckoutForm.tsx` - Customer info & order summary

### Database Tables
- `qr_codes` - QR code registry
- `orders` - Enhanced with table_id, room_id, entity_name
- `payment_settings` - UPI configuration

### Edge Functions
- `submit-qr-order` - Creates orders, fetches UPI settings, generates payment links
- `generate-qr-code` - QR code generation

## Active Development Areas
1. QR ordering payment verification and callbacks
2. Payment gateway integration (Razorpay/Paytm)
3. Real-time order status updates
4. Hotel PMS features (Night Audit, Front Desk)
5. Code refactoring for large files
