import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invalidateFeatureCache } from "@/hooks/useFeatureGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Loader2,
  Search,
  Shield,
  ChevronDown,
  ChevronRight,
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
  Settings,
  Soup,
  IndianRupee,
  Building2,
  Hotel,
  CookingPot,
  Layers,
  Check,
} from "lucide-react";
import {
  FEATURE_REGISTRY,
  FeatureCategory,
  ALL_FEATURE_KEYS,
} from "@/constants/featureRegistry";

// Icon map for category rendering
const ICON_MAP: Record<string, any> = {
  Monitor, Zap, ShoppingCart, ChefHat, UtensilsCrossed, Package, Soup,
  LayoutGrid, BarChart3, Users, UserCheck, DollarSign, Receipt, Truck,
  CalendarDays, Shield, Settings, Sparkles, Megaphone,
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

/**
 * Extract plan type group from the plan name.
 * e.g., "Food Truck Growth - Monthly" → "Food Truck"
 *       "Restaurant Professional" → "Restaurant"
 *       "Hotel Free Trial" → "Hotel"
 *       "All-in-One Starter" → "All-in-One"
 *       "Restaurant + Hotel Growth" → "Restaurant + Hotel"
 */
const getPlanGroup = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.startsWith("restaurant + hotel") || lower.startsWith("restaurant+hotel")) return "Restaurant + Hotel";
  if (lower.startsWith("all-in-one") || lower.startsWith("all in one")) return "All-in-One";
  if (lower.startsWith("food truck")) return "Food Truck";
  if (lower.startsWith("hotel")) return "Hotel";
  if (lower.startsWith("restaurant")) return "Restaurant";
  // Fallback: use first word(s) before a tier keyword
  const tierWords = ["free", "trial", "growth", "starter", "professional", "pro", "basic"];
  const words = name.split(/[\s-]+/);
  const groupWords: string[] = [];
  for (const w of words) {
    if (tierWords.includes(w.toLowerCase())) break;
    groupWords.push(w);
  }
  return groupWords.join(" ") || "Other";
};

/** Short display name (strip the group prefix + clean up) */
const getShortPlanName = (name: string, group: string): string => {
  let short = name;
  // Remove the group prefix
  if (short.toLowerCase().startsWith(group.toLowerCase())) {
    short = short.slice(group.length).trim();
  }
  // Remove leading dash or hyphen
  short = short.replace(/^[-–—]\s*/, "").trim();
  return short || name;
};

/** Group icon */
const GROUP_ICONS: Record<string, any> = {
  "Restaurant": Building2,
  "Food Truck": CookingPot,
  "Hotel": Hotel,
  "Restaurant + Hotel": Layers,
  "All-in-One": Sparkles,
};

/** Group color */
const GROUP_COLORS: Record<string, string> = {
  "Restaurant": "from-violet-500 to-purple-600",
  "Food Truck": "from-orange-500 to-amber-600",
  "Hotel": "from-teal-500 to-cyan-600",
  "Restaurant + Hotel": "from-blue-500 to-indigo-600",
  "All-in-One": "from-pink-500 to-rose-600",
};

