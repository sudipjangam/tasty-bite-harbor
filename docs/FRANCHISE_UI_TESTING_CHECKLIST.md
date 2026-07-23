# 🧪 Franchise Portal — UI Manual Testing Checklist

**Project:** Tasty Bite Harbor (Swadeshi Solutions)  
**Date:** 2026-07-23  
**Tester Name:** ___________________  
**Browser / Device:** ___________________  
**Environment URL:** ___________________  

---

> **Instructions for Testers:**  
> - Mark each item: ✅ Pass | ❌ Fail | ⏭️ Skipped  
> - If ❌ Fail — write the issue in the "Notes" column  
> - Take screenshot for every failure  
> - Test on both Desktop (Chrome) and Mobile (phone browser)

---

## SECTION A: Existing App — Must NOT Be Broken (Regression)

> **Login as:** Any existing restaurant user (admin/manager/staff)  
> **Purpose:** Confirm the merge didn't break anything for current users

| # | What to Test | Steps | Expected Result | Status | Notes |
|---|---|---|---|---|---|
| A1 | Login works | Enter email/password → Login | Dashboard loads, no errors | | |
| A2 | Dashboard loads | After login, check main dashboard | All widgets, charts, KPI cards show data | | |
| A3 | Sidebar navigation | Click every item in left sidebar | Each page loads without blank screen or error | | |
| A4 | POS — Create order | Go to POS → Add items → Complete payment | Order created successfully, receipt shows | | |
| A5 | POS — Apply discount | During order → Apply discount | Discount reflected in total | | |
| A6 | QSR / Quick Serve | Go to QSR → Create quick order → Pay | Order completes, appears in order list | | |
| A7 | Kitchen TV | Open Kitchen TV (or use PIN) | Orders appear, can change status (Preparing → Ready) | | |
| A8 | Menu Management | Go to Menu → View items | All menu items show with name, price, image | | |
| A9 | Menu — Add item | Click Add → Fill form → Save | New item appears in list | | |
| A10 | Menu — Edit item | Click existing item → Edit price → Save | Price updated in list | | |
| A11 | Menu — Delete item | Click delete on item → Confirm | Item removed from list | | |
| A12 | Orders list | Go to Orders page | All orders visible with status, date, amount | | |
| A13 | Order detail | Click on any order | Full order details show (items, total, customer) | | |
| A14 | Inventory | Go to Inventory page | Stock items listed with quantities | | |
| A15 | Staff Management | Go to Staff page | Staff list shows with names and roles | | |
| A16 | Customer / CRM | Go to Customers page | Customer list loads, search works | | |
| A17 | Loyalty Program | Go to Loyalty page | Tiers and points visible | | |
| A18 | Reports / P&L | Go to Reports / P&L page | Financial data loads, charts render | | |
| A19 | Settings page | Go to Settings → Check all tabs | All settings tabs load (QR, Payment, Location, System) | | |
| A20 | No strange columns | Check all forms and tables | No "organization_id", "branch_code", "origin" visible in any existing page | | |
| A21 | Console errors | Open browser DevTools → Console tab | No red errors related to "organization", "franchise", or "undefined" | | |

---

## SECTION B: Franchise Portal — Sidebar & Feature Access

> **Login as:** Franchise owner OR admin user with franchise feature enabled  
> **Purpose:** Test franchise portal shows up and is accessible

| # | What to Test | Steps | Expected Result | Status | Notes |
|---|---|---|---|---|---|
| B1 | Franchise in sidebar | Login → Look at left sidebar | "Franchise Portal" menu item visible | | |
| B2 | Click Franchise Portal | Click "Franchise Portal" in sidebar | Navigates to `/franchise`, franchise layout loads | | |
| B3 | Franchise sidebar | On franchise page, check left sidebar | Shows: Dashboard, Branches, Team, Menu Sync, Orders, Inventory, Staff, P&L, Customers, Approvals, Settings | | |
| B4 | All links work | Click each sidebar item one by one | Each page loads (no blank screen, no crash) | | |
| B5 | Back to main app | Click back/home button in franchise layout | Returns to main dashboard | | |
| B6 | Mobile responsive | Open on phone or resize browser to mobile | Sidebar becomes hamburger menu, pages adjust | | |
| B7 | Blocked without feature | Login as user WITHOUT franchise feature → type `/franchise` in URL | Shows "upgrade" or blocked message, NOT the franchise page | | |
| B8 | Sidebar hidden | Login as user WITHOUT franchise feature | "Franchise Portal" NOT visible in sidebar | | |

---

## SECTION C: Franchise Dashboard (`/franchise`)

