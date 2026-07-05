// ============================================================
// FRANCHISE MOCK DATA — Dummy data for UI prototype
// No DB queries. Swap imports with real hooks later.
// ============================================================

export type BranchStatus = "active" | "inactive" | "pending";
export type OrgRole = "owner" | "admin" | "viewer";

export interface MockBranch {
  id: string;
  name: string;
  code: string;
  isHeadquarters: boolean;
  manager: string;
  managerPhone: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  status: BranchStatus;
  revenue: number;
  orders: number;
  profitMargin: number;
  rating: number;
  openedDate: string;
  color: string; // for charts & badges
}

export interface MockOrder {
  id: string;
  orderNumber: string;
  branchId: string;
  branchName: string;
  branchColor: string;
  customer: string;
  items: string;
  amount: number;
  status: "completed" | "preparing" | "pending" | "ready" | "cancelled";
  time: string;
  date: string;
  paymentMethod: "cash" | "upi" | "card";
}

export interface MockPnLBranch {
  branchId: string;
  branchName: string;
  color: string;
  revenue: number;
  foodCost: number;
  laborCost: number;
  rent: number;
  utilities: number;
  marketing: number;
  other: number;
}

export interface MockStaffMember {
  id: string;
  name: string;
  role: string;
  branchId: string;
  branchName: string;
  status: "present" | "absent" | "leave";
  phone: string;
  joinDate: string;
}

export interface MockPayrollEntry {
  id: string;
  staffId: string;
  staffName: string;
  branchId: string;
  branchName: string;
  role: string;
  baseSalary: number;
  deductions: number;
  netPay: number;
  payPeriod: string;
}

export interface MockInventoryItem {
  id: string;
  name: string;
  category: string;
  branchId: string;
  branchName: string;
  quantity: number;
  unit: string;
  reorderLevel: number;
  status: "ok" | "low" | "critical";
}

export interface MockMenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  origin: "master" | "branch" | "inherited";
  isAvailable: boolean;
  branches: string[]; // branch IDs where it's available
  minPriceOverride?: number;
  maxPriceOverride?: number;
}

// ─── Branches ───────────────────────────────────────────────
export const MOCK_BRANCHES: MockBranch[] = [
  {
    id: "branch-1",
    name: "Mumbai HQ",
    code: "HQ",
    isHeadquarters: true,
    manager: "Amit Shah",
    managerPhone: "+91 98765 43210",
    address: "Plot 12, Andheri West",
    city: "Mumbai",
    phone: "+91 22 4567 8901",
    email: "mumbai@swadeshi.com",
    status: "active",
    revenue: 420000,
    orders: 1245,
    profitMargin: 32.5,
    rating: 4.7,
    openedDate: "2022-03-15",
    color: "#3b82f6",
  },
  {
    id: "branch-2",
    name: "Pune Branch",
    code: "BR-01",
    isHeadquarters: false,
    manager: "Priya Desai",
    managerPhone: "+91 98765 43211",
    address: "Lane 5, Koregaon Park",
    city: "Pune",
    phone: "+91 20 4567 8902",
    email: "pune@swadeshi.com",
    status: "active",
    revenue: 310000,
    orders: 987,
    profitMargin: 28.3,
    rating: 4.5,
    openedDate: "2022-09-01",
    color: "#10b981",
  },
  {
    id: "branch-3",
    name: "Nashik Branch",
    code: "BR-02",
    isHeadquarters: false,
    manager: "Vikram Patil",
    managerPhone: "+91 98765 43212",
    address: "MG Road, Nashik",
    city: "Nashik",
    phone: "+91 253 456 7890",
    email: "nashik@swadeshi.com",
    status: "active",
    revenue: 280000,
    orders: 856,
    profitMargin: 25.8,
    rating: 4.4,
    openedDate: "2023-01-20",
    color: "#8b5cf6",
  },
  {
    id: "branch-4",
    name: "Nagpur Branch",
    code: "BR-03",
    isHeadquarters: false,
    manager: "Sneha Kulkarni",
    managerPhone: "+91 98765 43213",
    address: "Sadar, Nagpur",
    city: "Nagpur",
    phone: "+91 712 456 7890",
    email: "nagpur@swadeshi.com",
    status: "active",
    revenue: 235800,
    orders: 759,
    profitMargin: 22.1,
    rating: 4.3,
    openedDate: "2023-06-10",
    color: "#f59e0b",
  },
];