const FeaturePermissions = () => {
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [featureSearchQuery, setFeatureSearchQuery] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  // Fetch plans
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["all-plans-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("price");
      if (error) throw error;
      return data as SubscriptionPlan[];
    },
  });

  // Group plans by type
  const groupedPlans = useMemo(() => {
    const groups: Record<string, SubscriptionPlan[]> = {};
    plans.forEach((plan) => {
      const group = getPlanGroup(plan.name);
      if (!groups[group]) groups[group] = [];
      groups[group].push(plan);
    });
    return groups;
  }, [plans]);

  const groupNames = Object.keys(groupedPlans);

  // Auto-select first group
  useMemo(() => {
    if (groupNames.length > 0 && !activeGroup) {
      setActiveGroup(groupNames[0]);
    }
  }, [groupNames, activeGroup]);

  // Plans in the active group
  const visiblePlans = activeGroup ? (groupedPlans[activeGroup] || []) : [];

  // Save permissions mutation
  const savePermissionsMutation = useMutation({
    mutationFn: async ({ planId, components }: { planId: string; components: string[] }) => {
      const { error } = await supabase
        .from("subscription_plans")
        .update({ components })
        .eq("id", planId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-plans-permissions"] });
      // Invalidate feature gate cache so FeatureLock components update for admin
      invalidateFeatureCache();
      // Also invalidate subscription-components for sidebar navigation
      queryClient.invalidateQueries({ queryKey: ["subscription-components"] });
      toast.success("Feature permissions saved successfully");
      setHasUnsavedChanges(false);
    },
    onError: (error: any) => toast.error(error.message),
  });

  const selectPlan = (plan: SubscriptionPlan) => {
    if (hasUnsavedChanges && !confirm("You have unsaved changes. Switch plan anyway?")) return;
    setSelectedPlanId(plan.id);
    const currentComponents = Array.isArray(plan.components) ? plan.components : [];
    setSelectedFeatures([...currentComponents]);
    setHasUnsavedChanges(false);
    setFeatureSearchQuery("");
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || null;

  const toggleFeature = (featureKey: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(featureKey) ? prev.filter((f) => f !== featureKey) : [...prev, featureKey]
    );
    setHasUnsavedChanges(true);
  };

  const toggleCategory = (category: FeatureCategory) => {
    const categoryKeys = category.features.map((f) => f.key);
    const allSelected = categoryKeys.every((k) => selectedFeatures.includes(k));
    if (allSelected) {
      setSelectedFeatures((prev) => prev.filter((f) => !categoryKeys.includes(f)));
    } else {
      setSelectedFeatures((prev) => [...new Set([...prev, ...categoryKeys])]);
    }
    setHasUnsavedChanges(true);
  };

  const toggleCollapseCategory = (categoryId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
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
          f.description.toLowerCase().includes(q)
      ),
    })).filter((c) => c.features.length > 0);
  }, [featureSearchQuery]);

  const totalFeatures = ALL_FEATURE_KEYS.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
          Feature Permissions Manager
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-sm">
          Control which features each subscription plan has access to
        </p>
      </div>

      {/* ─── Step 1: Plan Type Tabs ──────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {groupNames.map((group) => {
          const GroupIcon = GROUP_ICONS[group] || Shield;
          const isActive = activeGroup === group;
          const planCount = groupedPlans[group].length;
          const colorClass = GROUP_COLORS[group] || "from-slate-500 to-gray-600";

          return (
            <button
              key={group}
              onClick={() => {
                setActiveGroup(group);
                // Don't auto-deselect the plan, just switch the group view
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
                isActive
                  ? `bg-gradient-to-r ${colorClass} text-white border-transparent shadow-lg`
                  : "bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              <GroupIcon className="h-4 w-4" />
              {group}
              <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-5 ${
                isActive ? "bg-white/20 text-white border-0" : ""
              }`}>
                {planCount}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* ─── Step 2: Plans within the selected group ────────────── */}
      {activeGroup && (
        <div className="flex flex-wrap gap-2">
          {visiblePlans.map((plan) => {
            const componentCount = Array.isArray(plan.components) ? plan.components.length : 0;
            const isSelected = selectedPlanId === plan.id;
            const shortName = getShortPlanName(plan.name, activeGroup);

            return (
              <button
                key={plan.id}
                onClick={() => selectPlan(plan)}
                className={`relative flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-left transition-all duration-200 border ${
                  isSelected
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/30"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-slate-300 hover:shadow-sm"
                } ${!plan.is_active ? "opacity-50" : ""}`}
              >
                {isSelected && (
                  <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white block truncate">
                    {shortName}
                  </span>
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <IndianRupee className="h-2.5 w-2.5" />
                    {plan.price}/{plan.interval}
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className={`text-[10px] shrink-0 ${
                    componentCount === totalFeatures
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : componentCount > 0
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {componentCount}/{totalFeatures}
                </Badge>
              </button>
            );
          })}
        </div>
      )}

      {/* ─── Step 3: Feature Checkbox Tree ───────────────────────── */}
      {!selectedPlan ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white/50 dark:bg-slate-800/30 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
          <Shield className="h-14 w-14 text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-lg font-semibold text-slate-500 dark:text-slate-400">
            Select a plan above to manage features
          </p>
          <p className="text-sm text-slate-400 mt-1">
            Choose a plan type, then click a specific plan to configure permissions
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-white dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-slate-900 dark:text-white">{selectedPlan.name}</h2>
                <p className="text-xs text-slate-500">
                  {selectedFeatures.length} / {totalFeatures} features enabled
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => { setSelectedFeatures([...ALL_FEATURE_KEYS]); setHasUnsavedChanges(true); }} className="text-xs h-8">
                <Unlock className="h-3 w-3 mr-1" /> Select All
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setSelectedFeatures([]); setHasUnsavedChanges(true); }} className="text-xs h-8">
                <Lock className="h-3 w-3 mr-1" /> Deselect All
              </Button>
              <Button
                onClick={() => savePermissionsMutation.mutate({ planId: selectedPlan.id, components: selectedFeatures })}
                disabled={!hasUnsavedChanges || savePermissionsMutation.isPending}
                size="sm"
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/25 text-xs h-8"
              >
                {savePermissionsMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                Save
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search features by name, key, or description..."
              value={featureSearchQuery}
              onChange={(e) => setFeatureSearchQuery(e.target.value)}
              className="pl-10 bg-white dark:bg-slate-800/50 h-9"
            />
          </div>

          {/* Categories */}
          <ScrollArea className="h-[calc(100vh-430px)]">
            <div className="space-y-3 pr-4">
              {filteredRegistry.map((category) => {
                const Icon = ICON_MAP[category.icon] || Shield;
                const categoryKeys = category.features.map((f) => f.key);
                const selectedCount = categoryKeys.filter((k) => selectedFeatures.includes(k)).length;
                const totalCount = categoryKeys.length;
                const allSelected = selectedCount === totalCount;
                const someSelected = selectedCount > 0 && !allSelected;
                const isCollapsed = collapsedCategories.has(category.id);

                return (
                  <div key={category.id} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800/50">
                    {/* Category header */}
                    <div
                      className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => toggleCollapseCategory(category.id)}
                    >
                      <div className="flex items-center gap-3">
                        {isCollapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                          {category.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className={`text-xs ${
                          allSelected ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                          someSelected ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                          "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                        }`}>
                          {selectedCount}/{totalCount}
                        </Badge>
                        <Button type="button" variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); toggleCategory(category); }} className="text-xs h-7 px-2">
                          {allSelected ? "Deselect All" : "Select All"}
                        </Button>
                      </div>
                    </div>

                    {/* Feature list */}
                    {!isCollapsed && (
                      <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {category.features.map((feature) => {
                            const isChecked = selectedFeatures.includes(feature.key);
                            return (
                              <div
                                key={feature.key}
                                className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                                  isChecked
                                    ? "bg-emerald-50/80 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700"
                                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                                }`}
                                onClick={() => toggleFeature(feature.key)}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => toggleFeature(feature.key)}
                                  className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                />
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100 block cursor-pointer">
                                    {feature.label}
                                  </span>
                                  <p className="text-xs text-muted-foreground truncate">{feature.description}</p>
                                </div>
                                <code className="text-[10px] text-muted-foreground bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded hidden xl:block">
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
      )}
    </div>
  );
};

export default FeaturePermissions;
