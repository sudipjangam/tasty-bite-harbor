# Tasty Bite Harbor — Claude Project Memory

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
| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | TailwindCSS + Shadcn UI + Radix UI |
| State | React Query (TanStack), React Context, localStorage |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions, Storage) |
| AI | Google Gemini (via edge function) |
| Deployment | Netlify |
| Testing | Vitest + React Testing Library |

## Key Architecture Patterns

### POS Systems (3 Variants)
1. **POS** (`/pos`) — Table-based restaurant POS
2. **QSR POS** (`/qsr-pos`) — Full QSR with kitchen display (`src/components/QSR/`)
3. **QuickServe POS** (`/quickserve-pos`) — Counter POS for food trucks (`src/components/QuickServe/`)

### Order Item Format
`"2x Veg Manchurian @150"` — regex: `/^(\d+)x\s+(.+?)\s+@(\d+(?:\.\d+)?)$/`

### Data Fetching
- Supabase client: `import { supabase } from "@/integrations/supabase/client"`
- React Query for all server state
- Toast: `import { useToast } from "@/hooks/use-toast"`
- Restaurant ID: `useRestaurantId()` hook

### Routing
- Public routes in `src/components/Auth/Routes.tsx`
- Authenticated routes in `src/components/Auth/AppRoutes.tsx`
- All pages lazy-loaded with `PermissionGuard` wrappers
- Permissions format: `module.action` (e.g., `orders.view`, `staff.update`)

### Styling
- Use semantic tokens from `index.css`, NOT raw colors
- Dark mode support required (`dark:` variants)
- Shadcn components at `src/components/ui/`
- Premium: gradients, glassmorphism, rounded-2xl cards