// ─── Org Info ────────────────────────────────────────────────
export const MOCK_ORG = {
  id: "org-1",
  name: "Swadeshi Solutions",
  type: "franchise" as const,
  menuMode: "master" as const,
  ownerName: "Rajesh Kumar",
  ownerEmail: "rajesh@swadeshi.com",
  plan: "Enterprise",
  maxBranches: 10,
  logoUrl: null,
};

// ─── KPI Aggregates ──────────────────────────────────────────
export const MOCK_FRANCHISE_KPIS = {
  totalRevenue: 1245800,
  revenueGrowth: 18.5,
  totalOrders: 3847,
  ordersGrowth: 12.3,
  activeBranches: 4,
  totalBranches: 4,
  avgRating: 4.6,
  netProfit: 373800,
  totalExpenses: 872000,
};

// ─── Orders ──────────────────────────────────────────────────
export const MOCK_ORDERS: MockOrder[] = [
  {
    id: "ord-001", orderNumber: "#MUM-1245", branchId: "branch-1",
    branchName: "Mumbai HQ", branchColor: "#3b82f6",
    customer: "Rahul Sharma", items: "Paneer Tikka, Dal Makhani, 2x Naan",
    amount: 850, status: "completed", time: "12:34 PM", date: "2026-06-28", paymentMethod: "upi",
  },
  {
    id: "ord-002", orderNumber: "#PUN-0987", branchId: "branch-2",
    branchName: "Pune Branch", branchColor: "#10b981",
    customer: "Sneha Joshi", items: "Butter Chicken, Rice, Raita",
    amount: 620, status: "preparing", time: "12:41 PM", date: "2026-06-28", paymentMethod: "card",
  },
  {
    id: "ord-003", orderNumber: "#NAS-0856", branchId: "branch-3",
    branchName: "Nashik Branch", branchColor: "#8b5cf6",
    customer: "Vijay Patil", items: "Veg Thali (2), Lassi",
    amount: 480, status: "ready", time: "12:45 PM", date: "2026-06-28", paymentMethod: "cash",
  },
  {
    id: "ord-004", orderNumber: "#NAG-0759", branchId: "branch-4",
    branchName: "Nagpur Branch", branchColor: "#f59e0b",
    customer: "Priya Mehta", items: "Chole Bhature, Chai",
    amount: 280, status: "pending", time: "12:47 PM", date: "2026-06-28", paymentMethod: "upi",
  },
  {
    id: "ord-005", orderNumber: "#MUM-1244", branchId: "branch-1",
    branchName: "Mumbai HQ", branchColor: "#3b82f6",
    customer: "Arjun Nair", items: "Fish Curry, Rice, Papad",
    amount: 750, status: "completed", time: "12:20 PM", date: "2026-06-28", paymentMethod: "card",
  },
  {
    id: "ord-006", orderNumber: "#PUN-0986", branchId: "branch-2",
    branchName: "Pune Branch", branchColor: "#10b981",
    customer: "Kavya Reddy", items: "Masala Dosa, Filter Coffee",
    amount: 320, status: "completed", time: "12:15 PM", date: "2026-06-28", paymentMethod: "upi",
  },
  {
    id: "ord-007", orderNumber: "#MUM-1243", branchId: "branch-1",
    branchName: "Mumbai HQ", branchColor: "#3b82f6",
    customer: "Rohan Singh", items: "Chicken Biryani, Raita, Mirchi",
    amount: 920, status: "completed", time: "12:10 PM", date: "2026-06-28", paymentMethod: "cash",
  },
  {
    id: "ord-008", orderNumber: "#NAG-0758", branchId: "branch-4",
    branchName: "Nagpur Branch", branchColor: "#f59e0b",
    customer: "Meena Desai", items: "Sabudana Khichdi, Tea",
    amount: 180, status: "completed", time: "12:05 PM", date: "2026-06-28", paymentMethod: "cash",
  },
];

