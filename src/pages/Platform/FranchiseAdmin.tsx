import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SwadeshiLoader from "@/styles/Loader/SwadeshiLoader";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus,
  Building2,
  Search,
  Edit,
  Trash2,
  Eye,
  ChevronRight,
  MapPin,
  Phone,
  Mail,
  Users,
  CreditCard,
  ShieldCheck,
  GitBranch,
  Crown,
  Star,
  TrendingUp,
  IndianRupee,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Settings,
  FileText,
  UserPlus,
  Store,
  Layers,
  BarChart3,
  Globe,
  Utensils,
  ArrowRight,
  ArrowLeft,
  Save,
  Upload,
  AlertTriangle,
  Zap,
  Shield,
  Package,
  Lock,
  Unlock,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────
interface FranchiseOrgRow {
  id: string;
  name: string;
  slug: string | null;
  type: string | null;
  owner_user_id: string | null;
  menu_mode: string | null;
  logo_url: string | null;
  settings: any;
  created_at: string | null;
  updated_at: string | null;
  // Joined data
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  branch_count?: number;
  plan_type?: string;
  max_branches?: number;
  sub_status?: string;
}

interface FranchiseBranch {
  id: string;
  orgId: string;
  name: string;
  code: string;
  city: string;
  address: string;
  manager: string;
  managerPhone: string;
  status: "active" | "inactive" | "setup";
  orders: number;
  revenue: number;
}

interface FranchisePlan {
  id: string;
  name: string;
  tier: "starter" | "growth" | "professional" | "enterprise";
  priceMonthly: number;
  priceYearly: number;
  maxBranches: number;
  features: string[];
  isActive: boolean;
  subscriberCount: number;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  orgId: string;
  branchAccess: string[];
  status: "active" | "invited" | "disabled";
  joinedAt: string;
}

// ─── Fetch Functions ───────────────────────────────────────
const fetchFranchises = async (): Promise<FranchiseOrgRow[]> => {
  // Get all organizations
  const { data: orgs, error: orgErr } = await supabase
    .from("organizations")
    .select("*")
    .order("created_at", { ascending: false });
  if (orgErr) throw orgErr;
  if (!orgs?.length) return [];

  // Get members with profiles for owner info
  const { data: members } = await supabase
    .from("organization_members")
    .select("organization_id, user_id, role")
    .eq("role", "owner");

  // Get owner profiles
  const ownerIds = (members || []).map(m => m.user_id);
  const { data: profiles } = ownerIds.length > 0
    ? await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, phone")
        .in("id", ownerIds)
    : { data: [] };

  // Get branch counts per org
  const { data: branches } = await supabase
    .from("restaurants")
    .select("organization_id")
    .not("organization_id", "is", null);

  const branchCounts: Record<string, number> = {};
  (branches || []).forEach(b => {
    if (b.organization_id) {
      branchCounts[b.organization_id] = (branchCounts[b.organization_id] || 0) + 1;
    }
  });

  // Get subscriptions
  const { data: subs } = await supabase
    .from("organization_subscriptions")
    .select("organization_id, plan_type, max_branches, status");

  const subMap: Record<string, any> = {};
  (subs || []).forEach(s => { subMap[s.organization_id] = s; });

  const memberMap: Record<string, string> = {};
  (members || []).forEach(m => { memberMap[m.organization_id] = m.user_id; });

  const profileMap: Record<string, any> = {};
  (profiles || []).forEach(p => { profileMap[p.id] = p; });

  return orgs.map(org => {
    const ownerId = memberMap[org.id];
    const profile = ownerId ? profileMap[ownerId] : null;
    const sub = subMap[org.id];
    return {
      ...org,
      owner_name: profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : "—",
      owner_email: profile?.email || "—",
      owner_phone: profile?.phone || "—",
      branch_count: branchCounts[org.id] || 0,
      plan_type: sub?.plan_type || "—",
      max_branches: sub?.max_branches || 0,
      sub_status: sub?.status || "—",
    };
  });
};

const MOCK_BRANCHES: FranchiseBranch[] = [
  { id: "br-1", orgId: "org-1", name: "Spice Route - Andheri", code: "SR-MUM-01", city: "Mumbai", address: "123 Link Road, Andheri West", manager: "Amit Kumar", managerPhone: "+91 99887 11001", status: "active", orders: 2450, revenue: 1250000 },
  { id: "br-2", orgId: "org-1", name: "Spice Route - Bandra", code: "SR-MUM-02", city: "Mumbai", address: "45 Hill Road, Bandra", manager: "Sneha Joshi", managerPhone: "+91 99887 11002", status: "active", orders: 3100, revenue: 1600000 },
  { id: "br-3", orgId: "org-1", name: "Spice Route - Pune", code: "SR-PUN-01", city: "Pune", address: "78 FC Road, Shivajinagar", manager: "Rohan Deshmukh", managerPhone: "+91 99887 11003", status: "active", orders: 1800, revenue: 920000 },
  { id: "br-4", orgId: "org-1", name: "Spice Route - Thane", code: "SR-THN-01", city: "Thane", address: "12 Ghodbunder Road", manager: "Pooja Nair", managerPhone: "+91 99887 11004", status: "active", orders: 1500, revenue: 680000 },
  { id: "br-5", orgId: "org-1", name: "Spice Route - Nagpur", code: "SR-NGP-01", city: "Nagpur", address: "34 Dharampeth", manager: "Vijay Patil", managerPhone: "+91 99887 11005", status: "setup", orders: 0, revenue: 0 },
  { id: "br-6", orgId: "org-2", name: "Tandoori Tales - SG Highway", code: "TT-AHM-01", city: "Ahmedabad", address: "SG Highway, Bodakdev", manager: "Ravi Mehta", managerPhone: "+91 98765 22001", status: "active", orders: 1900, revenue: 850000 },
  { id: "br-7", orgId: "org-2", name: "Tandoori Tales - Vastrapur", code: "TT-AHM-02", city: "Ahmedabad", address: "Vastrapur Lake Road", manager: "Kavita Shah", managerPhone: "+91 98765 22002", status: "active", orders: 1600, revenue: 720000 },
  { id: "br-8", orgId: "org-2", name: "Tandoori Tales - Surat", code: "TT-SRT-01", city: "Surat", address: "Athwa Gate", manager: "Deepak Patel", managerPhone: "+91 98765 22003", status: "active", orders: 1200, revenue: 530000 },
];

const MOCK_FRANCHISE_PLANS: FranchisePlan[] = [
  {
    id: "fp-1",
    name: "Franchise Starter",
    tier: "starter",
    priceMonthly: 2999,
    priceYearly: 29990,
    maxBranches: 2,
    features: [
      "Up to 2 branches",
      "Basic cross-branch reports",
      "Centralized menu management",
      "Email support",
      "Basic inventory sync",
    ],
    isActive: true,
    subscriberCount: 8,
  },
  {
    id: "fp-2",
    name: "Franchise Growth",
    tier: "growth",
    priceMonthly: 6999,
    priceYearly: 69990,
    maxBranches: 5,
    features: [
      "Up to 5 branches",
      "Advanced P&L reports",
      "Cross-branch inventory transfer",
      "Staff roaming",
      "Bulk vendor orders",
      "Priority email & chat support",
      "Menu sync with overrides",
    ],
    isActive: true,
    subscriberCount: 15,
  },
  {
    id: "fp-3",
    name: "Franchise Professional",
    tier: "professional",
    priceMonthly: 14999,
    priceYearly: 149990,
    maxBranches: 10,
    features: [
      "Up to 10 branches",
      "Real-time cross-branch analytics",
      "Audit trail & compliance",
      "Custom role management",
      "API access",
      "Dedicated account manager",
      "White-label branding",
      "Advanced inventory & vendor management",
    ],
    isActive: true,
    subscriberCount: 6,
  },
  {
    id: "fp-4",
    name: "Franchise Enterprise",
    tier: "enterprise",
    priceMonthly: 49999,
    priceYearly: 499990,
    maxBranches: 50,
    features: [
      "Up to 50 branches",
      "Everything in Professional",
      "Multi-city operations",
      "SLA guarantee (99.9%)",
      "Custom integrations",
      "On-premise deployment option",
      "24/7 phone + video support",
      "Custom training & onboarding",
      "Regulatory compliance pack",
    ],
    isActive: true,
    subscriberCount: 2,
  },
];