> **Login as:** Franchise owner  
> **Purpose:** Main franchise overview page with cross-branch KPIs

| # | What to Test | Steps | Expected Result | Status | Notes |
|---|---|---|---|---|---|
| C1 | Page loads | Navigate to `/franchise` | Dashboard with KPI cards visible | | |
| C2 | Revenue card | Check revenue KPI | Shows total revenue across all branches | | |
| C3 | Order count card | Check orders KPI | Shows total orders across all branches | | |
| C4 | Top branch | Check top-performing section | One branch highlighted as top performer | | |
| C5 | Branch filter | Select specific branch from dropdown | KPIs update to show only that branch's data | | |
| C6 | "All Branches" | Select "All Branches" option | Shows aggregated data again | | |
| C7 | Date range | Change date range | All numbers update based on selected period | | |
| C8 | Empty state | If franchise has 0 orders | Shows meaningful empty state, not crash | | |

---

## SECTION D: Branch Management (`/franchise/branches`)

> **Login as:** Franchise owner  
> **Purpose:** View and manage restaurant branches

| # | What to Test | Steps | Expected Result | Status | Notes |
|---|---|---|---|---|---|
| D1 | Branch list loads | Navigate to Branches page | All branches listed with name, code, status | | |
| D2 | HQ badge | Check headquarters branch | Shows "HQ" badge or indicator | | |
| D3 | Branch details | Click on a branch | Shows branch details (name, code, address) | | |
| D4 | Edit branch | Click Edit on a branch → Change name → Save | Name updates in list | | |
| D5 | Add branch button | Click "Add Branch" | Form opens OR shows disabled if max branches reached | | |
| D6 | Max branches limit | Try adding branch when at limit | Shows error: "Maximum branches reached" or similar | | |
| D7 | Deactivate branch | Click deactivate on a branch → Confirm | Branch shows as inactive/greyed out | | |
| D8 | Branch count | Check total branch count | Matches actual number of branches | | |

---

## SECTION E: Team Management (`/franchise/team`)

> **Login as:** Franchise owner  
> **Purpose:** Manage franchise-level users and roles

| # | What to Test | Steps | Expected Result | Status | Notes |
|---|---|---|---|---|---|
| E1 | Member list | Navigate to Team page | All org members shown with name, role, email | | |
| E2 | Role display | Check role column | Shows correct role (Owner / Admin / Member / Viewer) | | |
| E3 | Invite user | Click Invite → Enter email → Send | Invitation sent (toast confirmation) | | |
| E4 | Change role | Click on member → Change role dropdown → Save | Role updates | | |
| E5 | Set branch access | Click member → Assign specific branches | Branch access saved | | |
| E6 | Remove member | Click Remove on a member → Confirm | Member removed from list | | |
| E7 | Cannot remove self | Try to remove yourself (owner) | Button disabled or error message | | |
| E8 | Viewer role check | Login as franchise viewer → Check team page | Can see list but CANNOT edit/invite/remove | | |

---

## SECTION F: Menu Sync (`/franchise/menu-sync`)

> **Login as:** Franchise owner  
> **Purpose:** Manage master menu and sync to branches

| # | What to Test | Steps | Expected Result | Status | Notes |
|---|---|---|---|---|---|
| F1 | Master menu list | Navigate to Menu Sync | Master menu items displayed | | |
| F2 | Add master item | Add new item to master menu | Item created with "master" origin | | |
| F3 | Push to branches | Select items → Push to branches | Items appear in branch menus as "inherited" | | |
| F4 | Branch price override | Go to branch → Change inherited item price | Price updates within allowed limits | | |
| F5 | Min/max price limit | Try setting price below minimum | Error shown, price rejected | | |
| F6 | Min/max price limit | Try setting price above maximum | Error shown, price rejected | | |
| F7 | Inherited badge | Check branch menu items | Inherited items show badge/icon indicating synced from master | | |
| F8 | Delete master item | Delete item from master menu | Shows in branches as orphaned or removed | | |

---

## SECTION G: Cross-Branch Orders (`/franchise/orders`)

> **Login as:** Franchise owner  
> **Purpose:** View orders across all branches

| # | What to Test | Steps | Expected Result | Status | Notes |
|---|---|---|---|---|---|
| G1 | Order list loads | Navigate to Cross-Branch Orders | Orders from all branches visible | | |
| G2 | Branch column | Check order list | Each order shows which branch it belongs to | | |
| G3 | Filter by branch | Select specific branch from filter | Only that branch's orders shown | | |
| G4 | Filter by date | Select date range | Orders filtered by date | | |
| G5 | Filter by status | Select status filter (completed/pending) | Orders filtered by status | | |
| G6 | Order detail | Click on an order | Full order detail opens | | |
| G7 | Pagination | If many orders, scroll or go to next page | Pagination works, no duplicate orders | | |