// ─── P&L ────────────────────────────────────────────────────
export const MOCK_PNL_BRANCHES: MockPnLBranch[] = [
  {
    branchId: "branch-1", branchName: "Mumbai HQ", color: "#3b82f6",
    revenue: 420000, foodCost: 126000, laborCost: 84000,
    rent: 35000, utilities: 12000, marketing: 8000, other: 5000,
  },
  {
    branchId: "branch-2", branchName: "Pune Branch", color: "#10b981",
    revenue: 310000, foodCost: 93000, laborCost: 62000,
    rent: 28000, utilities: 9000, marketing: 6000, other: 4000,
  },
  {
    branchId: "branch-3", branchName: "Nashik Branch", color: "#8b5cf6",
    revenue: 280000, foodCost: 84000, laborCost: 56000,
    rent: 22000, utilities: 8000, marketing: 5000, other: 3000,
  },
  {
    branchId: "branch-4", branchName: "Nagpur Branch", color: "#f59e0b",
    revenue: 235800, foodCost: 70740, laborCost: 47160,
    rent: 18000, utilities: 7000, marketing: 4000, other: 2500,
  },
];

// ─── Staff ──────────────────────────────────────────────────
export const MOCK_STAFF: MockStaffMember[] = [
  { id: "s1", name: "Amit Shah", role: "Manager", branchId: "branch-1", branchName: "Mumbai HQ", status: "present", phone: "+91 98765 43210", joinDate: "2022-03-15" },
  { id: "s2", name: "Ravi Kumar", role: "Chef", branchId: "branch-1", branchName: "Mumbai HQ", status: "present", phone: "+91 98765 43214", joinDate: "2022-04-01" },
  { id: "s3", name: "Priya Desai", role: "Manager", branchId: "branch-2", branchName: "Pune Branch", status: "present", phone: "+91 98765 43211", joinDate: "2022-09-01" },
  { id: "s4", name: "Anita More", role: "Chef", branchId: "branch-2", branchName: "Pune Branch", status: "absent", phone: "+91 98765 43215", joinDate: "2022-10-15" },
  { id: "s5", name: "Vikram Patil", role: "Manager", branchId: "branch-3", branchName: "Nashik Branch", status: "present", phone: "+91 98765 43212", joinDate: "2023-01-20" },
  { id: "s6", name: "Suresh Borse", role: "Waiter", branchId: "branch-3", branchName: "Nashik Branch", status: "leave", phone: "+91 98765 43216", joinDate: "2023-02-10" },
  { id: "s7", name: "Sneha Kulkarni", role: "Manager", branchId: "branch-4", branchName: "Nagpur Branch", status: "present", phone: "+91 98765 43213", joinDate: "2023-06-10" },
  { id: "s8", name: "Deepak Rao", role: "Chef", branchId: "branch-4", branchName: "Nagpur Branch", status: "present", phone: "+91 98765 43217", joinDate: "2023-07-01" },
];

// ─── Inventory ──────────────────────────────────────────────
export const MOCK_INVENTORY: MockInventoryItem[] = [
  { id: "inv1", name: "Basmati Rice", category: "Grains", branchId: "branch-1", branchName: "Mumbai HQ", quantity: 45, unit: "kg", reorderLevel: 20, status: "ok" },
  { id: "inv2", name: "Chicken", category: "Protein", branchId: "branch-1", branchName: "Mumbai HQ", quantity: 8, unit: "kg", reorderLevel: 10, status: "low" },
  { id: "inv3", name: "Tomatoes", category: "Vegetables", branchId: "branch-2", branchName: "Pune Branch", quantity: 3, unit: "kg", reorderLevel: 5, status: "critical" },
  { id: "inv4", name: "Paneer", category: "Dairy", branchId: "branch-2", branchName: "Pune Branch", quantity: 12, unit: "kg", reorderLevel: 5, status: "ok" },
  { id: "inv5", name: "Dal Makhani Mix", category: "Grains", branchId: "branch-3", branchName: "Nashik Branch", quantity: 6, unit: "kg", reorderLevel: 8, status: "low" },
  { id: "inv6", name: "Cooking Oil", category: "Oils", branchId: "branch-4", branchName: "Nagpur Branch", quantity: 25, unit: "l", reorderLevel: 10, status: "ok" },
];