const MOCK_STAFF: StaffMember[] = [
  { id: "s1", name: "Rajesh Sharma", email: "rajesh@spiceroute.in", role: "Organization Owner", orgId: "org-1", branchAccess: ["All Branches"], status: "active", joinedAt: "2024-03-15" },
  { id: "s2", name: "Amit Kumar", email: "amit@spiceroute.in", role: "Branch Manager", orgId: "org-1", branchAccess: ["Andheri"], status: "active", joinedAt: "2024-04-01" },
  { id: "s3", name: "Sneha Joshi", email: "sneha@spiceroute.in", role: "Branch Manager", orgId: "org-1", branchAccess: ["Bandra"], status: "active", joinedAt: "2024-04-15" },
  { id: "s4", name: "Rohan Deshmukh", email: "rohan@spiceroute.in", role: "Regional Manager", orgId: "org-1", branchAccess: ["Pune", "Nagpur"], status: "active", joinedAt: "2024-05-01" },
  { id: "s5", name: "Finance Team", email: "finance@spiceroute.in", role: "Finance Viewer", orgId: "org-1", branchAccess: ["All Branches"], status: "active", joinedAt: "2024-06-01" },
  { id: "s6", name: "New Hire", email: "newhire@spiceroute.in", role: "Staff", orgId: "org-1", branchAccess: ["Thane"], status: "invited", joinedAt: "2026-06-20" },
];

// Rich mock franchises for demo/presentation mode
const MOCK_FRANCHISES: FranchiseOrgRow[] = [
  {
    id: "org-1", name: "Spice Route Restaurants", slug: "spice-route", type: "franchise",
    owner_user_id: "user-1", menu_mode: "master", logo_url: null,
    settings: { gstNumber: "27AAPCS5014K1ZK", fssaiNumber: "11225330000145", city: "Mumbai", state: "Maharashtra" },
    created_at: "2024-03-15T10:00:00Z", updated_at: "2026-06-01T10:00:00Z",
    owner_name: "Rajesh Sharma", owner_email: "rajesh@spiceroute.in", owner_phone: "+91 98765 43210",
    branch_count: 5, plan_type: "professional", max_branches: 10, sub_status: "active",
  },
  {
    id: "org-2", name: "Tandoori Tales", slug: "tandoori-tales", type: "franchise",
    owner_user_id: "user-2", menu_mode: "independent", logo_url: null,
    settings: { gstNumber: "24AAFCT3453Q1ZV", fssaiNumber: "10014011001246", city: "Ahmedabad", state: "Gujarat" },
    created_at: "2024-06-01T10:00:00Z", updated_at: "2026-05-15T10:00:00Z",
    owner_name: "Priya Mehta", owner_email: "priya@tandooritales.com", owner_phone: "+91 98765 11223",
    branch_count: 3, plan_type: "growth", max_branches: 5, sub_status: "active",
  },
  {
    id: "org-3", name: "Dosa Delights", slug: "dosa-delights", type: "franchise",
    owner_user_id: "user-3", menu_mode: "shared", logo_url: null,
    settings: { gstNumber: "29AAECS4872N1ZH", fssaiNumber: "11222620000421", city: "Bengaluru", state: "Karnataka" },
    created_at: "2024-09-10T10:00:00Z", updated_at: "2026-04-20T10:00:00Z",
    owner_name: "Suresh Iyer", owner_email: "suresh@dosadelights.in", owner_phone: "+91 99887 54321",
    branch_count: 2, plan_type: "starter", max_branches: 2, sub_status: "trial",
  },
  {
    id: "org-4", name: "Biryani Brothers", slug: "biryani-brothers", type: "franchise",
    owner_user_id: "user-4", menu_mode: "master", logo_url: null,
    settings: { gstNumber: "36AACCB1234M1ZP", fssaiNumber: "11525330003312", city: "Hyderabad", state: "Telangana" },
    created_at: "2025-01-20T10:00:00Z", updated_at: "2026-06-10T10:00:00Z",
    owner_name: "Mohammed Khan", owner_email: "khan@biryanibrothers.in", owner_phone: "+91 91234 56789",
    branch_count: 7, plan_type: "enterprise", max_branches: 50, sub_status: "active",
  },
];

const FRANCHISE_ROLES = [
  { name: "Organization Owner", description: "Full access to all branches and settings", level: "org", color: "from-amber-500 to-yellow-500" },
  { name: "Regional Manager", description: "Manage multiple branches in a region", level: "org", color: "from-purple-500 to-indigo-500" },
  { name: "Branch Manager", description: "Full access to assigned branch only", level: "branch", color: "from-blue-500 to-cyan-500" },
  { name: "Finance Viewer", description: "Read-only access to P&L and financial data", level: "org", color: "from-emerald-500 to-green-500" },
  { name: "Inventory Manager", description: "Manage stock across assigned branches", level: "branch", color: "from-orange-500 to-red-500" },
  { name: "Staff", description: "Basic POS access at assigned branch", level: "branch", color: "from-gray-500 to-slate-500" },
];

// ─── Formatters ──────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

type Tab = "franchises" | "onboarding" | "branches" | "staff" | "plans";

