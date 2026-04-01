# Tasty Bite Harbor — Gemini Project Memory

## Quick Reference
See `.agent/ARCHITECTURE.md` for the comprehensive architecture reference including:
- Full routing table with permissions
- Module map (12 modules)  
- All 39+ edge functions
- Database table groups
- Hook reference
- Convention guide

See `.agent/diagrams/` for Mermaid diagrams:
- `system-overview.mmd` — High-level system architecture
- `data-flow.mmd` — Data flow between layers
- `order-lifecycle.mmd` — Order state machine
- `auth-flow.mmd` — Authentication and RBAC
- `database-schema.mmd` — Database entity relationships

## Tech Stack
React 18 + TypeScript + Vite + Supabase (PostgreSQL, Auth, Edge Functions) + Tailwind CSS + Shadcn UI

## Key Files
- `src/components/Auth/Routes.tsx` — Public vs authenticated routing
- `src/components/Auth/AppRoutes.tsx` — All authenticated routes (lazy-loaded)
- `src/hooks/useAuth.tsx` — Auth context + `isRole()` 
- `src/hooks/useRestaurantId.tsx` — Current restaurant ID
- `src/contexts/AccessContext.tsx` — RBAC permission checks
- `src/integrations/supabase/client.ts` — Supabase client
- `src/integrations/supabase/types.ts` — Auto-generated DB types (READ-ONLY)

## Conventions
- Supabase client: `import { supabase } from "@/integrations/supabase/client"`
- Toast: `import { useToast } from "@/hooks/use-toast"`
- All data fetching via React Query (`useQuery`, `useMutation`)
- UI components from `@/components/ui/`
- Use semantic CSS tokens, not raw colors
- Order items format: `"2x Item @Price"` 
- QuickServe prefix: `QS`, QSR prefix: `QSR`
- All routes wrapped with `PermissionGuard` (format: `module.action`)
- Dark mode support required on all components