// ─── Menu Items ─────────────────────────────────────────────
export const MOCK_MENU_ITEMS: MockMenuItem[] = [
  { id: "m1", name: "Paneer Tikka", category: "Starters", price: 280, origin: "master", isAvailable: true, branches: ["branch-1", "branch-2", "branch-3", "branch-4"], minPriceOverride: 250, maxPriceOverride: 350 },
  { id: "m2", name: "Butter Chicken", category: "Main Course", price: 320, origin: "master", isAvailable: true, branches: ["branch-1", "branch-2", "branch-3", "branch-4"], minPriceOverride: 300, maxPriceOverride: 400 },
  { id: "m3", name: "Dal Makhani", category: "Main Course", price: 240, origin: "master", isAvailable: true, branches: ["branch-1", "branch-2", "branch-3", "branch-4"], minPriceOverride: 200, maxPriceOverride: 300 },
  { id: "m4", name: "Chicken Biryani", category: "Rice", price: 380, origin: "master", isAvailable: true, branches: ["branch-1", "branch-2", "branch-3", "branch-4"], minPriceOverride: 350, maxPriceOverride: 450 },
  { id: "m5", name: "Mumbai Vada Pav Special", category: "Starters", price: 80, origin: "branch", isAvailable: true, branches: ["branch-1"] },
  { id: "m6", name: "Pune Misal Pav", category: "Breakfast", price: 120, origin: "branch", isAvailable: true, branches: ["branch-2"] },
  { id: "m7", name: "Nashik Sabudana Khichdi", category: "Breakfast", price: 100, origin: "branch", isAvailable: true, branches: ["branch-3"] },
  { id: "m8", name: "Gulab Jamun", category: "Desserts", price: 80, origin: "inherited", isAvailable: true, branches: ["branch-1", "branch-2"], minPriceOverride: 60, maxPriceOverride: 100 },
];

// ─── Team Members (Org Level) ────────────────────────────────
export const MOCK_TEAM = [
  { id: "t1", name: "Rajesh Kumar", email: "rajesh@swadeshi.com", role: "owner" as OrgRole, accessibleBranches: null, joinedAt: "2022-03-01" },
  { id: "t2", name: "Sonal Mehta", email: "sonal@swadeshi.com", role: "admin" as OrgRole, accessibleBranches: ["branch-1", "branch-2"], joinedAt: "2022-06-15" },
  { id: "t3", name: "Deepak Sharma", email: "deepak@swadeshi.com", role: "viewer" as OrgRole, accessibleBranches: ["branch-3", "branch-4"], joinedAt: "2023-02-01" },
];

// ─── Revenue by date (last 7 days, per branch) ───────────────
export const MOCK_REVENUE_TREND = [
  { date: "Jun 22", mumbai: 58000, pune: 42000, nashik: 38000, nagpur: 32000 },
  { date: "Jun 23", mumbai: 62000, pune: 45000, nashik: 41000, nagpur: 35000 },
  { date: "Jun 24", mumbai: 55000, pune: 39000, nashik: 36000, nagpur: 30000 },
  { date: "Jun 25", mumbai: 71000, pune: 52000, nashik: 47000, nagpur: 40000 },
  { date: "Jun 26", mumbai: 68000, pune: 48000, nashik: 43000, nagpur: 36000 },
  { date: "Jun 27", mumbai: 63000, pune: 44000, nashik: 40000, nagpur: 33000 },
  { date: "Jun 28", mumbai: 42000, pune: 31000, nashik: 28000, nagpur: 23580 },
];

// ─── Helper ──────────────────────────────────────────────────
export const getBranchById = (id: string): MockBranch | undefined =>
  MOCK_BRANCHES.find((b) => b.id === id);

export const formatCurrency = (amount: number): string =>
  `₹${amount.toLocaleString("en-IN")}`;