const TIER_COLORS: Record<string, string> = {
  starter: "from-gray-500 to-slate-600",
  growth: "from-blue-500 to-indigo-600",
  professional: "from-purple-500 to-violet-600",
  enterprise: "from-amber-500 to-orange-600",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: "Active", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400", icon: CheckCircle2 },
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400", icon: Clock },
  suspended: { label: "Suspended", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400", icon: XCircle },
  trial: { label: "Trial", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400", icon: Zap },
  setup: { label: "Setting Up", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400", icon: Settings },
  inactive: { label: "Inactive", color: "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-400", icon: XCircle },
  invited: { label: "Invited", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400", icon: Mail },
  disabled: { label: "Disabled", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400", icon: XCircle },
};

// ═════════════════════════════════════════════════════════════
// Main Component
// ═════════════════════════════════════════════════════════════
const FranchiseAdmin = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("franchises");
  const [search, setSearch] = useState("");

  // Demo mode toggle — persisted in localStorage
  const [demoMode, setDemoMode] = useState<boolean>(() => {
    try { return localStorage.getItem("franchise_demo_mode") === "true"; } catch { return false; }
  });
  const toggleDemoMode = (val: boolean) => {
    setDemoMode(val);
    try { localStorage.setItem("franchise_demo_mode", String(val)); } catch {}
  };

  // Real DB Data Query
  const { data: livefranchises = [], isLoading, error } = useQuery({
    queryKey: ["franchises"],
    queryFn: fetchFranchises,
  });

  // Onboarding wizard
  const [wizardStep, setWizardStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState({
    orgName: "",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    ownerPassword: "",
    gstNumber: "",
    fssaiNumber: "",
    city: "",
    state: "",
    plan: "Franchise Starter", // Default plan selection
    branchName: "",
    branchCode: "HQ",
    branchAddress: "",
    branchCity: "",
  });

  // Staff tab state
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [addStaffDialog, setAddStaffDialog] = useState(false);
  const [addStaffData, setAddStaffData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    role: "staff" as string,
    restaurantId: "",
  });

  // Detail dialog
  const [selectedFranchise, setSelectedFranchise] = useState<FranchiseOrgRow | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editData, setEditData] = useState<FranchiseOrgRow | null>(null);

  // Plan editing
  const [editPlan, setEditPlan] = useState<FranchisePlan | null>(null);

  // Real staff query — org members + branch profiles
  const { data: orgStaff = [], isLoading: staffLoading, refetch: refetchStaff } = useQuery({
    queryKey: ["org-staff", selectedOrgId],
    enabled: !!selectedOrgId,
    queryFn: async () => {
      // 1. Org-level members
      const { data: members } = await supabase
        .from("organization_members")
        .select("id, role, user_id, created_at")
        .eq("organization_id", selectedOrgId);

      const orgMemberIds = (members || []).map((m) => m.user_id);

      // 2. All branches for this org
      const { data: branches } = await supabase
        .from("restaurants")
        .select("id, name, branch_code")
        .eq("organization_id", selectedOrgId);

      const branchIds = (branches || []).map((b) => b.id);

      // 3. All profiles attached to any branch of this org
      const { data: branchProfiles } =
        branchIds.length > 0
          ? await supabase
              .from("profiles")
              .select("id, first_name, last_name, email, phone, role, restaurant_id, created_at")
              .in("restaurant_id", branchIds)
          : { data: [] };

      // 4. Profiles for org-level members (may not have a branch)
      const { data: memberProfiles } =
        orgMemberIds.length > 0
          ? await supabase
              .from("profiles")
              .select("id, first_name, last_name, email, phone, role, restaurant_id, created_at")
              .in("id", orgMemberIds)
          : { data: [] };

      const branchMap: Record<string, string> = {};
      (branches || []).forEach((b) => {
        branchMap[b.id] = `${b.name} (${b.branch_code})`;
      });

      const memberRoleMap: Record<string, string> = {};
      (members || []).forEach((m) => {
        memberRoleMap[m.user_id] = m.role;
      });

      // Merge: deduplicate by user id
      const allProfileIds = new Set<string>();
      const merged: any[] = [];

      for (const p of [...(memberProfiles || []), ...(branchProfiles || [])]) {
        if (!allProfileIds.has(p.id)) {
          allProfileIds.add(p.id);
          merged.push({
            ...p,
            orgRole: memberRoleMap[p.id] || null,
            branchName: p.restaurant_id ? branchMap[p.restaurant_id] || "—" : "—",
            displayName: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "—",
          });
        }
      }
      return merged;
    },
  });

  // Branches for selected org (for add-staff dropdown)
  const { data: orgBranches = [] } = useQuery({
    queryKey: ["org-branches", selectedOrgId],
    enabled: !!selectedOrgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("id, name, branch_code")
        .eq("organization_id", selectedOrgId);
      return data || [];
    },
  });

  // Add staff mutation
  const addStaffMutation = useMutation({
    mutationFn: async () => {
      // Call existing user-management edge function (same pattern as CreateUserDialog)
      const { data, error } = await supabase.functions.invoke("user-management", {
        body: JSON.stringify({
          action: "create_user",
          userData: {
            email: addStaffData.email,
            password: addStaffData.password,
            first_name: addStaffData.firstName,
            last_name: addStaffData.lastName,
            phone: addStaffData.phone,
            role: addStaffData.role,
            restaurant_id: addStaffData.restaurantId || undefined,
          },
        }),
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Failed to create staff member");

      // If it's an org-level role, insert into organization_members
      const orgLevelRoles = ["owner", "admin", "viewer"];
      if (orgLevelRoles.includes(addStaffData.role) && selectedOrgId) {
        const newUserId = data.user?.id;
        if (newUserId) {
          await supabase.from("organization_members").insert({
            organization_id: selectedOrgId,
            user_id: newUserId,
            role: addStaffData.role === "viewer" ? "viewer" : "member",
          });
        }
      }

      return data;
    },
    onSuccess: () => {
      toast.success("Staff member created!", {
        description: `${addStaffData.firstName} ${addStaffData.lastName} has been added.`,
      });
      setAddStaffDialog(false);
      setAddStaffData({ firstName: "", lastName: "", email: "", password: "", phone: "", role: "staff", restaurantId: "" });
      refetchStaff();
    },
    onError: (err: any) => {
      toast.error("Failed to add staff", { description: err.message });
    },
  });

  // Mutation for onboarding franchise
  const onboardMutation = useMutation({
    mutationFn: async () => {
      const planTierMap: Record<string, string> = {
        "Franchise Starter": "starter",
        "Franchise Growth": "growth",
        "Franchise Professional": "professional",
        "Franchise Enterprise": "enterprise"
      };
      const selectedPlanTier = planTierMap[onboardingData.plan] || "starter";
      const maxBranchesMap: Record<string, number> = {
        "Franchise Starter": 2,
        "Franchise Growth": 5,
        "Franchise Professional": 10,
        "Franchise Enterprise": 50
      };
      const maxBranches = maxBranchesMap[onboardingData.plan] || 5;

      // 1. Create org + HQ restaurant + subscription atomically via RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "create_franchise_organization",
        {
          p_org_name: onboardingData.orgName,
          p_org_type: "franchise",
          p_menu_mode: "independent",
          p_hq_name: onboardingData.branchName || `${onboardingData.orgName} HQ`,
          p_hq_branch_code: onboardingData.branchCode || "HQ",
          p_plan_type: selectedPlanTier,
          p_max_branches: maxBranches
        }
      );
      if (rpcError) throw rpcError;
      const { organization_id, restaurant_id } = rpcData as { organization_id: string; restaurant_id: string };

      // 2. Create the owner user account via user-management edge function
      //    Same pattern as CreateUserDialog.tsx
      let ownerUserId: string | null = null;
      const nameParts = onboardingData.ownerName.trim().split(" ");
      const firstName = nameParts[0] || onboardingData.ownerName;
      const lastName = nameParts.slice(1).join(" ");

      if (onboardingData.ownerPassword.trim()) {
        const { data: createUserData, error: createUserError } = await supabase.functions.invoke(
          "user-management",
          {
            body: JSON.stringify({
              action: "create_user",
              userData: {
                email: onboardingData.ownerEmail.trim(),
                password: onboardingData.ownerPassword,
                first_name: firstName,
                last_name: lastName,
                phone: onboardingData.ownerPhone,
                role: "owner",
                restaurant_id: restaurant_id,
              },
            }),
          }
        );

        if (createUserError) {
          const isConflict = 
            (createUserError as any).status === 409 || 
            String(createUserError.message).includes("already") || 
            String(createUserError.message).includes("409") ||
            (createUserData as any)?.error?.includes("already");

          if (isConflict) {
            const { data: existingProfile } = await supabase
              .from("profiles")
              .select("id")
              .eq("email", onboardingData.ownerEmail.trim())
              .maybeSingle();
            if (existingProfile) {
              ownerUserId = existingProfile.id;
              toast.info("Owner account already exists — linking to organization.");
            } else {
              throw new Error(createUserError.message || "Email already registered but profile not found.");
            }
          } else {
            throw new Error(createUserError.message || "Failed to create owner account");
          }
        } else if (createUserData?.success) {
          ownerUserId = createUserData.user?.id || null;
        } else if (createUserData?.error) {
          throw new Error(createUserData.error);
        }
      } else {
        // No password provided — try to find existing user by email
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", onboardingData.ownerEmail.trim())
          .maybeSingle();
        ownerUserId = existingProfile?.id || null;
        if (!ownerUserId) {
          toast.warning("No password provided. Owner account not created — franchise created without an owner login.");
        }
      }

      // 3. Update org with settings (GST, FSSAI) and owner_user_id
      const settings = {
        gstNumber: onboardingData.gstNumber,
        fssaiNumber: onboardingData.fssaiNumber,
        city: onboardingData.city,
        state: onboardingData.state,
      };
      const { error: updateOrgError } = await supabase
        .from("organizations")
        .update({ owner_user_id: ownerUserId, settings })
        .eq("id", organization_id);
      if (updateOrgError) throw updateOrgError;

      // 4. Update HQ restaurant with address
      const { error: updateRestError } = await supabase
        .from("restaurants")
        .update({
          address: onboardingData.branchAddress,
          city: onboardingData.branchCity || onboardingData.city,
        })
        .eq("id", restaurant_id);
      if (updateRestError) throw updateRestError;

      // 5. Insert organization_members row for owner
      if (ownerUserId) {
        const { error: memberError } = await supabase
          .from("organization_members")
          .insert({ organization_id, user_id: ownerUserId, role: "owner" });
        if (memberError) console.warn("Could not create org member row:", memberError.message);
      }

      return { organization_id, orgName: onboardingData.orgName };
    },
    onSuccess: (data) => {
      toast.success("Franchise onboarded successfully!", {
        description: `${data.orgName} has been created and synced.`,
      });
      queryClient.invalidateQueries({ queryKey: ["franchises"] });
      setWizardStep(0);
      setOnboardingData({
        orgName: "", ownerName: "", ownerEmail: "", ownerPhone: "", ownerPassword: "",
        gstNumber: "", fssaiNumber: "", city: "", state: "",
        plan: "Franchise Starter", branchName: "", branchCode: "HQ", branchAddress: "", branchCity: "",
      });
      setActiveTab("franchises");
    },
    onError: (err: any) => {
      toast.error("Failed to onboard franchise", { description: err.message });
    }
  });

  const handleOnboardSubmit = () => {
    // Basic validation
    if (!onboardingData.orgName.trim()) {
      toast.error("Organization Name is required");
      return;
    }
    if (!onboardingData.ownerName.trim() || !onboardingData.ownerEmail.trim()) {
      toast.error("Owner name and email are required");
      return;
    }
    if (!onboardingData.branchName.trim() || !onboardingData.branchCode.trim()) {
      toast.error("Branch name and branch code are required");
      return;
    }
    if (onboardingData.ownerPassword && onboardingData.ownerPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    onboardMutation.mutate();
  };

  const tabs: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: "franchises", label: "All Franchises", icon: Building2, count: demoMode ? MOCK_FRANCHISES.length : livefranchises.length },
    { id: "onboarding", label: "Onboard New", icon: UserPlus },
    { id: "branches", label: "Branches", icon: GitBranch, count: demoMode ? MOCK_BRANCHES.length : undefined },
    { id: "staff", label: "Staff & Roles", icon: Users, count: demoMode ? MOCK_STAFF.length : undefined },
    { id: "plans", label: "Franchise Plans", icon: CreditCard, count: MOCK_FRANCHISE_PLANS.length },
  ];

  // Active data source — demo vs live
  const franchises = demoMode ? MOCK_FRANCHISES : livefranchises;

  // ── KPI Cards ──────────────────────────────────────
  const kpis = useMemo(() => {
    if (demoMode) {
      return [
        { label: "Total Franchises", value: "4", sub: "4 active", gradient: "from-violet-500 to-purple-600", icon: Building2 },
        { label: "Total Branches", value: "17", sub: "across all orgs", gradient: "from-blue-500 to-indigo-600", icon: GitBranch },
        { label: "Franchise MRR", value: fmt(432000), sub: "monthly recurring", gradient: "from-emerald-500 to-teal-600", icon: IndianRupee },
        { label: "Total Revenue", value: fmt(52400000), sub: "FY 2025-26", gradient: "from-amber-500 to-orange-600", icon: TrendingUp },
      ];
    }
    const totalRevenue = livefranchises.length * 1250000;
    const totalBranches = livefranchises.reduce((s, f) => s + (f.branch_count || 0), 0);
    const activeFranchises = livefranchises.filter((f) => f.sub_status === "active" || f.sub_status === "—").length;
    const mrr = MOCK_FRANCHISE_PLANS.reduce((s, p) => s + p.priceMonthly * p.subscriberCount, 0);
    return [
      { label: "Total Franchises", value: livefranchises.length.toString(), sub: `${activeFranchises} active`, gradient: "from-violet-500 to-purple-600", icon: Building2 },
      { label: "Total Branches", value: totalBranches.toString(), sub: "across all orgs", gradient: "from-blue-500 to-indigo-600", icon: GitBranch },
      { label: "Franchise MRR", value: fmt(mrr), sub: "monthly recurring", gradient: "from-emerald-500 to-teal-600", icon: IndianRupee },
      { label: "Total Revenue", value: fmt(totalRevenue), sub: "all franchises", gradient: "from-amber-500 to-orange-600", icon: TrendingUp },
    ];
  }, [demoMode, livefranchises]);

  // ── Filtered franchises ────────────────────────────
  const filteredFranchises = useMemo(() => {
    if (!search) return franchises;
    const q = search.toLowerCase();
    return franchises.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.owner_name && f.owner_name.toLowerCase().includes(q)) ||
        (f.settings && typeof f.settings === 'object' && 'city' in f.settings && String(f.settings.city).toLowerCase().includes(q))
    );
  }, [search, franchises]);

  // ── Wizard Steps ───────────────────────────────────
  const WIZARD_STEPS = [
    { title: "Organization Details", icon: Building2 },
    { title: "Owner Information", icon: Crown },
    { title: "Compliance & Location", icon: FileText },
    { title: "Select Plan", icon: CreditCard },
    { title: "First Branch", icon: Store },
    { title: "Review & Confirm", icon: CheckCircle2 },
  ];

  const oldHandleOnboardSubmit = () => {
    // Just a placeholder to consume old target range
  };

  // ─── Render ────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-purple-500/30">
              <Building2 className="h-6 w-6" />
            </div>
            Franchise Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Onboard, manage, and monitor all franchise organizations
          </p>
        </div>
        {/* Demo Mode Toggle */}
        <div className={cn(
          "flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all",
          demoMode
            ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-500/30"
            : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/50"
        )}>
          <div className="flex flex-col">
            <span className={cn(
              "text-xs font-bold",
              demoMode ? "text-amber-700 dark:text-amber-400" : "text-slate-700 dark:text-slate-300"
            )}>
              {demoMode ? "🎭 Demo Mode" : "🔴 Live Mode"}
            </span>
            <span className="text-[10px] text-slate-400">
              {demoMode ? "Showing sample data" : "Connected to real DB"}
            </span>
          </div>
          <Switch
            checked={demoMode}
            onCheckedChange={toggleDemoMode}
            className={demoMode ? "data-[state=checked]:bg-amber-500" : ""}
          />
        </div>
      </div>

      {/* Demo Mode Banner */}
      {demoMode && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <span className="font-bold">Demo Mode Active</span> — All data shown is sample/placeholder data for presentation purposes. Toggle off to view real franchise data from the database.
          </p>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className={cn(
                "relative overflow-hidden rounded-2xl p-4 md:p-5 text-white shadow-lg",
                `bg-gradient-to-br ${kpi.gradient}`
              )}
            >
              <div className="absolute top-2 right-2 opacity-20">
                <Icon className="h-10 w-10 md:h-12 md:w-12" />
              </div>
              <p className="text-xs md:text-sm font-medium text-white/80">{kpi.label}</p>
              <p className="text-xl md:text-2xl font-bold mt-1">{kpi.value}</p>
              <p className="text-[11px] md:text-xs text-white/60 mt-0.5">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap",
                active
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count !== undefined && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    active
                      ? "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300"
                      : ""
                  )}
                >
                  {tab.count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* TAB: ALL FRANCHISES                            */}
      {/* ═══════════════════════════════════════════════ */}
      {activeTab === "franchises" && (
        <div className="space-y-4">
          {/* Search + Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search franchises by name, owner, city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>
            <Button
              onClick={() => setActiveTab("onboarding")}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-purple-500/20 gap-2"
            >
              <Plus className="h-4 w-4" />
              Onboard Franchise
            </Button>
          </div>

          {/* Franchise Cards */}
          <div className="grid gap-4">
            {filteredFranchises.map((f) => {
              const displayStatus = f.sub_status === "active" || f.sub_status === "—" ? "active" : f.sub_status || "pending";
              const statusCfg = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.pending;
              const StatusIcon = statusCfg.icon;
              const planTier = String(f.plan_type || "starter").toLowerCase();
              const planTierColor = TIER_COLORS[planTier] || TIER_COLORS.starter;
              const city = f.settings && typeof f.settings === 'object' && 'city' in f.settings ? String(f.settings.city) : "—";
              const state = f.settings && typeof f.settings === 'object' && 'state' in f.settings ? String(f.settings.state) : "—";

              return (
                <div
                  key={f.id}
                  className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 md:p-5 hover:shadow-lg hover:border-violet-300 dark:hover:border-violet-500/30 transition-all duration-300 group"
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Left: Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={cn("p-2 rounded-xl bg-gradient-to-br text-white shadow-md", planTierColor)}>
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 dark:text-white text-base md:text-lg truncate">
                            {f.name}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <Crown className="h-3 w-3" />
                            <span>{f.owner_name}</span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <MapPin className="h-3 w-3" />
                            <span>{city}, {state}</span>
                          </div>
                        </div>
                      </div>

                      {/* Tags row */}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge className={cn("text-[10px] font-semibold border-0", statusCfg.color)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusCfg.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] border-slate-200 dark:border-slate-700">
                          <CreditCard className="h-3 w-3 mr-1" />
                          {f.plan_type}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] border-slate-200 dark:border-slate-700">
                          <GitBranch className="h-3 w-3 mr-1" />
                          {f.branch_count}/{f.max_branches} branches
                        </Badge>
                        <Badge variant="outline" className="text-[10px] border-slate-200 dark:border-slate-700">
                          <Calendar className="h-3 w-3 mr-1" />
                          Since {f.created_at ? new Date(f.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—"}
                        </Badge>
                      </div>
                    </div>

                    {/* Right: Revenue + Actions */}
                    <div className="flex items-center gap-3 md:flex-col md:items-end">
                      <div className="text-right">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Revenue</p>
                        <p className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">
                          {fmt((f.branch_count || 1) * 1250000)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 text-xs"
                          onClick={() => {
                            setSelectedFranchise(f);
                            setDetailDialog(true);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">View</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 text-xs"
                          onClick={() => {
                            setEditData({ ...f });
                            setEditDialog(true);
                          }}
                        >
                          <Edit className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* TAB: ONBOARDING WIZARD                         */}
      {/* ═══════════════════════════════════════════════ */}
      {activeTab === "onboarding" && (
        <div className="space-y-6">
          {/* Step indicator */}
          <div className="flex items-center justify-between gap-1 px-2 overflow-x-auto">
            {WIZARD_STEPS.map((step, i) => {
              const StepIcon = step.icon;
              const done = i < wizardStep;
              const current = i === wizardStep;
              return (
                <div key={i} className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => i <= wizardStep && setWizardStep(i)}
                    className={cn(
                      "flex items-center gap-1.5 px-2 md:px-3 py-2 rounded-lg text-xs font-medium transition-all",
                      current
                        ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-purple-500/20"
                        : done
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                    )}
                  >
                    {done ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <StepIcon className="h-3.5 w-3.5" />
                    )}
                    <span className="hidden md:inline">{step.title}</span>
                    <span className="md:hidden">{i + 1}</span>
                  </button>
                  {i < WIZARD_STEPS.length - 1 && (
                    <ChevronRight className={cn("h-4 w-4 flex-shrink-0", done ? "text-emerald-400" : "text-slate-300 dark:text-slate-600")} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Wizard Content Card */}
          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 md:p-8 shadow-sm">
            <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white mb-1">
              {WIZARD_STEPS[wizardStep].title}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              {wizardStep === 0 && "Enter the franchise organization's basic details."}
              {wizardStep === 1 && "Who will own and manage this franchise?"}
              {wizardStep === 2 && "GST, FSSAI, and location details for compliance."}
              {wizardStep === 3 && "Choose the right franchise subscription plan."}
              {wizardStep === 4 && "Set up the first branch / headquarters."}
              {wizardStep === 5 && "Review all details before creating the franchise."}
            </p>

            {/* Step 0: Organization Details */}
            {wizardStep === 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Organization Name *</Label>
                  <Input
                    className="mt-1.5 bg-slate-50 dark:bg-slate-900"
                    placeholder="e.g. Spice Route Restaurants"
                    value={onboardingData.orgName}
                    onChange={(e) => setOnboardingData((d) => ({ ...d, orgName: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* Step 1: Owner Info */}
            {wizardStep === 1 && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Owner Full Name *</Label>
                  <Input
                    className="mt-1.5 bg-slate-50 dark:bg-slate-900"
                    placeholder="e.g. Rajesh Sharma"
                    value={onboardingData.ownerName}
                    onChange={(e) => setOnboardingData((d) => ({ ...d, ownerName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email *</Label>
                  <Input
                    type="email"
                    className="mt-1.5 bg-slate-50 dark:bg-slate-900"
                    placeholder="owner@franchise.com"
                    value={onboardingData.ownerEmail}
                    onChange={(e) => setOnboardingData((d) => ({ ...d, ownerEmail: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Phone *</Label>
                  <Input
                    className="mt-1.5 bg-slate-50 dark:bg-slate-900"
                    placeholder="+91 98765 43210"
                    value={onboardingData.ownerPhone}
                    onChange={(e) => setOnboardingData((d) => ({ ...d, ownerPhone: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Login Password *</Label>
                  <Input
                    type="password"
                    className="mt-1.5 bg-slate-50 dark:bg-slate-900"
                    placeholder="Min 8 characters — used to create owner's login account"
                    value={onboardingData.ownerPassword}
                    onChange={(e) => setOnboardingData((d) => ({ ...d, ownerPassword: e.target.value }))}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Leave blank to skip login creation (can be set up later).</p>
                </div>
              </div>
            )}

            {/* Step 2: Compliance */}
            {wizardStep === 2 && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">GST Number</Label>
                  <Input
                    className="mt-1.5 bg-slate-50 dark:bg-slate-900"
                    placeholder="27AABCS1234D1Z5"
                    value={onboardingData.gstNumber}
                    onChange={(e) => setOnboardingData((d) => ({ ...d, gstNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">FSSAI License</Label>
                  <Input
                    className="mt-1.5 bg-slate-50 dark:bg-slate-900"
                    placeholder="11219999000123"
                    value={onboardingData.fssaiNumber}
                    onChange={(e) => setOnboardingData((d) => ({ ...d, fssaiNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">City *</Label>
                  <Input
                    className="mt-1.5 bg-slate-50 dark:bg-slate-900"
                    placeholder="Mumbai"
                    value={onboardingData.city}
                    onChange={(e) => setOnboardingData((d) => ({ ...d, city: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">State *</Label>
                  <Input
                    className="mt-1.5 bg-slate-50 dark:bg-slate-900"
                    placeholder="Maharashtra"
                    value={onboardingData.state}
                    onChange={(e) => setOnboardingData((d) => ({ ...d, state: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Select Plan */}
            {wizardStep === 3 && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {MOCK_FRANCHISE_PLANS.map((plan) => {
                  const selected = onboardingData.plan === plan.name;
                  return (
                    <button
                      key={plan.id}
                      onClick={() => setOnboardingData((d) => ({ ...d, plan: plan.name }))}
                      className={cn(
                        "text-left rounded-2xl border-2 p-4 md:p-5 transition-all duration-300 relative overflow-hidden",
                        selected
                          ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20 shadow-lg shadow-violet-500/20 scale-[1.02]"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:border-violet-300 dark:hover:border-violet-500/30 hover:shadow-md"
                      )}
                    >
                      {selected && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 className="h-5 w-5 text-violet-600" />
                        </div>
                      )}
                      <div className={cn("inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold text-white mb-3", `bg-gradient-to-r ${TIER_COLORS[plan.tier]}`)}>
                        {plan.tier.toUpperCase()}
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">{plan.name}</h3>
                      <div className="mt-2">
                        <span className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">{fmt(plan.priceMonthly)}</span>
                        <span className="text-xs text-slate-500">/month</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Up to {plan.maxBranches} branches
                      </p>
                      <ul className="mt-3 space-y-1">
                        {plan.features.slice(0, 4).map((feat) => (
                          <li key={feat} className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                            {feat}
                          </li>
                        ))}
                        {plan.features.length > 4 && (
                          <li className="text-[10px] text-slate-400">+{plan.features.length - 4} more</li>
                        )}
                      </ul>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Step 4: First Branch */}
            {wizardStep === 4 && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Branch Name *</Label>
                  <Input
                    className="mt-1.5 bg-slate-50 dark:bg-slate-900"
                    placeholder="e.g. Main Branch - Andheri"
                    value={onboardingData.branchName}
                    onChange={(e) => setOnboardingData((d) => ({ ...d, branchName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Branch Code *</Label>
                  <Input
                    className="mt-1.5 bg-slate-50 dark:bg-slate-900"
                    placeholder="e.g. SR-MUM-01"
                    value={onboardingData.branchCode}
                    onChange={(e) => setOnboardingData((d) => ({ ...d, branchCode: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">City *</Label>
                  <Input
                    className="mt-1.5 bg-slate-50 dark:bg-slate-900"
                    placeholder="Mumbai"
                    value={onboardingData.branchCity}
                    onChange={(e) => setOnboardingData((d) => ({ ...d, branchCity: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Full Address *</Label>
                  <Textarea
                    className="mt-1.5 bg-slate-50 dark:bg-slate-900"
                    placeholder="123 Link Road, Andheri West, Mumbai - 400053"
                    value={onboardingData.branchAddress}
                    onChange={(e) => setOnboardingData((d) => ({ ...d, branchAddress: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* Step 5: Review */}
            {wizardStep === 5 && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl p-5 border border-violet-200/50 dark:border-violet-500/20">
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-violet-600" />
                    Review Summary
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      { label: "Organization", value: onboardingData.orgName },
                      { label: "Owner", value: onboardingData.ownerName },
                      { label: "Email", value: onboardingData.ownerEmail },
                      { label: "Phone", value: onboardingData.ownerPhone },
                      { label: "GST", value: onboardingData.gstNumber || "—" },
                      { label: "FSSAI", value: onboardingData.fssaiNumber || "—" },
                      { label: "Location", value: `${onboardingData.city}, ${onboardingData.state}` },
                      { label: "Plan", value: onboardingData.plan || "—" },
                      { label: "Branch", value: onboardingData.branchName },
                      { label: "Branch Code", value: onboardingData.branchCode },
                      { label: "Branch City", value: onboardingData.branchCity },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-violet-200/30 dark:border-violet-500/10">
                        <span className="text-xs text-slate-500 dark:text-slate-400">{item.label}</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{item.value || "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-500/20">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    This will create the organization, invite the owner via email, set up the first branch, and activate the selected subscription plan.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button
                variant="outline"
                disabled={wizardStep === 0}
                onClick={() => setWizardStep((s) => s - 1)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>
              {wizardStep < WIZARD_STEPS.length - 1 ? (
                <Button
                  onClick={() => setWizardStep((s) => s + 1)}
                  className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleOnboardSubmit}
                  className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Create Franchise
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* TAB: BRANCHES                                  */}
      {/* ═══════════════════════════════════════════════ */}
      {activeTab === "branches" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search branches..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          {/* Group by Org */}
          {(demoMode ? MOCK_FRANCHISES : franchises).map((org) => {
            const orgBranches = demoMode ? MOCK_BRANCHES.filter((b) => b.orgId === org.id) : [];
            if (!orgBranches.length && demoMode) return null;
            if (!demoMode) return (
              <div key={org.id} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl p-8 text-center">
                <GitBranch className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Live branch listing coming soon. Enable Demo Mode to preview.</p>
              </div>
            );
            const q = search.toLowerCase();
            const filtered = q
              ? orgBranches.filter((b) => b.name.toLowerCase().includes(q) || b.city.toLowerCase().includes(q))
              : orgBranches;
            if (!filtered.length) return null;
            const planTier = String(org.plan_type || "starter").toLowerCase();
            const tierColor = TIER_COLORS[planTier] || TIER_COLORS.starter;

            return (
              <div key={org.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-lg bg-gradient-to-br text-white", tierColor)}>
                    <Building2 className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">{org.name}</h3>
                  <Badge variant="outline" className="text-[10px]">{filtered.length} branches</Badge>
                </div>

                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((br) => {
                    const statusCfg = STATUS_CONFIG[br.status];
                    const StatusIcon = statusCfg.icon;
                    return (
                      <div
                        key={br.id}
                        className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 hover:shadow-md hover:border-violet-300 dark:hover:border-violet-500/30 transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">{br.name}</h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" /> {br.city} • {br.code}
                            </p>
                          </div>
                          <Badge className={cn("text-[10px] border-0", statusCfg.color)}>
                            <StatusIcon className="h-3 w-3 mr-1" /> {statusCfg.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                          <Users className="h-3 w-3" /> {br.manager}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                          <div>
                            <p className="text-[10px] text-slate-400">Orders</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{br.orders.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400">Revenue</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{fmt(br.revenue)}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline" className="h-7 text-[11px] flex-1 gap-1">
                            <Eye className="h-3 w-3" /> View
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-[11px] flex-1 gap-1">
                            <Edit className="h-3 w-3" /> Edit
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* TAB: STAFF & ROLES                             */}
      {/* ═══════════════════════════════════════════════ */}
      {activeTab === "staff" && (
        <div className="space-y-6">
          {/* Org Selector */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Select Organization</Label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="Choose a franchise organization..." />
                </SelectTrigger>
                <SelectContent>
                  {franchises.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedOrgId && (
              <Button
                size="sm"
                className="gap-1.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs mt-5 sm:mt-0"
                onClick={() => setAddStaffDialog(true)}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Add Staff
              </Button>
            )}
          </div>

          {/* Roles Reference Grid */}
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-3 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-violet-500" />
              Franchise Roles
            </h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {FRANCHISE_ROLES.map((role) => (
                <div
                  key={role.name}
                  className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg bg-gradient-to-br text-white", role.color)}>
                      <Shield className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{role.name}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{role.description}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {role.level === "org" ? "Organization Level" : "Branch Level"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Staff Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                {selectedOrgId
                  ? `Staff Members — ${franchises.find(f => f.id === selectedOrgId)?.name || ""}`
                  : "Staff Members"}
              </h3>
            </div>

            {!selectedOrgId && !demoMode ? (
              <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl p-10 text-center">
                <Users className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Select an organization above to view its staff members.</p>
              </div>
            ) : !demoMode && staffLoading ? (
              <div className="flex items-center justify-center p-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
              </div>
            ) : (
            <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Name</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Email</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Role</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Branch</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(demoMode ? MOCK_STAFF : orgStaff).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-sm text-slate-400 italic">No staff members found.</td>
                      </tr>
                    ) : (demoMode ? MOCK_STAFF : orgStaff).map((s) => (
                        <tr
                          key={s.id}
                          className="border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{demoMode ? (s as any).name : (s as any).displayName}</td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-xs">{s.email || "—"}</td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-[10px]">{demoMode ? (s as any).role : ((s as any).orgRole || (s as any).role || "staff")}</Badge>
                          </td>
                          <td className="py-3 px-4">
                            {demoMode
                              ? <div className="flex flex-wrap gap-1">{((s as any).branchAccess || []).map((b: string) => <Badge key={b} variant="secondary" className="text-[10px]">{b}</Badge>)}</div>
                              : <Badge variant="secondary" className="text-[10px]">{(s as any).branchName}</Badge>
                            }
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500">
                            {demoMode ? (s as any).joinedAt : ((s as any).created_at ? new Date((s as any).created_at).toLocaleDateString("en-IN") : "—")}
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            )}
          </div>
        </div>
      )}

      {/* Add Staff Dialog */}
      <Dialog open={addStaffDialog} onOpenChange={setAddStaffDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-violet-500" />
              Add Staff Member
            </DialogTitle>
            <DialogDescription>Create a new login account and add them to the franchise.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 grid-cols-2">
            <div>
              <Label className="text-xs">First Name *</Label>
              <Input
                className="mt-1 bg-slate-50 dark:bg-slate-900"
                value={addStaffData.firstName}
                onChange={(e) => setAddStaffData((d) => ({ ...d, firstName: e.target.value }))}
                placeholder="Rajesh"
              />
            </div>
            <div>
              <Label className="text-xs">Last Name</Label>
              <Input
                className="mt-1 bg-slate-50 dark:bg-slate-900"
                value={addStaffData.lastName}
                onChange={(e) => setAddStaffData((d) => ({ ...d, lastName: e.target.value }))}
                placeholder="Sharma"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Email *</Label>
              <Input
                type="email"
                className="mt-1 bg-slate-50 dark:bg-slate-900"
                value={addStaffData.email}
                onChange={(e) => setAddStaffData((d) => ({ ...d, email: e.target.value }))}
                placeholder="rajesh@franchise.com"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Password *</Label>
              <Input
                type="password"
                className="mt-1 bg-slate-50 dark:bg-slate-900"
                value={addStaffData.password}
                onChange={(e) => setAddStaffData((d) => ({ ...d, password: e.target.value }))}
                placeholder="Min 8 characters"
              />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input
                className="mt-1 bg-slate-50 dark:bg-slate-900"
                value={addStaffData.phone}
                onChange={(e) => setAddStaffData((d) => ({ ...d, phone: e.target.value }))}
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <Label className="text-xs">Role *</Label>
              <Select value={addStaffData.role} onValueChange={(v) => setAddStaffData((d) => ({ ...d, role: v }))}>
                <SelectTrigger className="mt-1 bg-slate-50 dark:bg-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Organization Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Branch Manager</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="viewer">Finance Viewer</SelectItem>
                  <SelectItem value="chef">Chef</SelectItem>
                  <SelectItem value="waiter">Waiter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Assign Branch</Label>
              <Select value={addStaffData.restaurantId} onValueChange={(v) => setAddStaffData((d) => ({ ...d, restaurantId: v }))}>
                <SelectTrigger className="mt-1 bg-slate-50 dark:bg-slate-900">
                  <SelectValue placeholder="Select a branch (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {orgBranches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.name} ({b.branch_code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddStaffDialog(false)}>Cancel</Button>
            <Button
              className="bg-gradient-to-r from-violet-600 to-purple-600 text-white gap-2"
              disabled={addStaffMutation.isPending}
              onClick={() => {
                if (!addStaffData.firstName.trim() || !addStaffData.email.trim()) {
                  toast.error("First name and email are required");
                  return;
                }
                if (!addStaffData.password || addStaffData.password.length < 8) {
                  toast.error("Password must be at least 8 characters");
                  return;
                }
                addStaffMutation.mutate();
              }}
            >
              {addStaffMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Add Staff
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════ */}
      {/* TAB: FRANCHISE PLANS                           */}
      {/* ═══════════════════════════════════════════════ */}
      {activeTab === "plans" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-amber-500" />
              Franchise Subscription Plans
            </h3>
            <Button size="sm" className="gap-1.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs">
              <Plus className="h-3.5 w-3.5" />
              New Plan
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {MOCK_FRANCHISE_PLANS.map((plan) => (
              <div
                key={plan.id}
                className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden hover:shadow-lg transition-all group"
              >
                {/* Plan header gradient */}
                <div className={cn("p-4 md:p-5 text-white relative overflow-hidden", `bg-gradient-to-br ${TIER_COLORS[plan.tier]}`)}>
                  <div className="absolute top-2 right-2 opacity-20">
                    <CreditCard className="h-10 w-10" />
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-white/20 text-white border-0 text-[10px] font-bold">
                      {plan.tier.toUpperCase()}
                    </Badge>
                    <Badge className={cn("border-0 text-[10px]", plan.isActive ? "bg-emerald-500/30 text-white" : "bg-red-500/30 text-white")}>
                      {plan.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-2xl font-bold">{fmt(plan.priceMonthly)}</span>
                    <span className="text-sm text-white/60">/mo</span>
                  </div>
                  <p className="text-xs text-white/70 mt-0.5">
                    or {fmt(plan.priceYearly)}/year (save {Math.round(100 - (plan.priceYearly / (plan.priceMonthly * 12)) * 100)}%)
                  </p>
                </div>

                {/* Plan body */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Max Branches</span>
                    <span className="font-bold text-slate-900 dark:text-white">{plan.maxBranches}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Subscribers</span>
                    <Badge variant="secondary" className="text-xs">{plan.subscriberCount}</Badge>
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-700/50 pt-3">
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">FEATURES:</p>
                    <ul className="space-y-1.5">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                          {feat}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-[11px] flex-1 gap-1"
                      onClick={() => setEditPlan(plan)}
                    >
                      <Edit className="h-3 w-3" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-[11px] gap-1"
                    >
                      {plan.isActive ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Feature Matrix */}
          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5">
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-4 flex items-center gap-2">
              <Layers className="h-5 w-5 text-violet-500" />
              Feature Comparison Matrix
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 min-w-[200px]">Feature</th>
                    {MOCK_FRANCHISE_PLANS.map((p) => (
                      <th key={p.id} className="text-center py-3 px-3 text-xs font-semibold text-slate-500 min-w-[100px]">
                        <Badge className={cn("text-white border-0 text-[10px]", `bg-gradient-to-r ${TIER_COLORS[p.tier]}`)}>{p.tier}</Badge>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feat: "Max Branches", vals: ["2", "5", "10", "50"] },
                    { feat: "Cross-Branch Reports", vals: ["Basic", "Advanced", "Real-time", "Real-time"] },
                    { feat: "Inventory Transfer", vals: ["—", "✓", "✓", "✓"] },
                    { feat: "Staff Roaming", vals: ["—", "✓", "✓", "✓"] },
                    { feat: "Audit Trail", vals: ["—", "—", "✓", "✓"] },
                    { feat: "API Access", vals: ["—", "—", "✓", "✓"] },
                    { feat: "White-Label", vals: ["—", "—", "✓", "✓"] },
                    { feat: "Custom Integrations", vals: ["—", "—", "—", "✓"] },
                    { feat: "SLA Guarantee", vals: ["—", "—", "—", "99.9%"] },
                    { feat: "On-Premise Option", vals: ["—", "—", "—", "✓"] },
                    { feat: "Support", vals: ["Email", "Email + Chat", "Dedicated AM", "24/7 Phone"] },
                  ].map((row) => (
                    <tr key={row.feat} className="border-t border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 text-xs font-medium text-slate-700 dark:text-slate-300">{row.feat}</td>
                      {row.vals.map((val, i) => (
                        <td key={i} className="py-2.5 px-3 text-center text-xs">
                          {val === "✓" ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                          ) : val === "—" ? (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          ) : (
                            <span className="text-slate-700 dark:text-slate-300 font-medium">{val}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* DIALOGS                                        */}
      {/* ═══════════════════════════════════════════════ */}

      {/* Detail Dialog */}
      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-violet-500" />
              {selectedFranchise?.name}
            </DialogTitle>
            <DialogDescription>Full franchise organization details</DialogDescription>
          </DialogHeader>
          {selectedFranchise && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Owner", value: selectedFranchise.owner_name || "—", icon: Crown },
                  { label: "Email", value: selectedFranchise.owner_email || "—", icon: Mail },
                  { label: "Phone", value: selectedFranchise.owner_phone || "—", icon: Phone },
                  { label: "Plan", value: selectedFranchise.plan_type || "—", icon: CreditCard },
                  { label: "Branches", value: `${selectedFranchise.branch_count || 0}/${selectedFranchise.max_branches || 0}`, icon: GitBranch },
                  { label: "Revenue", value: fmt((selectedFranchise.branch_count || 1) * 1250000), icon: IndianRupee },
                  { label: "GST", value: selectedFranchise.settings && typeof selectedFranchise.settings === 'object' && 'gstNumber' in selectedFranchise.settings ? String(selectedFranchise.settings.gstNumber) : "—", icon: FileText },
                  { label: "FSSAI", value: selectedFranchise.settings && typeof selectedFranchise.settings === 'object' && 'fssaiNumber' in selectedFranchise.settings ? String(selectedFranchise.settings.fssaiNumber) : "—", icon: ShieldCheck },
                  { label: "Location", value: `${selectedFranchise.settings && typeof selectedFranchise.settings === 'object' && 'city' in selectedFranchise.settings ? String(selectedFranchise.settings.city) : "—"}, ${selectedFranchise.settings && typeof selectedFranchise.settings === 'object' && 'state' in selectedFranchise.settings ? String(selectedFranchise.settings.state) : "—"}`, icon: MapPin },
                  { label: "Since", value: selectedFranchise.created_at ? new Date(selectedFranchise.created_at).toLocaleDateString("en-IN") : "—", icon: Calendar },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mb-0.5">
                        <Icon className="h-3 w-3" /> {item.label}
                      </p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{item.value}</p>
                    </div>
                  );
                })}
              </div>

              {/* Branches under this org */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">BRANCHES</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {MOCK_BRANCHES.filter((b) => b.orgId === selectedFranchise.id).map((br) => {
                    const statusCfg = STATUS_CONFIG[br.status];
                    return (
                      <div key={br.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5">
                        <div>
                          <p className="text-xs font-medium text-slate-900 dark:text-white">{br.name}</p>
                          <p className="text-[10px] text-slate-500">{br.city} • {br.code}</p>
                        </div>
                        <Badge className={cn("text-[10px] border-0", statusCfg.color)}>{statusCfg.label}</Badge>
                      </div>
                    );
                  })}
                  {MOCK_BRANCHES.filter((b) => b.orgId === selectedFranchise.id).length === 0 && (
                    <p className="text-xs text-slate-400 italic">No branches configured yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Franchise Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-violet-500" />
              Edit Franchise
            </DialogTitle>
            <DialogDescription>Update franchise organization details</DialogDescription>
          </DialogHeader>
          {editData && (
            <div className="space-y-4">
              <div className="grid gap-3 grid-cols-2">
                <div className="col-span-2">
                  <Label className="text-xs">Organization Name</Label>
                  <Input
                    className="mt-1 bg-slate-50 dark:bg-slate-900"
                    value={editData.name}
                    onChange={(e) => setEditData((d) => d ? { ...d, name: e.target.value } : d)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Owner Name</Label>
                  <Input
                    className="mt-1 bg-slate-50 dark:bg-slate-900"
                    value={editData.owner_name || ""}
                    readOnly
                  />
                </div>
                <div>
                  <Label className="text-xs">Owner Email</Label>
                  <Input
                    className="mt-1 bg-slate-50 dark:bg-slate-900"
                    value={editData.owner_email || ""}
                    readOnly
                  />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input
                    className="mt-1 bg-slate-50 dark:bg-slate-900"
                    value={editData.owner_phone || ""}
                    readOnly
                  />
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select
                    value={editData.sub_status || "active"}
                    disabled
                  >
                    <SelectTrigger className="mt-1 bg-slate-50 dark:bg-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Plan</Label>
                  <Select
                    value={editData.plan_type || "starter"}
                    disabled
                  >
                    <SelectTrigger className="mt-1 bg-slate-50 dark:bg-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_FRANCHISE_PLANS.map((p) => (
                        <SelectItem key={p.id} value={p.tier}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Max Branches</Label>
                  <Input
                    type="number"
                    className="mt-1 bg-slate-50 dark:bg-slate-900"
                    value={editData.max_branches || 0}
                    readOnly
                  />
                </div>
                <div>
                  <Label className="text-xs">GST Number</Label>
                  <Input
                    className="mt-1 bg-slate-50 dark:bg-slate-900"
                    value={editData.settings && typeof editData.settings === 'object' && 'gstNumber' in editData.settings ? String(editData.settings.gstNumber) : ""}
                    onChange={(e) => setEditData((d) => d ? { ...d, settings: { ...d.settings, gstNumber: e.target.value } } : d)}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>Cancel</Button>
            <Button
              className="bg-gradient-to-r from-violet-600 to-purple-600 text-white gap-2"
              onClick={async () => {
                if (editData) {
                  const { error } = await supabase
                    .from("organizations")
                    .update({
                      name: editData.name,
                      settings: editData.settings
                    })
                    .eq("id", editData.id);
                  if (error) {
                    toast.error("Failed to update organization");
                  } else {
                    toast.success("Franchise updated!", { description: editData.name });
                    queryClient.invalidateQueries({ queryKey: ["franchises"] });
                    setEditDialog(false);
                  }
                }
              }}
            >
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Plan Dialog */}
      <Dialog open={!!editPlan} onOpenChange={(o) => !o && setEditPlan(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-amber-500" />
              Edit Plan
            </DialogTitle>
            <DialogDescription>Modify franchise subscription plan</DialogDescription>
          </DialogHeader>
          {editPlan && (
            <div className="space-y-4">
              <div className="grid gap-3 grid-cols-2">
                <div className="col-span-2">
                  <Label className="text-xs">Plan Name</Label>
                  <Input className="mt-1 bg-slate-50 dark:bg-slate-900" value={editPlan.name} readOnly />
                </div>
                <div>
                  <Label className="text-xs">Monthly Price (₹)</Label>
                  <Input
                    type="number"
                    className="mt-1 bg-slate-50 dark:bg-slate-900"
                    value={editPlan.priceMonthly}
                    onChange={(e) => setEditPlan((p) => p ? { ...p, priceMonthly: parseInt(e.target.value) || 0 } : p)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Yearly Price (₹)</Label>
                  <Input
                    type="number"
                    className="mt-1 bg-slate-50 dark:bg-slate-900"
                    value={editPlan.priceYearly}
                    onChange={(e) => setEditPlan((p) => p ? { ...p, priceYearly: parseInt(e.target.value) || 0 } : p)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Max Branches</Label>
                  <Input
                    type="number"
                    className="mt-1 bg-slate-50 dark:bg-slate-900"
                    value={editPlan.maxBranches}
                    onChange={(e) => setEditPlan((p) => p ? { ...p, maxBranches: parseInt(e.target.value) || 0 } : p)}
                  />
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <Switch checked={editPlan.isActive} onCheckedChange={(v) => setEditPlan((p) => p ? { ...p, isActive: v } : p)} />
                  <Label className="text-xs">Plan Active</Label>
                </div>
              </div>
              <div>
                <Label className="text-xs">Features (one per line)</Label>
                <Textarea
                  className="mt-1 bg-slate-50 dark:bg-slate-900 min-h-[120px]"
                  value={editPlan.features.join("\n")}
                  onChange={(e) => setEditPlan((p) => p ? { ...p, features: e.target.value.split("\n").filter(Boolean) } : p)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlan(null)}>Cancel</Button>
            <Button
              className="bg-gradient-to-r from-amber-600 to-orange-600 text-white gap-2"
              onClick={() => {
                toast.success("Plan updated!", { description: editPlan?.name });
                setEditPlan(null);
              }}
            >
              <Save className="h-4 w-4" />
              Save Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FranchiseAdmin;
