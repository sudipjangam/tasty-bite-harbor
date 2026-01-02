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
3. **Menu Management** - Categories, items, modifiers
4. **Inventory** - Stock tracking, purchase orders, suppliers
5. **Reservations** - Table booking, waitlist
6. **Room Management** - Hotel room booking, housekeeping
7. **CRM** - Customer profiles, loyalty, segmentation
8. **Staff** - Attendance, shifts, salary calculation
9. **Analytics** - Sales trends, forecasting
10. **Reports** - CSV/PDF export, scheduled reports
11. **AI Assistant** - Gemini-powered insights

## Important Files
- `README.md` - Project documentation
- `TODO.md` - Development roadmap
- `docs/TESTING.md` - Testing guide
- `supabase/functions/API_DOCUMENTATION.md` - API docs

## Supabase Project
- **Project ID**: Check `.env` for `VITE_SUPABASE_URL`
- **Edge Functions**: 27+ serverless functions

## Common Patterns
- Use `useQuery` from TanStack Query for data fetching
- Supabase client: `import { supabase } from "@/integrations/supabase/client"`
- Toast notifications: `import { useToast } from "@/hooks/use-toast"`
- UI components from `@/components/ui/`

## Active Development Areas
1. QSR POS testing and fixes
2. Recharts → Highcharts migration
3. Hotel PMS features (Night Audit, Front Desk)
4. Code refactoring for large files (POSMode, Settings)
