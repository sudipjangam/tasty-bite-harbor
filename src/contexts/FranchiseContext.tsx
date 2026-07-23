import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  MOCK_BRANCHES,
  MOCK_ORG,
  MOCK_ORDERS,
  MOCK_INVENTORY,
  MOCK_STAFF,
  MOCK_TEAM,
  MOCK_MENU_ITEMS,
  MOCK_PNL_BRANCHES,
  MOCK_FRANCHISE_KPIS,
  MOCK_REVENUE_TREND,
  MOCK_PAYROLL,
  MOCK_CUSTOMERS,
  MockBranch,
  MockOrder,
  MockInventoryItem,
  MockStaffMember,
  MockMenuItem,
  MockPnLBranch,
  MockPayrollEntry,
  MockCustomer,
  OrgRole
} from "@/data/franchiseMockData";

// ============================================================
// FranchiseContext — Provides org/branch state across franchise pages
// Supports toggling between Mock Data (for presentations/demos)
// and Live Database Queries (for fully operational franchise management).
// ============================================================

interface FranchiseContextType {
  // Demo Mode
  demoMode: boolean;
  setDemoMode: (val: boolean) => void;

  // Organization
  org: typeof MOCK_ORG;
  orgRole: OrgRole;
  isFranchiseOwner: boolean;

  // Branches
  allBranches: MockBranch[];
  currentBranch: MockBranch | null; // null = "All Branches"
  setCurrentBranch: (branch: MockBranch | null) => void;

  // Real data arrays (fallback to mock in demoMode)
  orders: MockOrder[];
  inventory: MockInventoryItem[];
  staff: MockStaffMember[];
  payroll: MockPayrollEntry[];
  customers: MockCustomer[];
  team: typeof MOCK_TEAM;
  menuItems: MockMenuItem[];
  pnlBranches: MockPnLBranch[];
  kpis: typeof MOCK_FRANCHISE_KPIS;
  revenueTrend: any[];
  formatCurrency: (amount: number) => string;

  // Helpers
  isAllBranches: boolean;
  currentBranchLabel: string;
  isLoading: boolean;
  refetch: () => void;
  addBranch: (b: any) => Promise<boolean>;
  updateBranch: (id: string, b: any) => Promise<boolean>;
}

const FranchiseContext = createContext<FranchiseContextType | undefined>(undefined);

interface FranchiseProviderProps {
  children: ReactNode;
}