---

## SECTION H: Cross-Branch Inventory (`/franchise/inventory`)

> **Login as:** Franchise owner  
> **Purpose:** View stock levels across branches (READ ONLY)

| # | What to Test | Steps | Expected Result | Status | Notes |
|---|---|---|---|---|---|
| H1 | Inventory loads | Navigate to Cross-Branch Inventory | Stock items from all branches visible | | |
| H2 | Branch comparison | Check layout | Can compare stock across branches (table/cards) | | |
| H3 | Low stock alerts | Check items with low quantity | Highlighted in red/orange or alert icon | | |
| H4 | Read-only | Try to edit any inventory item | No edit buttons, or edit is disabled | | |
| H5 | Filter by branch | Select specific branch | Shows only that branch's inventory | | |
| H6 | Search | Search for specific item | Item found across branches | | |

---

## SECTION I: Cross-Branch Staff (`/franchise/staff`)

> **Login as:** Franchise owner  
> **Purpose:** View staff across all branches

| # | What to Test | Steps | Expected Result | Status | Notes |
|---|---|---|---|---|---|
| I1 | Staff list loads | Navigate to Cross-Branch Staff | Staff from all branches visible | | |
| I2 | Branch grouping | Check layout | Staff grouped or filterable by branch | | |
| I3 | Role visibility | Check staff entries | Role (Chef, Waiter, Manager, etc.) visible | | |
| I4 | Filter by branch | Select specific branch | Only that branch's staff shown | | |
| I5 | Attendance | Check attendance info (if shown) | Attendance summary visible | | |

---

## SECTION J: Cross-Branch P&L (`/franchise/pnl`)

> **Login as:** Franchise owner  
> **Purpose:** Consolidated profit & loss view

| # | What to Test | Steps | Expected Result | Status | Notes |
|---|---|---|---|---|---|
| J1 | P&L loads | Navigate to Cross-Branch P&L | Consolidated financial data visible | | |
| J2 | Total numbers | Check consolidated totals | Revenue, expenses, profit shown | | |
| J3 | Branch breakdown | Check individual branch rows | Each branch has its own P&L line | | |
| J4 | Date range | Change period | Numbers update for selected period | | |
| J5 | Charts | Check if charts/graphs render | Visual charts show data | | |
| J6 | Export/Print | Click export or print (if available) | Downloads or opens print dialog | | |

---

## SECTION K: Cross-Branch Customers (`/franchise/customers`)

> **Login as:** Franchise owner  
> **Purpose:** Shared customer database across branches

| # | What to Test | Steps | Expected Result | Status | Notes |
|---|---|---|---|---|---|
| K1 | Customer list | Navigate to Cross-Branch Customers | Customers from all branches visible | | |
| K2 | Search | Search by name or phone | Results found across branches | | |
| K3 | Visit history | Click on customer | Shows which branches they visited | | |
| K4 | Loyalty points | Check customer loyalty (if available) | Chain-wide points shown | | |
| K5 | Filter by branch | Select specific branch | Only that branch's customers shown | | |

---

## SECTION L: Approvals Workflow (`/franchise/approvals`)

> **Login as:** Franchise owner  
> **Purpose:** Approve/reject requests from branches

| # | What to Test | Steps | Expected Result | Status | Notes |
|---|---|---|---|---|---|
| L1 | Approvals list | Navigate to Approvals page | Pending approval requests visible | | |
| L2 | Approve request | Click Approve on a request | Status changes to "Approved", toast shown | | |
| L3 | Reject request | Click Reject on a request | Status changes to "Rejected", toast shown | | |
| L4 | History | Check past approvals | Previously approved/rejected items visible | | |
| L5 | Empty state | If no pending approvals | Shows "No pending approvals" message | | |

---

## SECTION M: Franchise Settings (`/franchise/settings`)

> **Login as:** Franchise owner  
> **Purpose:** Configure franchise-level settings

| # | What to Test | Steps | Expected Result | Status | Notes |
|---|---|---|---|---|---|
| M1 | Settings page loads | Navigate to Franchise Settings | Settings form visible | | |
| M2 | Edit org name | Change organization name → Save | Name updates, toast confirmation | | |
| M3 | Upload logo | Upload new logo image → Save | Logo updates in header/branding | | |
| M4 | Menu mode toggle | Switch between independent/shared/master | Mode saves, affects menu sync behavior | | |
| M5 | Subscription info | Check subscription section | Shows plan type, max branches, pricing | | |
| M6 | Save confirmation | Make change → Save | Success toast appears | | |
| M7 | Validation | Clear required field → Save | Validation error shown | | |

