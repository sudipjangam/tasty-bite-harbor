import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Plus,
  CreditCard,
  Edit,
  Trash2,
  Loader2,
  Check,
  X,
  Building2,
  IndianRupee,
  Shield,
  Layers,
  ChevronDown,
  ChevronRight,
  Search,
  Settings,
  Lock,
  Unlock,
  Save,
  Monitor,
  Zap,
  ShoppingCart,
  ChefHat,
  UtensilsCrossed,
  Package,
  LayoutGrid,
  BarChart3,
  Users,
  UserCheck,
  DollarSign,
  Receipt,
  Truck,
  CalendarDays,
  Sparkles,
  Megaphone,
  Soup,
  Store,
  LayoutDashboard,
  Bed,
  Globe,
  Key,
  Network,
  QrCode,
  Bike,
} from "lucide-react";
import {
  FEATURE_REGISTRY,
  FeatureCategory,
  ALL_FEATURE_KEYS,
} from "@/constants/featureRegistry";
import {
  getPlanGroup,
  getPlanTierAndInterval,
  formatIntervalLabel,
  TIER_CONFIG,
  TIER_SORT_ORDER,
  INTERVAL_SORT_ORDER,
} from "@/utils/planHierarchy";

import {
  usePlatformPaymentConfig,
  PaymentConfigFields,
} from "@/hooks/usePlatformPaymentConfig";
import { UPIPaymentCard } from "@/components/Subscription/UPIPaymentCard";

// Icon map for category rendering
const ICON_MAP: Record<string, any> = {
  Monitor,
  Zap,
  ShoppingCart,
  ChefHat,
  UtensilsCrossed,
  Package,
  Soup,
  LayoutGrid,
  BarChart3,
  Users,
  UserCheck,
  DollarSign,
  Receipt,
  Truck,
  CalendarDays,
  Shield,
  Settings,
  Sparkles,
  Megaphone,
  Store,
  LayoutDashboard,
  Bed,
  Globe,
  Key,
  Network,
  QrCode,
  Bike,
};

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: string;
  features: string[];
  components: string[];
  is_active: boolean;
}

const SubscriptionManager = () => {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    null,
  );
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [featureSearchQuery, setFeatureSearchQuery] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"tier" | "grid">("tier");
  const [planSearchQuery, setPlanSearchQuery] = useState("");
  const [tierIntervalSelection, setTierIntervalSelection] = useState<Record<string, string>>({});
    // ── Tab switcher ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"plans" | "bill_settings">("plans");

  // ── Bill / Payment Settings ───────────────────────────────────────────────
  const {
    isLoading: isBillConfigLoading,
    liveConfig: livePaymentConfig,
    rawFields: rawBillFields,
    saveMutation: saveBillConfig,
  } = usePlatformPaymentConfig();

  const [billForm, setBillForm] = useState<PaymentConfigFields>({
    bankName: "Bank of Maharashtra",
    accountName: "Swadeshi Solutions",
    accountNumber: "60139599010",
    ifsc: "MAHB0001227",
    branch: "Kothrud, Pune",
    accountType: "Current Account",
    upiId: "8329540398@bom",
    merchantName: "Swadeshi Solutions",
    qrImageUrl: "",
    cardTagline: "Start Your Complete POS Automation Journey",
  });

  // Sync billForm when DB data loads
  useEffect(() => {
    if (rawBillFields) {
      setBillForm((prev) => ({ ...prev, ...rawBillFields }));
    }
  }, [rawBillFields]);

  const handleSaveBillSettings = () => {
    saveBillConfig.mutate(billForm, {
      onSuccess: () => toast.success("Bill & Payment settings saved successfully!"),
      onError: (err: any) => toast.error(err.message || "Failed to save settings"),
    });
  };
