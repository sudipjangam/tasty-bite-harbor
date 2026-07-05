# 🏢 Franchise Roles & Access Controls Guide

This document outlines the roles, responsibilities, and branch scopes for the **Swadeshi Solutions Franchise Management System**.

---

## 1. Role Definitions & Scopes

Franchise roles are stored in the `organization_members` table under the `role` column. The visibility and action permissions are scoped dynamically per user.

| Role | Database Role | Branch Scoping (`accessible_branches`) | Primary Responsibilities |
|---|---|---|---|
| **Franchise Owner** | `owner` | `NULL` (All Branches) | Full read/write access across all branches, org settings, pricing models, billing & subscriptions, and team invites. |
| **Regional Manager** | `admin` | Explicit List (e.g., `['br-1', 'br-2']`) | Operations & monitoring of the assigned region. Reviews discount/price requests raised by Branch Managers. |
| **Franchise Admin** | `admin` | `NULL` (All Branches) | Central operations manager with full branch access. Can edit menus, manage staff rosters, but cannot change billing or owner settings. |
| **Franchise Viewer** | `viewer` | `NULL` or Explicit List | Read-only access to consolidated reports, revenue dashboards, and inventory status. Typically for investors or central auditors. |

---

## 2. Dynamic Scoping (Regional Managers)

In the database, a **Regional Manager** is represented by a member with the `admin` role and a non-null array of UUIDs in `accessible_branches`:

```sql
-- Example: Seeding a Regional Manager for Pune and Nashik branches
INSERT INTO organization_members (organization_id, user_id, role, accessible_branches)
VALUES (
  'org-uuid-here',
  'user-uuid-here',
  'admin',
  ARRAY['pune-branch-uuid', 'nashik-branch-uuid']::UUID[]
);
```

### Access Isolation (RLS)
The database enforces security definition policies using the helper function `get_user_accessible_restaurants()`. This ensures:
- If a user has `accessible_branches = NULL`, they bypass branch filtering (access all branches under the organization).
- If a user has a specific array, queries to `restaurants` or `orders` will filter using: `restaurant_id = ANY(accessible_branches)`.

---

## 3. Inviting Team Members (Admin Interface)

When adding or editing team members in the Franchise Portal:
1. **Role Selection**: Select **Franchise Owner**, **Admin**, **Regional Manager**, or **Viewer**.
2. **Branch Assignment**:
   - For **Owner** and **Franchise Admin**, branch selection is locked to "All Branches".
   - For **Regional Manager** and **Viewer**, selection dropdown unlocks to select specific branches.