export const FranchiseProvider: React.FC<FranchiseProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [currentBranch, setCurrentBranch] = useState<MockBranch | null>(null);
  const [mockBranches, setMockBranches] = useState<MockBranch[]>(MOCK_BRANCHES);

  // Demo mode: persisted in localStorage, defaults to true for initial presentations
  const [demoMode, setDemoModeState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("franchise_portal_demo_mode");
      return saved === null ? true : saved === "true";
    } catch {
      return true;
    }
  });

  const setDemoMode = (val: boolean) => {
    setDemoModeState(val);
    try {
      localStorage.setItem("franchise_portal_demo_mode", String(val));
    } catch {}
  };

  // 1. Fetch organization details
  const { data: dbData, isLoading, refetch } = useQuery({
    queryKey: ["franchise_portal_data", user?.id],
    enabled: !!user?.id && !demoMode,
    queryFn: async () => {
      // Find organization membership
      let { data: member } = await supabase
        .from("organization_members")
        .select("organization_id, role")
        .eq("user_id", user!.id)
        .maybeSingle();

      let activeOrgId = member?.organization_id;
      let activeRole = member?.role as OrgRole || "viewer";

      // Fallback for platform admin or standalone users
      if (!activeOrgId) {
        const { data: firstOrg } = await supabase
          .from("organizations")
          .select("id")
          .limit(1)
          .maybeSingle();
        activeOrgId = firstOrg?.id;
        activeRole = "owner";
      }

      if (!activeOrgId) return null;

      // ── Date range helpers ────────────────────────────────────
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sixtyDaysAgo = new Date(now);
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const todayStr = now.toISOString().split("T")[0];

      // Query organization + subscription + branches + menu + members
      const [orgRes, subRes, branchRes, menuRes, memberRes] = await Promise.all([
        supabase.from("organizations").select("*").eq("id", activeOrgId).maybeSingle(),
        supabase.from("organization_subscriptions").select("*").eq("organization_id", activeOrgId).maybeSingle(),
        supabase.from("restaurants").select("*").eq("organization_id", activeOrgId),
        supabase.from("menu_items").select("*").eq("organization_id", activeOrgId),
        supabase.from("organization_members").select("*").eq("organization_id", activeOrgId)
      ]);

      const orgRow = orgRes.data;
      const subRow = subRes.data;
      const branchRows = branchRes.data || [];
      const menuRows = menuRes.data || [];
      const memberRows = memberRes.data || [];

      // Query profiles for owner name
      let ownerName = "Franchise Owner";
      let ownerEmail = "";
      const ownerLookupId = orgRow?.owner_user_id || user!.id;
      {
        const { data: ownerProf } = await supabase
          .from("profiles")
          .select("first_name, last_name, email")
          .eq("id", ownerLookupId)
          .maybeSingle();
        if (ownerProf) {
          ownerName = `${ownerProf.first_name || ""} ${ownerProf.last_name || ""}`.trim() || ownerName;
          ownerEmail = ownerProf.email || "";
        } else {
          ownerEmail = user?.email || "";
          ownerName = ownerEmail.split("@")[0] || ownerName;
        }
      }

      const branchIds = branchRows.map(b => b.id);
      const colors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899"];

      // ── Fetch ALL orders for these branches (current 30 days + previous 30 days for growth) ──
      let allOrderRows: any[] = [];
      if (branchIds.length > 0) {
        const { data: ords } = await supabase
          .from("orders")
          .select("id, restaurant_id, total, status, customer_name, items, order_number, payment_method, created_at")
          .in("restaurant_id", branchIds)
          .gte("created_at", sixtyDaysAgo.toISOString())
          .order("created_at", { ascending: false });
        allOrderRows = ords || [];
      }

      // Split into current period (last 30 days) and previous period
      const currentPeriodOrders = allOrderRows.filter(o => new Date(o.created_at) >= thirtyDaysAgo);
      const previousPeriodOrders = allOrderRows.filter(o => {
        const d = new Date(o.created_at);
        return d >= sixtyDaysAgo && d < thirtyDaysAgo;
      });

      // ── Aggregate revenue & order counts per branch ──
      const branchRevenueMap: Record<string, number> = {};
      const branchOrderCountMap: Record<string, number> = {};
      currentPeriodOrders.forEach(o => {
        const bId = o.restaurant_id;
        branchRevenueMap[bId] = (branchRevenueMap[bId] || 0) + Number(o.total || 0);
        branchOrderCountMap[bId] = (branchOrderCountMap[bId] || 0) + 1;
      });

      // Previous period totals for growth calculation
      const prevTotalRevenue = previousPeriodOrders.reduce((s, o) => s + Number(o.total || 0), 0);
      const prevTotalOrders = previousPeriodOrders.length;

      // ── Fetch expenses for real P&L ──
      let expenseRows: any[] = [];
      if (branchIds.length > 0) {
        const { data: exps } = await supabase
          .from("expenses")
          .select("restaurant_id, amount, category")
          .in("restaurant_id", branchIds)
          .gte("expense_date", thirtyDaysAgo.toISOString().split("T")[0])
          .lte("expense_date", todayStr);
        expenseRows = exps || [];
      }

      // Aggregate expenses per branch, grouped by category
      const branchExpenseMap: Record<string, Record<string, number>> = {};
      expenseRows.forEach(e => {
        const bId = e.restaurant_id;
        if (!branchExpenseMap[bId]) branchExpenseMap[bId] = {};
        const cat = (e.category || "other").toLowerCase();
        branchExpenseMap[bId][cat] = (branchExpenseMap[bId][cat] || 0) + Number(e.amount || 0);
      });

      // ── Fetch today's attendance from staff_time_clock ──
      let clockRows: any[] = [];
      if (branchIds.length > 0) {
        const { data: clocks } = await supabase
          .from("staff_time_clock")
          .select("staff_id, restaurant_id, clock_in, clock_out")
          .in("restaurant_id", branchIds)
          .gte("clock_in", `${todayStr}T00:00:00`)
          .lte("clock_in", `${todayStr}T23:59:59`);
        clockRows = clocks || [];
      }
      // Build a set of staff IDs clocked in today
      const clockedInStaffIds = new Set(clockRows.map(c => c.staff_id));

      // ── Fetch staff from staff table for payroll + better role info ──
      let staffTableRows: any[] = [];
      if (branchIds.length > 0) {
        const { data: stRows } = await supabase
          .from("staff")
          .select("id, first_name, last_name, position, salary, salary_type, restaurant_id, status, hire_date, phone")
          .in("restaurant_id", branchIds);
        staffTableRows = stRows || [];
      }

      // ── Fetch customers using get_org_customers RPC ──
      let customerRows: any[] = [];
      try {
        const { data: custData } = await supabase.rpc("get_org_customers", { p_org_id: activeOrgId });
        customerRows = custData || [];
      } catch {
        // RPC may not exist yet — fall back to direct query
        if (branchIds.length > 0) {
          const { data: custDirect } = await supabase
            .from("customers")
            .select("id, name, phone, email, loyalty_points, visit_count, total_spent, restaurant_id")
            .in("restaurant_id", branchIds);
          customerRows = (custDirect || []).map(c => ({
            customer_id: c.id,
            name: c.name,
            phone: c.phone || "",
            loyalty_points: c.loyalty_points || 0,
            visit_count: c.visit_count || 0,
            total_spent: c.total_spent || 0,
            branches_visited: [c.restaurant_id]
          }));
        }
      }

      // ── Map branches with REAL metrics ──
      const mappedBranches: MockBranch[] = branchRows.map((b, idx) => {
        const realRevenue = branchRevenueMap[b.id] || 0;
        const realOrders = branchOrderCountMap[b.id] || 0;
        const branchExps = branchExpenseMap[b.id] || {};
        const totalBranchExpenses = Object.values(branchExps).reduce((s, v) => s + v, 0);
        const profitMargin = realRevenue > 0
          ? Math.round(((realRevenue - totalBranchExpenses) / realRevenue) * 1000) / 10
          : 0;

        return {
          id: b.id,
          name: b.name,
          code: b.branch_code || `BR-${String(idx + 1).padStart(2, "0")}`,
          isHeadquarters: b.is_headquarters || false,
          manager: b.owner_name || "Branch Manager",
          managerPhone: b.owner_phone || "",
          address: b.address || "",
          city: b.city || "",
          phone: b.phone || "",
          email: b.email || "",
          status: (b.is_active === false ? "inactive" : "active") as any,
          revenue: realRevenue,
          orders: realOrders,
          profitMargin,
          rating: Number(b.rating) || 0,
          openedDate: b.created_at ? new Date(b.created_at).toISOString().split("T")[0] : "2026-01-01",
          color: colors[idx % colors.length]
        };
      });

      // ── Map staff from profiles table, with real attendance status ──
      let profileRows: any[] = [];
      if (branchIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("*")
          .in("restaurant_id", branchIds);
        profileRows = profs || [];
      }

      // Also build a lookup from staff table for leave status
      const staffStatusMap: Record<string, string> = {};
      staffTableRows.forEach(s => { staffStatusMap[s.id] = s.status || "active"; });

      const mappedStaff: MockStaffMember[] = profileRows.map(s => {
        const branchObj = mappedBranches.find(b => b.id === s.restaurant_id);
        // Determine attendance: clocked in today → present, staff table status "leave"/"inactive" → leave/absent, else absent
        let attendance: "present" | "absent" | "leave" = "absent";
        if (clockedInStaffIds.has(s.id)) {
          attendance = "present";
        } else {
          const staffStatus = staffStatusMap[s.id];
          if (staffStatus === "on_leave" || staffStatus === "leave") {
            attendance = "leave";
          }
        }

        return {
          id: s.id,
          name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Staff Member",
          role: s.role || "staff",
          branchId: s.restaurant_id || "",
          branchName: branchObj?.name || "Unassigned",
          status: attendance,
          phone: s.phone || "",
          joinDate: s.created_at ? new Date(s.created_at).toISOString().split("T")[0] : "2026-01-01"
        };
      });

      // ── Map display orders (last 50 for the UI table) ──
      const recentOrders = currentPeriodOrders.slice(0, 50);
      const mappedOrders: MockOrder[] = recentOrders.map((o, idx) => {
        const branchObj = mappedBranches.find(b => b.id === o.restaurant_id);
        const itemsStr = Array.isArray(o.items)
          ? o.items.map((item: any) => String(item).split("@")[0].trim()).join(", ")
          : "";
        return {
          id: o.id,
          orderNumber: o.order_number ? `#${o.order_number}` : `#ORD-${idx + 1000}`,
          branchId: o.restaurant_id || "",
          branchName: branchObj?.name || "Branch",
          branchColor: branchObj?.color || "#64748b",
          customer: o.customer_name || "Guest Customer",
          items: itemsStr || "Menu Order",
          amount: Number(o.total || 0),
          status: (o.status === "completed" || o.status === "ready" || o.status === "preparing" || o.status === "pending") ? o.status : "completed",
          time: o.created_at ? new Date(o.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "12:00 PM",
          date: o.created_at ? new Date(o.created_at).toISOString().split("T")[0] : todayStr,
          paymentMethod: (o.payment_method === "cash" || o.payment_method === "upi" || o.payment_method === "card") ? o.payment_method : "upi"
        };
      });

      // ── Fetch inventory ──
      let invItems: any[] = [];
      if (branchIds.length > 0) {
        const { data: invs } = await supabase
          .from("inventory_items")
          .select("*")
          .in("restaurant_id", branchIds);
        invItems = invs || [];
      }

      const mappedInventory: MockInventoryItem[] = invItems.map(i => {
        const branchObj = mappedBranches.find(b => b.id === i.restaurant_id);
        const qty = Number(i.quantity || 0);
        const reorder = Number(i.reorder_level || 10);
        return {
          id: i.id,
          name: i.name,
          category: i.category || "General",
          branchId: i.restaurant_id || "",
          branchName: branchObj?.name || "Branch",
          quantity: qty,
          unit: i.pricing_unit || "kg",
          reorderLevel: reorder,
          status: qty <= reorder * 0.5 ? "critical" : qty <= reorder ? "low" : "ok"
        };
      });

      // ── Map menu items ──
      const mappedMenuItems: MockMenuItem[] = menuRows.map(m => {
        const branchesAssigned = mappedBranches.map(b => b.id);
        return {
          id: m.id,
          name: m.name,
          category: m.category || "General",
          price: Number(m.price || 0),
          origin: (m.origin === "master" || m.origin === "branch" || m.origin === "inherited") ? m.origin : "branch",
          isAvailable: m.is_available ?? true,
          branches: branchesAssigned
        };
      });

      // ── Map team members ──
      const memberUserIds = memberRows.map(m => m.user_id);
      let teamProfiles: any[] = [];
      if (memberUserIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", memberUserIds);
        teamProfiles = profs || [];
      }

      const mappedTeam = memberRows.map(m => {
        const prof = teamProfiles.find(p => p.id === m.user_id);
        return {
          id: m.id,
          name: prof ? `${prof.first_name || ""} ${prof.last_name || ""}`.trim() : "Team Member",
          email: prof?.email || "",
          role: m.role as OrgRole || "viewer",
          accessibleBranches: m.accessible_branches,
          joinedAt: m.created_at ? new Date(m.created_at).toISOString().split("T")[0] : "2026-01-01"
        };
      });

      // ── Map customers ──
      const mappedCustomers: MockCustomer[] = customerRows.map((c: any) => {
        const pts = Number(c.loyalty_points || 0);
        let tier: "Silver" | "Gold" | "Platinum" = "Silver";
        if (pts >= 800) tier = "Platinum";
        else if (pts >= 300) tier = "Gold";
        return {
          id: c.customer_id || c.id,
          name: c.name || "Customer",
          phone: c.phone || "",
          email: c.email || undefined,
          loyaltyPoints: pts,
          totalVisits: Number(c.visit_count || 0),
          totalSpent: Number(c.total_spent || 0),
          branchesVisited: c.branches_visited || [],
          tier
        };
      });

      // ── Map payroll from staff table ──
      const mappedPayroll: MockPayrollEntry[] = staffTableRows.map(s => {
        const branchObj = mappedBranches.find(b => b.id === s.restaurant_id);
        const baseSalary = Number(s.salary || 0);
        const deductions = Math.round(baseSalary * 0.05); // 5% standard deduction estimate
        return {
          id: `pr-${s.id}`,
          staffId: s.id,
          staffName: `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Staff",
          branchId: s.restaurant_id || "",
          branchName: branchObj?.name || "Branch",
          role: s.position || "Staff",
          baseSalary,
          deductions,
          netPay: baseSalary - deductions,
          payPeriod: now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
        };
      });

      // ── P&L with real expenses ──
      // Map expense categories to P&L fields
      const expCategoryMap: Record<string, string> = {
        "food": "foodCost", "food cost": "foodCost", "food & beverage": "foodCost",
        "ingredients": "foodCost", "raw materials": "foodCost",
        "labor": "laborCost", "labour": "laborCost", "salary": "laborCost",
        "salaries": "laborCost", "wages": "laborCost", "staff": "laborCost",
        "rent": "rent", "lease": "rent",
        "utilities": "utilities", "electricity": "utilities", "water": "utilities",
        "marketing": "marketing", "advertising": "marketing", "promotion": "marketing",
      };

      const mappedPnL: MockPnLBranch[] = mappedBranches.map(b => {
        const revenue = b.revenue; // already real from orders aggregation
        const branchExps = branchExpenseMap[b.id] || {};
        const pnlCosts: Record<string, number> = {
          foodCost: 0, laborCost: 0, rent: 0, utilities: 0, marketing: 0, other: 0
        };

        Object.entries(branchExps).forEach(([cat, amt]) => {
          const mapped = expCategoryMap[cat];
          if (mapped && mapped in pnlCosts) {
            pnlCosts[mapped] += amt;
          } else {
            pnlCosts.other += amt;
          }
        });

        return {
          branchId: b.id,
          branchName: b.name,
          color: b.color,
          revenue,
          foodCost: Math.round(pnlCosts.foodCost),
          laborCost: Math.round(pnlCosts.laborCost),
          rent: Math.round(pnlCosts.rent),
          utilities: Math.round(pnlCosts.utilities),
          marketing: Math.round(pnlCosts.marketing),
          other: Math.round(pnlCosts.other)
        };
      });

      // ── KPI Aggregation with real growth ──
      const totalRev = mappedPnL.reduce((s, b) => s + b.revenue, 0);
      const totalExp = mappedPnL.reduce((s, b) =>
        s + b.foodCost + b.laborCost + b.rent + b.utilities + b.marketing + b.other, 0);
      const totalOrdCount = currentPeriodOrders.length;

      // Growth: compare current 30 days vs previous 30 days
      const revenueGrowth = prevTotalRevenue > 0
        ? Math.round(((totalRev - prevTotalRevenue) / prevTotalRevenue) * 1000) / 10
        : 0;
      const ordersGrowth = prevTotalOrders > 0
        ? Math.round(((totalOrdCount - prevTotalOrders) / prevTotalOrders) * 1000) / 10
        : 0;

      // Real average rating from branches
      const branchesWithRating = mappedBranches.filter(b => b.rating > 0);
      const avgRating = branchesWithRating.length > 0
        ? Math.round((branchesWithRating.reduce((s, b) => s + b.rating, 0) / branchesWithRating.length) * 10) / 10
        : 0;

      const kpis = {
        totalRevenue: totalRev,
        revenueGrowth,
        totalOrders: totalOrdCount,
        ordersGrowth,
        activeBranches: mappedBranches.filter(b => b.status === "active").length,
        totalBranches: mappedBranches.length,
        avgRating,
        netProfit: totalRev - totalExp,
        totalExpenses: totalExp
      };

      // ── Revenue Trend: last 7 days from real orders ──
      const revenueTrend: Record<string, any>[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
        const dayKey = d.toISOString().split("T")[0];

        const point: Record<string, any> = { date: dateStr };
        mappedBranches.forEach(b => {
          const key = b.name.split(" ")[0].toLowerCase();
          const dayOrders = currentPeriodOrders.filter(o =>
            o.restaurant_id === b.id && o.created_at?.startsWith(dayKey)
          );
          point[key] = dayOrders.reduce((s: number, o: any) => s + Number(o.total || 0), 0);
        });
        revenueTrend.push(point);
      }

      return {
        org: {
          id: orgRow?.id || activeOrgId,
          name: orgRow?.name || "Franchise",
          type: (orgRow?.type || "franchise") as any,
          menuMode: (orgRow?.menu_mode || "master") as any,
          ownerName,
          ownerEmail,
          plan: subRow?.plan_type ? subRow.plan_type.charAt(0).toUpperCase() + subRow.plan_type.slice(1) : "Starter",
          maxBranches: subRow?.max_branches || 5,
          logoUrl: orgRow?.logo_url || null
        },
        orgRole: activeRole,
        branches: mappedBranches,
        orders: mappedOrders,
        inventory: mappedInventory,
        staff: mappedStaff,
        payroll: mappedPayroll,
        customers: mappedCustomers,
        team: mappedTeam,
        menuItems: mappedMenuItems,
        pnlBranches: mappedPnL,
        kpis,
        revenueTrend
      };
    }
  });

  // Automatically reset branch selection if allBranches change
  const currentBranches = demoMode ? mockBranches : (dbData?.branches || []);
  useEffect(() => {
    if (currentBranch && !currentBranches.some(b => b.id === currentBranch.id)) {
      setCurrentBranch(null);
    }
  }, [currentBranches, currentBranch]);

  const addBranch = async (b: any): Promise<boolean> => {
    if (demoMode) {
      const newB: MockBranch = {
        id: `branch-${mockBranches.length + 1}`,
        name: b.name,
        code: b.code || `BR-${String(mockBranches.length + 1).padStart(2, "0")}`,
        isHeadquarters: b.isHeadquarters || false,
        manager: b.manager || "Branch Manager",
        managerPhone: b.managerPhone || "",
        address: b.address || "",
        city: b.city || "",
        phone: b.phone || "",
        email: b.email || "",
        status: "active",
        revenue: 0,
        orders: 0,
        profitMargin: 20.0,
        rating: 5.0,
        openedDate: new Date().toISOString().split("T")[0],
        color: b.color || "#3b82f6"
      };
      setMockBranches([...mockBranches, newB]);
      return true;
    } else {
      const { error } = await supabase.from("restaurants").insert({
        organization_id: org.id,
        name: b.name,
        branch_code: b.code,
        address: b.address,
        city: b.city,
        phone: b.phone,
        email: b.email,
        is_headquarters: b.isHeadquarters || false,
      });
      if (error) {
        console.error("Error creating branch:", error);
        return false;
      }
      refetch();
      return true;
    }
  };

  const updateBranch = async (id: string, b: any): Promise<boolean> => {
    if (demoMode) {
      setMockBranches(mockBranches.map(item => item.id === id ? { ...item, ...b } : item));
      return true;
    } else {
      const { error } = await supabase
        .from("restaurants")
        .update({
          name: b.name,
          branch_code: b.code,
          address: b.address,
          city: b.city,
          phone: b.phone,
          email: b.email,
          is_headquarters: b.isHeadquarters ?? false,
        })
        .eq("id", id);
      if (error) {
        console.error("Error updating branch:", error);
        return false;
      }
      refetch();
      return true;
    }
  };

  const value: FranchiseContextType = {
    demoMode,
    setDemoMode,
    org: demoMode ? MOCK_ORG : (dbData?.org || MOCK_ORG),
    orgRole: demoMode ? "owner" : (dbData?.orgRole || "viewer"),
    isFranchiseOwner: true,
    allBranches: currentBranches,
    currentBranch,
    setCurrentBranch,
    orders: demoMode ? MOCK_ORDERS : (dbData?.orders || []),
    inventory: demoMode ? MOCK_INVENTORY : (dbData?.inventory || []),
    staff: demoMode ? MOCK_STAFF : (dbData?.staff || []),
    payroll: demoMode ? MOCK_PAYROLL : (dbData?.payroll || []),
    customers: demoMode ? MOCK_CUSTOMERS : (dbData?.customers || []),
    team: demoMode ? MOCK_TEAM : (dbData?.team || []),
    menuItems: demoMode ? MOCK_MENU_ITEMS : (dbData?.menuItems || []),
    pnlBranches: demoMode ? MOCK_PNL_BRANCHES : (dbData?.pnlBranches || []),
    kpis: demoMode ? MOCK_FRANCHISE_KPIS : (dbData?.kpis || { totalRevenue: 0, revenueGrowth: 0, totalOrders: 0, ordersGrowth: 0, activeBranches: 0, totalBranches: 0, avgRating: 0, netProfit: 0, totalExpenses: 0 }),
    revenueTrend: demoMode ? MOCK_REVENUE_TREND : (dbData?.revenueTrend || []),
    formatCurrency: (amount: number) => `₹${amount.toLocaleString("en-IN")}`,
    isAllBranches: currentBranch === null,
    currentBranchLabel: currentBranch ? currentBranch.name : "All Branches",
    isLoading: !demoMode && isLoading,
    refetch,
    addBranch,
    updateBranch
  };

  return (
    <FranchiseContext.Provider value={value}>
      {children}
    </FranchiseContext.Provider>
  );
};

export const useFranchise = (): FranchiseContextType => {
  const ctx = useContext(FranchiseContext);
  if (!ctx) throw new Error("useFranchise must be used inside FranchiseProvider");
  return ctx;
};
