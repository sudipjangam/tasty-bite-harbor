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

      // Query organization + subscription
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
      if (orgRow?.owner_user_id) {
        const { data: ownerProf } = await supabase
          .from("profiles")
          .select("first_name, last_name, email")
          .eq("id", orgRow.owner_user_id)
          .maybeSingle();
        if (ownerProf) {
          ownerName = `${ownerProf.first_name || ""} ${ownerProf.last_name || ""}`.trim() || ownerName;
          ownerEmail = ownerProf.email || "";
        }
      }

      // Map branches
      const branchIds = branchRows.map(b => b.id);
      const mappedBranches: MockBranch[] = branchRows.map((b, idx) => {
        const colors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899"];
        return {
          id: b.id,
          name: b.name,
          code: b.branch_code || `BR-${String(idx + 1).padStart(2, "0")}`,
          isHeadquarters: b.is_headquarters || false,
          manager: "Branch Manager",
          managerPhone: "",
          address: b.address || "",
          city: b.city || "",
          phone: b.phone || "",
          email: b.email || "",
          status: "active",
          revenue: 150000 + (idx * 45000), // mock baseline metrics for live branches
          orders: 500 + (idx * 120),
          profitMargin: 25.0 + (idx * 1.5),
          rating: 4.2 + (idx * 0.1),
          openedDate: b.created_at ? new Date(b.created_at).toISOString().split("T")[0] : "2026-01-01",
          color: colors[idx % colors.length]
        };
      });

      // Fetch profiles (staff) for these branches
      let staffRows: any[] = [];
      if (branchIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("*")
          .in("restaurant_id", branchIds);
        staffRows = profs || [];
      }

      const mappedStaff: MockStaffMember[] = staffRows.map((s, idx) => {
        const branchObj = mappedBranches.find(b => b.id === s.restaurant_id);
        return {
          id: s.id,
          name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Staff Member",
          role: s.role || "staff",
          branchId: s.restaurant_id || "",
          branchName: branchObj?.name || "Unassigned",
          status: "present",
          phone: s.phone || "",
          joinDate: s.created_at ? new Date(s.created_at).toISOString().split("T")[0] : "2026-01-01"
        };
      });

      // Fetch orders for these branches
      let orderRows: any[] = [];
      if (branchIds.length > 0) {
        const { data: ords } = await supabase
          .from("orders")
          .select("*")
          .in("restaurant_id", branchIds)
          .order("created_at", { ascending: false })
          .limit(50);
        orderRows = ords || [];
      }

      const mappedOrders: MockOrder[] = orderRows.map((o, idx) => {
        const branchObj = mappedBranches.find(b => b.id === o.restaurant_id);
        // format items display
        const itemsStr = Array.isArray(o.items) 
          ? o.items.map(item => String(item).split("@")[0].trim()).join(", ")
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
          date: o.created_at ? new Date(o.created_at).toISOString().split("T")[0] : "2026-06-28",
          paymentMethod: (o.payment_method === "cash" || o.payment_method === "upi" || o.payment_method === "card") ? o.payment_method : "upi"
        };
      });

      // Fetch inventory for these branches
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

      // Map menu items
      const mappedMenuItems: MockMenuItem[] = menuRows.map(m => {
        const branchesAssigned = mappedBranches.map(b => b.id); // for simplicity, assume all branches
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

      // Fetch profiles for team list
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

      // P&L calculation
      const mappedPnL: MockPnLBranch[] = mappedBranches.map(b => {
        const branchOrders = mappedOrders.filter(o => o.branchId === b.id);
        const revenue = branchOrders.reduce((s, o) => s + o.amount, 0) || b.revenue;
        return {
          branchId: b.id,
          branchName: b.name,
          color: b.color,
          revenue,
          foodCost: Math.round(revenue * 0.3),
          laborCost: Math.round(revenue * 0.2),
          rent: Math.round(b.revenue * 0.08),
          utilities: Math.round(b.revenue * 0.03),
          marketing: Math.round(b.revenue * 0.02),
          other: Math.round(b.revenue * 0.01)
        };
      });

      // KPI Aggregation
      const totalRev = mappedPnL.reduce((s, b) => s + b.revenue, 0);
      const totalExp = mappedPnL.reduce((s, b) => {
        return s + b.foodCost + b.laborCost + b.rent + b.utilities + b.marketing + b.other;
      }, 0);
      const kpis = {
        totalRevenue: totalRev,
        revenueGrowth: 15.4,
        totalOrders: mappedOrders.length || 2450,
        ordersGrowth: 10.2,
        activeBranches: mappedBranches.length,
        totalBranches: mappedBranches.length,
        avgRating: 4.5,
        netProfit: totalRev - totalExp,
        totalExpenses: totalExp
      };

      return {
        org: {
          id: orgRow?.id || activeOrgId,
          name: orgRow?.name || "Swadeshi Solutions",
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
        team: mappedTeam,
        menuItems: mappedMenuItems,
        pnlBranches: mappedPnL,
        kpis
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
    kpis: demoMode ? MOCK_FRANCHISE_KPIS : (dbData?.kpis || MOCK_FRANCHISE_KPIS),
    revenueTrend: (() => {
      if (demoMode) return MOCK_REVENUE_TREND;
      const dates = ["Jun 22", "Jun 23", "Jun 24", "Jun 25", "Jun 26", "Jun 27", "Jun 28"];
      return dates.map((dateStr, idx) => {
        const d: Record<string, any> = { date: dateStr };
        currentBranches.forEach((b, bIdx) => {
          const key = b.name.split(" ")[0].toLowerCase();
          d[key] = Math.round((b.revenue / 7) * (0.8 + idx * 0.05 + bIdx * 0.02));
        });
        return d;
      });
    })(),
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