const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    interval: "monthly",
    features: "",
    components: "",
    is_active: true,
  });

  // Fetch plans
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["all-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("price");
      if (error) throw error;
      return (data || []).filter(
        (p) => p.interval !== "quarterly" && !p.name.toLowerCase().includes("quarterly")
      ) as SubscriptionPlan[];
    },
  });

  // Get subscriber counts
  const { data: subscriberCounts = {} } = useQuery({
    queryKey: ["plan-subscribers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurant_subscriptions")
        .select("plan_id");

      if (error) {
        console.error("Subscriber count error:", error);
        return {};
      }

      const counts: Record<string, number> = {};
      data?.forEach((sub: any) => {
        if (sub.plan_id) {
          counts[sub.plan_id] = (counts[sub.plan_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  // Create plan
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const features = data.features.split("\n").filter((f) => f.trim());
      const components = data.components.split("\n").filter((c) => c.trim());

      const { error } = await supabase.from("subscription_plans").insert({
        name: data.name,
        description: data.description,
        price: data.price,
        interval: data.interval,
        features: features,
        components: components,
        is_active: data.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-plans"] });
      toast.success("Plan created");
      setIsAddOpen(false);
      resetForm();
    },
    onError: (error: any) => toast.error(error.message),
  });

  // Update plan
  const updateMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      updates: Partial<SubscriptionPlan>;
    }) => {
      const { error } = await supabase
        .from("subscription_plans")
        .update(data.updates)
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-plans"] });
      toast.success("Plan updated");
      setIsEditOpen(false);
    },
    onError: (error: any) => toast.error(error.message),
  });

  // Save permissions (components array)
  const savePermissionsMutation = useMutation({
    mutationFn: async ({
      planId,
      components,
    }: {
      planId: string;
      components: string[];
    }) => {
      const { error } = await supabase
        .from("subscription_plans")
        .update({ components })
        .eq("id", planId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-plans"] });
      toast.success("Feature permissions saved successfully");
      setIsPermissionsOpen(false);
    },
    onError: (error: any) => toast.error(error.message),
  });

  // Toggle active
  const toggleMutation = useMutation({
    mutationFn: async ({
      id,
      is_active,
    }: {
      id: string;
      is_active: boolean;
    }) => {
      const { error } = await supabase
        .from("subscription_plans")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-plans"] });
      toast.success("Status updated");
    },
    onError: (error: any) => toast.error(error.message),
  });

  // Delete plan
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("subscription_plans")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-plans"] });
      toast.success("Plan deleted");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: 0,
      interval: "monthly",
      features: "",
      components: "",
      is_active: true,
    });
  };

  const openEdit = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || "",
      price: plan.price,
      interval: plan.interval,
      features: Array.isArray(plan.features) ? plan.features.join("\n") : "",
      components: Array.isArray(plan.components)
        ? plan.components.join("\n")
        : "",
      is_active: plan.is_active,
    });
    setIsEditOpen(true);
  };

  // â”€â”€â”€ Permissions Manager Logic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const openPermissions = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    const currentComponents = Array.isArray(plan.components)
      ? plan.components
      : [];
    setSelectedFeatures([...currentComponents]);
    setFeatureSearchQuery("");
    setCollapsedCategories(new Set());
    setIsPermissionsOpen(true);
  };

  const toggleFeature = (featureKey: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(featureKey)
        ? prev.filter((f) => f !== featureKey)
        : [...prev, featureKey],
    );
  };

  const toggleCategory = (category: FeatureCategory) => {
    const categoryKeys = category.features.map((f) => f.key);
    const allSelected = categoryKeys.every((k) => selectedFeatures.includes(k));

    if (allSelected) {
      // Deselect all in this category
      setSelectedFeatures((prev) =>
        prev.filter((f) => !categoryKeys.includes(f)),
      );
    } else {
      // Select all in this category
      setSelectedFeatures((prev) => [...new Set([...prev, ...categoryKeys])]);
    }
  };

  const toggleCollapseCategory = (categoryId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Filter categories by search query
  const filteredRegistry = useMemo(() => {
    if (!featureSearchQuery.trim()) return FEATURE_REGISTRY;

    const q = featureSearchQuery.toLowerCase().trim();
    return FEATURE_REGISTRY.map((category) => ({
      ...category,
      features: category.features.filter(
        (f) =>
          f.label.toLowerCase().includes(q) ||
          f.key.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q),
      ),
    })).filter((c) => c.features.length > 0);
  }, [featureSearchQuery]);

  const totalFeatures = ALL_FEATURE_KEYS.length;

  const categories = [
    { id: "all", label: "All Plans" },
    { id: "restaurant", label: "Restaurant" },
    { id: "food truck", label: "Food Truck" },
    { id: "hotel", label: "Hotel" },
    { id: "restaurant + hotel", label: "Restaurant + Hotel" },
    { id: "all-in-one", label: "All-in-One" },
  ];

  const billingCycles = [
    { id: "all", label: "All Terms" },
    { id: "monthly", label: "Monthly" },
    { id: "half_yearly", label: "Half-Yearly", badge: "Save ~16%" },
    { id: "yearly", label: "Yearly", badge: "Save ~30%" },
  ];

  // Group plans into Tiers (collapsing duplicate interval cards into 1 card per tier)
  const tierGroups = useMemo(() => {
    let list = plans;
    if (selectedCategory !== "all") {
      const target = selectedCategory.toLowerCase().trim();
      list = list.filter(
        (p) => getPlanGroup(p.name).toLowerCase().trim() === target,
      );
    }
    if (planSearchQuery.trim()) {
      const q = planSearchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(q);
        const descMatch = (p.description || "").toLowerCase().includes(q);
        const featMatch = (p.features || []).some((f) =>
          f.toLowerCase().includes(q),
        );
        return nameMatch || descMatch || featMatch;
      });
    }

    interface TierGroupData {
      key: string;
      group: string;
      tierName: string;
      plans: SubscriptionPlan[];
    }

    const map = new Map<string, TierGroupData>();

    list.forEach((p) => {
      const group = getPlanGroup(p.name);
      const { tier } = getPlanTierAndInterval(p.name, group, p.interval);
      const key = `${group}__${tier}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          group,
          tierName: tier,
          plans: [],
        });
      }
      map.get(key)!.plans.push(p);
    });

    map.forEach((t) => {
      t.plans.sort((a, b) => {
        const { intervalKey: intA } = getPlanTierAndInterval(
          a.name,
          t.group,
          a.interval,
        );
        const { intervalKey: intB } = getPlanTierAndInterval(
          b.name,
          t.group,
          b.interval,
        );
        return (
          (INTERVAL_SORT_ORDER[intA] ?? 99) -
          (INTERVAL_SORT_ORDER[intB] ?? 99)
        );
      });
    });

    let result = Array.from(map.values());
    if (selectedBillingCycle !== "all") {
      result = result.filter((t) =>
        t.plans.some((p) => {
          const { intervalKey } = getPlanTierAndInterval(
            p.name,
            t.group,
            p.interval,
          );
          return (
            intervalKey === selectedBillingCycle ||
            p.interval === selectedBillingCycle
          );
        }),
      );
    }

    result.sort((a, b) => {
      if (a.group !== b.group) return a.group.localeCompare(b.group);
      return (
        (TIER_SORT_ORDER[a.tierName.toLowerCase()] ?? 99) -
        (TIER_SORT_ORDER[b.tierName.toLowerCase()] ?? 99)
      );
    });

    return result;
  }, [plans, selectedCategory, selectedBillingCycle, planSearchQuery]);

  // Flattened plan list for standard grid view
  const displayedPlans = useMemo(() => {
    let result = plans;
    if (selectedCategory !== "all") {
      const target = selectedCategory.toLowerCase().trim();
      result = result.filter(
        (p) => getPlanGroup(p.name).toLowerCase().trim() === target,
      );
    }
    if (selectedBillingCycle !== "all") {
      result = result.filter((p) => {
        const group = getPlanGroup(p.name);
        const { intervalKey } = getPlanTierAndInterval(
          p.name,
          group,
          p.interval,
        );
        return (
          intervalKey === selectedBillingCycle ||
          p.interval === selectedBillingCycle
        );
      });
    }
    if (planSearchQuery.trim()) {
      const q = planSearchQuery.toLowerCase().trim();
      result = result.filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(q);
        const descMatch = (p.description || "").toLowerCase().includes(q);
        const featMatch = (p.features || []).some((f) =>
          f.toLowerCase().includes(q),
        );
        return nameMatch || descMatch || featMatch;
      });
    }
    return result;
  }, [plans, selectedCategory, selectedBillingCycle, planSearchQuery]);

  const resolveActivePlanForTier = (tier: {
    key: string;
    group: string;
    tierName: string;
    plans: SubscriptionPlan[];
  }): SubscriptionPlan => {
    if (selectedBillingCycle !== "all") {
      const match = tier.plans.find((p) => {
        const { intervalKey } = getPlanTierAndInterval(
          p.name,
          tier.group,
          p.interval,
        );
        return (
          intervalKey === selectedBillingCycle ||
          p.interval === selectedBillingCycle
        );
      });
      if (match) return match;
    }

    const local = tierIntervalSelection[tier.key];
    if (local) {
      const match = tier.plans.find((p) => {
        const { intervalKey } = getPlanTierAndInterval(
          p.name,
          tier.group,
          p.interval,
        );
        return intervalKey === local || p.interval === local;
      });
      if (match) return match;
    }

    const monthly = tier.plans.find((p) => {
      const { intervalKey } = getPlanTierAndInterval(
        p.name,
        tier.group,
        p.interval,
      );
      return intervalKey === "monthly";
    });
    return monthly || tier.plans[0];
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header + Tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
            {activeTab === "plans" ? "Subscription Plans" : "Bill & Payment Settings"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm md:text-base">
            {activeTab === "plans"
              ? "Manage pricing tiers, billing cycles, and granular feature entitlements"
              : "Configure bank account, UPI ID, and branded payment card shown on invoices"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button type="button" onClick={() => setActiveTab("plans")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === "plans" ? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-400 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}>
              <CreditCard className="h-3.5 w-3.5" /> Plans
            </button>
            <button type="button" onClick={() => setActiveTab("bill_settings")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === "bill_settings" ? "bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}>
              <Save className="h-3.5 w-3.5" /> Bill Settings
            </button>
          </div>
          {activeTab === "plans" && (
            <Button onClick={() => setIsAddOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 shadow-md hover:shadow-emerald-500/25 transition-all text-white rounded-xl">
              <Plus className="h-4 w-4 mr-2" /> Add New Plan
            </Button>
          )}
        </div>
      </div>

      {/* BILL SETTINGS TAB */}
      {activeTab === "bill_settings" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-5">
            <div className="bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"><Building2 className="h-4 w-4" /></div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Bank Account Details</h3>
                  <p className="text-xs text-slate-500">Shown on subscription invoices & bills</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Bank Name</Label>
                  <Input value={billForm.bankName} onChange={(e) => setBillForm({ ...billForm, bankName: e.target.value })} placeholder="e.g. Bank of Maharashtra" className="h-8 text-sm" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Account Name</Label>
                  <Input value={billForm.accountName} onChange={(e) => setBillForm({ ...billForm, accountName: e.target.value })} placeholder="e.g. Swadeshi Solutions" className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Account Number</Label>
                  <Input value={billForm.accountNumber} onChange={(e) => setBillForm({ ...billForm, accountNumber: e.target.value })} placeholder="60139599010" className="h-8 text-sm font-mono" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">IFSC Code</Label>
                  <Input value={billForm.ifsc} onChange={(e) => setBillForm({ ...billForm, ifsc: e.target.value.toUpperCase() })} placeholder="MAHB0001227" className="h-8 text-sm font-mono" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Branch</Label>
                  <Input value={billForm.branch} onChange={(e) => setBillForm({ ...billForm, branch: e.target.value })} placeholder="Kothrud, Pune" className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Account Type</Label>
                  <Input value={billForm.accountType} onChange={(e) => setBillForm({ ...billForm, accountType: e.target.value })} placeholder="Current Account" className="h-8 text-sm" />
                </div>
              </div>
            </div>
            <div className="bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400"><QrCode className="h-4 w-4" /></div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">UPI & Branded Payment Card</h3>
                  <p className="text-xs text-slate-500">QR image and card settings for invoices</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">UPI ID</Label>
                  <Input value={billForm.upiId} onChange={(e) => setBillForm({ ...billForm, upiId: e.target.value })} placeholder="8329540398@bom" className="h-8 text-sm font-mono" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Custom QR Image URL <span className="text-slate-400 font-normal">(Supabase Storage or external)</span></Label>
                  <Input value={billForm.qrImageUrl || ""} onChange={(e) => setBillForm({ ...billForm, qrImageUrl: e.target.value })} placeholder="https://... (blank = auto-generated from UPI ID)" className="h-8 text-sm" />
                  <p className="text-[11px] text-slate-400 mt-1">Upload your Canva/PhonePe branded QR PNG to Supabase Storage and paste the public URL here.</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Card Headline / Tagline</Label>
                  <Input value={billForm.cardTagline || ""} onChange={(e) => setBillForm({ ...billForm, cardTagline: e.target.value })} placeholder="Start Your Complete POS Automation Journey" className="h-8 text-sm" />
                </div>
              </div>
            </div>
            <Button onClick={handleSaveBillSettings} disabled={saveBillConfig.isPending} className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-md h-10">
              {saveBillConfig.isPending ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>) : (<><Save className="h-4 w-4 mr-2" />Save Bill & Payment Settings</>)}
            </Button>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <QrCode className="h-4 w-4 text-orange-500" /> Live Card Preview
            </p>
            <UPIPaymentCard company={livePaymentConfig} cardTagline={billForm.cardTagline || "Start Your Complete POS Automation Journey"} customQrImageUrl={billForm.qrImageUrl || undefined} />
            <p className="text-[11px] text-slate-400 text-center">This card is embedded in invoice modals and can be downloaded as a PNG image.</p>
          </div>
        </div>
      )}

      {/* PLANS TAB */}
      {activeTab === "plans" && (
        <>

      {/* Control Bar: Categories + Billing Cycle Switcher + View Mode */}
      <div className="space-y-3 bg-white/70 dark:bg-slate-900/70 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 backdrop-blur-md shadow-xs">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => {
            const count =
              cat.id === "all"
                ? plans.length
                : plans.filter(
                    (p) =>
                      getPlanGroup(p.name).toLowerCase().trim() ===
                      cat.id.toLowerCase().trim(),
                  ).length;
            const isSelected = selectedCategory === cat.id;

            return (
              <Button
                key={cat.id}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-xl transition-all font-semibold ${
                  isSelected
                    ? "bg-purple-600 hover:bg-purple-700 text-white shadow-sm shadow-purple-500/25 border-purple-600"
                    : "bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                }`}
              >
                {cat.label}
                <span
                  className={`ml-1.5 text-xs rounded-full px-1.5 py-0.2 ${
                    isSelected
                      ? "bg-purple-700/60 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {count}
                </span>
              </Button>
            );
          })}
        </div>

        {/* Sub-toolbar: Billing Cycle Filter & Search & View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* Billing Cycle Segmented Control */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {billingCycles.map((cycle) => {
              const isSelected = selectedBillingCycle === cycle.id;
              return (
                <button
                  type="button"
                  key={cycle.id}
                  onClick={() => setSelectedBillingCycle(cycle.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span>{cycle.label}</span>
                  {cycle.badge && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
                      {cycle.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search & View Mode Switcher */}
          <div className="flex items-center gap-2">
            <div className="relative w-48 sm:w-60">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search plan or feature..."
                value={planSearchQuery}
                onChange={(e) => setPlanSearchQuery(e.target.value)}
                className="h-8 pl-8 pr-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
              />
              {planSearchQuery && (
                <button
                  type="button"
                  onClick={() => setPlanSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode("tier")}
                title="Grouped by Tier (Simplified)"
                className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === "tier"
                    ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Layers className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="All Plans Grid"
                className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
        </div>
      ) : viewMode === "tier" ? (
        /* â”€â”€â”€ TIER VIEW (SIMPLIFIED / COLLAPSED) â”€â”€â”€ */
        tierGroups.length === 0 ? (
          <div className="text-center py-16 bg-white/40 dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
            <CreditCard className="h-12 w-12 mx-auto text-slate-400 mb-3" />
            <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">
              No plan tiers found matching your filters
            </p>
            <Button
              onClick={() => {
                setSelectedCategory("all");
                setSelectedBillingCycle("all");
                setPlanSearchQuery("");
              }}
              variant="outline"
              size="sm"
              className="mt-3 rounded-xl"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tierGroups.map((tier) => {
              const activePlan = resolveActivePlanForTier(tier);
              const count = subscriberCounts[activePlan.id] || 0;
              const features = Array.isArray(activePlan.features)
                ? activePlan.features
                : [];
              const componentCount = Array.isArray(activePlan.components)
                ? activePlan.components.length
                : 0;
              const config = TIER_CONFIG[tier.tierName] || {
                subtitle: activePlan.description || "Subscription tier",
                inclusions: "",
                gradient: "from-purple-500 to-indigo-600",
                borderActive: "border-purple-500",
                bgActive: "bg-purple-50/50",
              };
              const { intervalKey } = getPlanTierAndInterval(
                activePlan.name,
                tier.group,
                activePlan.interval,
              );
              const labelInfo = formatIntervalLabel(
                intervalKey,
                tier.tierName,
                activePlan.price,
              );

              return (
                <div
                  key={tier.key}
                  className={`group relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between border ${
                    config.isHero
                      ? "border-purple-300 dark:border-purple-700/80 ring-1 ring-purple-400/30"
                      : "border-slate-200/90 dark:border-slate-800"
                  } ${!activePlan.is_active ? "opacity-60 grayscale" : ""}`}
                >
                  {/* Top gradient highlight bar */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${config.gradient} rounded-t-3xl`}
                  />

                  <div>
                    {/* Header: Category Badge + Popular Tag + Inactive Tag */}
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {selectedCategory === "all" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {tier.group}
                          </span>
                        )}
                        {config.badge && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-indigo-600 text-white shadow-xs">
                            {config.isHero ? "â˜… POPULAR" : config.badge}
                          </span>
                        )}
                      </div>

                      {!activePlan.is_active && (
                        <span className="bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          Inactive
                        </span>
                      )}
                    </div>

                    {/* Tier Title & Subtitle */}
                    <h3
                      className={`text-xl font-bold bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}
                    >
                      {tier.tierName}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed min-h-[32px] mt-0.5">
                      {config.subtitle || activePlan.description}
                    </p>

                    {/* Inclusions pill if configured */}
                    {config.inclusions && (
                      <div className="mt-2 py-1 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                        {config.inclusions}
                      </div>
                    )}

                    {/* Duration / Billing Terms Switcher */}
                    {tier.plans.length > 1 && (
                      <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 gap-1 my-3">
                        {tier.plans.map((p) => {
                          const { intervalKey: pIntKey } =
                            getPlanTierAndInterval(p.name, tier.group, p.interval);
                          const pLabel = formatIntervalLabel(
                            pIntKey,
                            tier.tierName,
                            p.price,
                          );
                          const isPlanActive = activePlan.id === p.id;

                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() =>
                                setTierIntervalSelection((prev) => ({
                                  ...prev,
                                  [tier.key]: pIntKey,
                                }))
                              }
                              className={`flex-1 py-1 px-1.5 rounded-lg text-xs font-semibold transition-all flex flex-col items-center justify-center ${
                                isPlanActive
                                  ? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs border border-purple-200/50 dark:border-purple-800/50"
                                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                              }`}
                            >
                              <span>{pLabel.period}</span>
                              <span className="text-[10px] font-bold opacity-80">
                                â‚¹{p.price.toLocaleString()}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Price Display */}
                    <div className="my-3 pt-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                          <IndianRupee className="h-6 w-6 inline-block -mt-1" />
                          {activePlan.price.toLocaleString()}
                        </span>
                        <span className="text-slate-400 text-xs font-medium">
                          /{activePlan.interval}
                        </span>
                      </div>
                      {labelInfo.effectiveMonthly && activePlan.price > 0 && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                          {labelInfo.effectiveMonthly}
                          {labelInfo.badge ? ` â€¢ ${labelInfo.badge}` : ""}
                        </p>
                      )}
                    </div>

                    {/* Feature Count Badge */}
                    <div className="mb-3">
                      <Badge
                        variant="outline"
                        className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-[11px]"
                      >
                        <Lock className="h-3 w-3 mr-1" />
                        {componentCount} / {totalFeatures} features
                      </Badge>
                    </div>

                    {/* Feature List (top 4) */}
                    <div className="space-y-2 mb-4">
                      {features.slice(0, 4).map((feature, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300"
                        >
                          <div className="mt-0.5 shrink-0 h-4 w-4 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                            <Check className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <span className="leading-snug line-clamp-1">
                            {feature}
                          </span>
                        </div>
                      ))}
                      {features.length > 4 && (
                        <p className="text-[11px] text-slate-400 pl-6">
                          +{features.length - 4} more features
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Subscribers & Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide leading-none">
                          Subscribers
                        </p>
                        <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                          {count}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openPermissions(activePlan)}
                        className="h-8 w-8 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-900/20"
                        title="Manage Feature Permissions"
                      >
                        <Shield className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(activePlan)}
                        className="h-8 w-8 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-900/20"
                        title="Edit Plan"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          toggleMutation.mutate({
                            id: activePlan.id,
                            is_active: !activePlan.is_active,
                          })
                        }
                        className={`h-8 w-8 ${
                          activePlan.is_active
                            ? "text-emerald-600 hover:bg-emerald-50"
                            : "text-slate-400 hover:bg-slate-50"
                        }`}
                        title={
                          activePlan.is_active
                            ? "Deactivate Plan"
                            : "Activate Plan"
                        }
                      >
                        {activePlan.is_active ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <X className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Delete Plan"
                        onClick={() => {
                          if (count > 0) {
                            toast.error(
                              "Cannot delete plan with active subscribers",
                            );
                            return;
                          }
                          if (confirm("Delete this plan?")) {
                            deleteMutation.mutate(activePlan.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* â”€â”€â”€ GRID VIEW (ALL INDIVIDUAL PLANS) â”€â”€â”€ */
        displayedPlans.length === 0 ? (
          <div className="text-center py-16 bg-white/40 dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
            <CreditCard className="h-12 w-12 mx-auto text-slate-400 mb-3" />
            <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">
              No plans found matching your filters
            </p>
            <Button
              onClick={() => {
                setSelectedCategory("all");
                setSelectedBillingCycle("all");
                setPlanSearchQuery("");
              }}
              variant="outline"
              size="sm"
              className="mt-3 rounded-xl"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedPlans.map((plan) => {
              const count = subscriberCounts[plan.id] || 0;
              const features = Array.isArray(plan.features) ? plan.features : [];
              const componentCount = Array.isArray(plan.components)
                ? plan.components.length
                : 0;
              const group = getPlanGroup(plan.name);
              const { tier } = getPlanTierAndInterval(
                plan.name,
                group,
                plan.interval,
              );
              const config = TIER_CONFIG[tier] || {
                subtitle: plan.description || "Subscription tier",
                inclusions: "",
                gradient: "from-purple-500 to-indigo-600",
              };

              return (
                <div
                  key={plan.id}
                  className={`group relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between border border-slate-200/90 dark:border-slate-800 ${
                    !plan.is_active ? "opacity-60 grayscale" : ""
                  }`}
                >
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${config.gradient} rounded-t-3xl`}
                  />

                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {group}
                      </span>
                      {!plan.is_active && (
                        <span className="bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          Inactive
                        </span>
                      )}
                    </div>

                    <h3
                      className={`text-lg font-bold bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}
                    >
                      {plan.name}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed min-h-[32px] mt-0.5">
                      {plan.description}
                    </p>

                    <div className="my-3">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                          <IndianRupee className="h-6 w-6 inline-block -mt-1" />
                          {plan.price.toLocaleString()}
                        </span>
                        <span className="text-slate-400 text-xs font-medium">
                          /{plan.interval}
                        </span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <Badge
                        variant="outline"
                        className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-[11px]"
                      >
                        <Lock className="h-3 w-3 mr-1" />
                        {componentCount} / {totalFeatures} features
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-4">
                      {features.slice(0, 4).map((feature, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300"
                        >
                          <div className="mt-0.5 shrink-0 h-4 w-4 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                            <Check className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <span className="leading-snug line-clamp-1">
                            {feature}
                          </span>
                        </div>
                      ))}
                      {features.length > 4 && (
                        <p className="text-[11px] text-slate-400 pl-6">
                          +{features.length - 4} more features
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide leading-none">
                          Subscribers
                        </p>
                        <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                          {count}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openPermissions(plan)}
                        className="h-8 w-8 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-900/20"
                        title="Manage Feature Permissions"
                      >
                        <Shield className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(plan)}
                        className="h-8 w-8 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-900/20"
                        title="Edit Plan"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          toggleMutation.mutate({
                            id: plan.id,
                            is_active: !plan.is_active,
                          })
                        }
                        className={`h-8 w-8 ${
                          plan.is_active
                            ? "text-emerald-600 hover:bg-emerald-50"
                            : "text-slate-400 hover:bg-slate-50"
                        }`}
                        title={
                          plan.is_active
                            ? "Deactivate Plan"
                            : "Activate Plan"
                        }
                      >
                        {plan.is_active ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <X className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Delete Plan"
                        onClick={() => {
                          if (count > 0) {
                            toast.error(
                              "Cannot delete plan with active subscribers",
                            );
                            return;
                          }
                          if (confirm("Delete this plan?")) {
                            deleteMutation.mutate(plan.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* â”€â”€â”€ Feature Permissions Manager Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-700/50">
          <DialogHeader className="pb-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-lg font-semibold">
                  Feature Permissions â€” {selectedPlan?.name}
                </DialogTitle>
                <DialogDescription className="text-sm">
                  Control which features are included in this subscription plan
                </DialogDescription>
              </div>
              <Badge
                variant="outline"
                className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-sm"
              >
                {selectedFeatures.length} / {totalFeatures} selected
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search features by name, key, or description..."
                value={featureSearchQuery}
                onChange={(e) => setFeatureSearchQuery(e.target.value)}
                className="pl-10 bg-gray-50 dark:bg-gray-800/50"
              />
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedFeatures([...ALL_FEATURE_KEYS])}
                className="text-xs"
              >
                <Unlock className="h-3 w-3 mr-1" />
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedFeatures([])}
                className="text-xs"
              >
                <Lock className="h-3 w-3 mr-1" />
                Deselect All
              </Button>
            </div>

            {/* Categories */}
            <ScrollArea className="h-[calc(92vh-320px)] pr-4">
              <div className="space-y-4">
                {filteredRegistry.map((category) => {
                  const Icon = ICON_MAP[category.icon] || Shield;
                  const categoryKeys = category.features.map((f) => f.key);
                  const selectedCount = categoryKeys.filter((k) =>
                    selectedFeatures.includes(k),
                  ).length;
                  const totalCount = categoryKeys.length;
                  const allSelected = selectedCount === totalCount;
                  const someSelected = selectedCount > 0 && !allSelected;
                  const isCollapsed = collapsedCategories.has(category.id);

                  return (
                    <div
                      key={category.id}
                      className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800/50"
                    >
                      {/* Category header */}
                      <div
                        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        onClick={() => toggleCollapseCategory(category.id)}
                      >
                        <div className="flex items-center gap-3">
                          {isCollapsed ? (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div
                            className={`h-7 w-7 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center`}
                          >
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">
                            {category.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <Badge
                            variant="secondary"
                            className={`text-xs ${
                              allSelected
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : someSelected
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                  : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                            }`}
                          >
                            {selectedCount}/{totalCount}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCategory(category);
                            }}
                            className="text-xs h-7 px-2"
                          >
                            {allSelected ? "Deselect All" : "Select All"}
                          </Button>
                        </div>
                      </div>

                      {/* Feature list (collapsible) */}
                      {!isCollapsed && (
                        <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {category.features.map((feature) => {
                              const isChecked = selectedFeatures.includes(
                                feature.key,
                              );
                              return (
                                <div
                                  key={feature.key}
                                  className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                                    isChecked
                                      ? "bg-emerald-50/80 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700"
                                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                  }`}
                                  onClick={() => toggleFeature(feature.key)}
                                >
                                  <Checkbox
                                    id={`perm-${feature.key}`}
                                    checked={isChecked}
                                    onCheckedChange={() =>
                                      toggleFeature(feature.key)
                                    }
                                    className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <label
                                      htmlFor={`perm-${feature.key}`}
                                      className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer block"
                                    >
                                      {feature.label}
                                    </label>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {feature.description}
                                    </p>
                                  </div>
                                  <code className="text-[10px] text-muted-foreground bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded hidden xl:block">
                                    {feature.key}
                                  </code>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button
              variant="outline"
              onClick={() => setIsPermissionsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedPlan) {
                  savePermissionsMutation.mutate({
                    planId: selectedPlan.id,
                    components: selectedFeatures,
                  });
                }
              }}
              disabled={savePermissionsMutation.isPending}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/25"
            >
              {savePermissionsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Permissions
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Plan</DialogTitle>
            <DialogDescription>Add a new subscription plan</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>Plan Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Swadeshi Solutions"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Short description"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price (â‚¹) *</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: parseInt(e.target.value) || 0,
                    })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Interval</Label>
                <Select
                  value={formData.interval}
                  onValueChange={(v) =>
                    setFormData({ ...formData, interval: v })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="half_yearly">Half-Yearly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Features (one per line)</Label>
              <Textarea
                value={formData.features}
                onChange={(e) =>
                  setFormData({ ...formData, features: e.target.value })
                }
                placeholder="Menu management&#10;Order processing&#10;Up to 10 users"
                rows={4}
                className="mt-1"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
              <Label>Plan is Active</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                After creating the plan, click the <strong>Shield</strong> icon
                on the plan card to configure granular feature permissions.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={
                !formData.name || !formData.price || createMutation.isPending
              }
              className="bg-purple-600 hover:bg-purple-700"
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>Plan Name</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price (â‚¹)</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: parseInt(e.target.value) || 0,
                    })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Interval</Label>
                <Select
                  value={formData.interval}
                  onValueChange={(v) =>
                    setFormData({ ...formData, interval: v })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="half_yearly">Half-Yearly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Features (one per line)</Label>
              <Textarea
                value={formData.features}
                onChange={(e) =>
                  setFormData({ ...formData, features: e.target.value })
                }
                rows={4}
                className="mt-1"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
              <Label>Plan is Active</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedPlan) {
                  const features = formData.features
                    .split("\n")
                    .filter((f) => f.trim());
                  updateMutation.mutate({
                    id: selectedPlan.id,
                    updates: {
                      name: formData.name,
                      description: formData.description,
                      price: formData.price,
                      interval: formData.interval,
                      features: features,
                      is_active: formData.is_active,
                    },
                  });
                }
              }}
              disabled={updateMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {updateMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </>
      )}

    </div>
  );
};

export default SubscriptionManager;