---

## SECTION N: Platform Admin — Franchise Management

> **Login as:** Platform admin (Swadeshi Solutions super admin)  
> **Purpose:** Create and manage franchise organizations

| # | What to Test | Steps | Expected Result | Status | Notes |
|---|---|---|---|---|---|
| N1 | Franchise Admin page | Go to Platform → Franchise Admin | List of all organizations shown | | |
| N2 | Org type badges | Check org list | Shows "single" / "franchise" / "chain" badges | | |
| N3 | Create franchise | Click Create → Fill wizard → Submit | New franchise created with HQ restaurant | | |
| N4 | Assign owner | During creation, assign owner user | Owner linked to franchise | | |
| N5 | Edit franchise | Click Edit on franchise → Make changes → Save | Changes saved | | |
| N6 | Delete franchise | Click Delete → Confirm | Franchise removed (with proper warnings) | | |
| N7 | Subscription management | Check/edit franchise subscription | Plan type, max branches editable | | |
| N8 | Branch count | Check branch count per franchise | Matches actual branches | | |

---

## SECTION O: Branch Switcher (UI Component)

> **Login as:** Franchise owner  
> **Purpose:** Test the branch selection dropdown

| # | What to Test | Steps | Expected Result | Status | Notes |
|---|---|---|---|---|---|
| O1 | Switcher visible | Open franchise portal | Branch switcher dropdown in header | | |
| O2 | All branches listed | Click dropdown | All accessible branches shown | | |
| O3 | Select branch | Choose specific branch | Page data updates to that branch | | |
| O4 | Select "All" | Choose "All Branches" | Aggregated data shown | | |
| O5 | Persists on navigation | Switch branch → Navigate to another page | Same branch still selected | | |
| O6 | Not shown for single users | Login as regular restaurant user | NO branch switcher visible anywhere | | |
| O7 | Fast switching | Rapidly switch between branches | No crashes, no stale data, no loading stuck | | |

---

## SECTION P: Branding & Theming

> **Login as:** Franchise owner with branding configured  
> **Purpose:** Custom branding per franchise

| # | What to Test | Steps | Expected Result | Status | Notes |
|---|---|---|---|---|---|
| P1 | Custom logo | Check franchise header/sidebar | Franchise logo displayed (not default) | | |
| P2 | Custom colors | Check UI color scheme | Matches franchise branding colors (if configured) | | |
| P3 | Default branding | Login to franchise WITHOUT branding config | Default Tasty Bite Harbor branding shown | | |
| P4 | Login page branding | Check login page for franchise restaurant | Shows franchise branding on login | | |

---

## Test Summary

| Section | Area | Total Tests |
|---|---|---|
| A | Existing App Regression | 21 |
| B | Franchise Access & Sidebar | 8 |
| C | Franchise Dashboard | 8 |
| D | Branch Management | 8 |
| E | Team Management | 8 |
| F | Menu Sync | 8 |
| G | Cross-Branch Orders | 7 |
| H | Cross-Branch Inventory | 6 |
| I | Cross-Branch Staff | 5 |
| J | Cross-Branch P&L | 6 |
| K | Cross-Branch Customers | 5 |
| L | Approvals Workflow | 5 |
| M | Franchise Settings | 7 |
| N | Platform Admin | 8 |
| O | Branch Switcher | 7 |
| P | Branding & Theming | 4 |
| **TOTAL** | | **121** |

---

## Test Accounts Needed

| Role | Purpose | Login Credentials |
|---|---|---|
| Regular Restaurant Admin | Section A (regression testing) | _fill in_ |
| Franchise Owner | Sections B–M, O, P | _fill in_ |
| Franchise Viewer | Section E8 (read-only check) | _fill in_ |
| Platform Admin | Section N | _fill in_ |
| User WITHOUT franchise feature | Section B7, B8 (gating check) | _fill in_ |

---

## Bug Report Template

When reporting a bug, include:

```
Bug ID: [Section#-Test#] e.g. D5
Severity: Critical / Major / Minor / Cosmetic
Page/URL: 
Steps to Reproduce:
  1.
  2.
  3.
Expected: 
Actual: 
Screenshot: [attach]
Browser/Device: 
Tester: 
Date: 
```

---

*Document Version: 1.0 | Generated: 2026-07-23*