export const getPnLTotals = () => {
  return MOCK_PNL_BRANCHES.reduce(
    (acc, b) => {
      const totalExpenses = b.foodCost + b.laborCost + b.rent + b.utilities + b.marketing + b.other;
      return {
        revenue: acc.revenue + b.revenue,
        expenses: acc.expenses + totalExpenses,
        profit: acc.profit + (b.revenue - totalExpenses),
      };
    },
    { revenue: 0, expenses: 0, profit: 0 }
  );
};

export const MOCK_PAYROLL: MockPayrollEntry[] = [
  { id: "pr1", staffId: "s1", staffName: "Amit Shah", branchId: "branch-1", branchName: "Mumbai HQ", role: "Manager", baseSalary: 45000, deductions: 2000, netPay: 43000, payPeriod: "June 2026" },
  { id: "pr2", staffId: "s2", staffName: "Ravi Kumar", branchId: "branch-1", branchName: "Mumbai HQ", role: "Chef", baseSalary: 35000, deductions: 1500, netPay: 33500, payPeriod: "June 2026" },
  { id: "pr3", staffId: "s3", staffName: "Priya Desai", branchId: "branch-2", branchName: "Pune Branch", role: "Manager", baseSalary: 42000, deductions: 1800, netPay: 40200, payPeriod: "June 2026" },
  { id: "pr4", staffId: "s4", staffName: "Anita More", branchId: "branch-2", branchName: "Pune Branch", role: "Chef", baseSalary: 32000, deductions: 1000, netPay: 31000, payPeriod: "June 2026" },
  { id: "pr5", staffId: "s5", staffName: "Vikram Patil", branchId: "branch-3", branchName: "Nashik Branch", role: "Manager", baseSalary: 40000, deductions: 1500, netPay: 38500, payPeriod: "June 2026" },
  { id: "pr6", staffId: "s6", staffName: "Suresh Borse", branchId: "branch-3", branchName: "Nashik Branch", role: "Waiter", baseSalary: 18000, deductions: 500, netPay: 17500, payPeriod: "June 2026" },
  { id: "pr7", staffId: "s7", staffName: "Sneha Kulkarni", branchId: "branch-4", branchName: "Nagpur Branch", role: "Manager", baseSalary: 38000, deductions: 1200, netPay: 36800, payPeriod: "June 2026" },
  { id: "pr8", staffId: "s8", staffName: "Deepak Rao", branchId: "branch-4", branchName: "Nagpur Branch", role: "Chef", baseSalary: 30000, deductions: 1000, netPay: 29000, payPeriod: "June 2026" },
];

export interface MockCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  loyaltyPoints: number;
  totalVisits: number;
  totalSpent: number;
  branchesVisited: string[];
  tier: "Silver" | "Gold" | "Platinum";
}

export const MOCK_CUSTOMERS: MockCustomer[] = [
  { id: "c1", name: "Ramesh Pawar", phone: "+91 98765 43210", email: "ramesh@gmail.com", loyaltyPoints: 450, totalVisits: 18, totalSpent: 9200, branchesVisited: ["BOM-01", "PNQ-02"], tier: "Gold" },
  { id: "c2", name: "Sunita Deshmukh", phone: "+91 87654 32109", email: "sunita@yahoo.com", loyaltyPoints: 890, totalVisits: 32, totalSpent: 18500, branchesVisited: ["BOM-01", "PNQ-02", "NSK-03"], tier: "Platinum" },
  { id: "c3", name: "Vijay Shinde", phone: "+91 76543 21098", email: "vijay@outlook.com", loyaltyPoints: 120, totalVisits: 5, totalSpent: 2600, branchesVisited: ["PNQ-02"], tier: "Silver" },
  { id: "c4", name: "Ketan Joshi", phone: "+91 95432 10987", email: "ketan@gmail.com", loyaltyPoints: 340, totalVisits: 14, totalSpent: 6800, branchesVisited: ["BOM-01", "NAG-04"], tier: "Gold" },
  { id: "c5", name: "Pooja Patil", phone: "+91 84321 09876", email: "pooja@gmail.com", loyaltyPoints: 50, totalVisits: 2, totalSpent: 1100, branchesVisited: ["NSK-03"], tier: "Silver" },
];

