import { useState, useMemo, useEffect } from "react";
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
  Store,
  LayoutDashboard,
  Bed,
  Globe,
  Key,
  Network,
  QrCode,
  Bike,
  Clock,
  Star,
  CheckCircle2,
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
  type SubscriptionPlanItem,
} from "@/utils/planHierarchy";

// Icon map for category rendering
const ICON_MAP: Record<string, any> = {
  Monitor, Zap, ShoppingCart, ChefHat, UtensilsCrossed, Package, Soup,
  LayoutGrid, BarChart3, Users, UserCheck, DollarSign, Receipt, Truck,
  CalendarDays, Shield, Settings, Sparkles, Megaphone, Store, LayoutDashboard,
  Bed, Globe, Key, Network, QrCode, Bike,
};

interface SubscriptionPlan extends SubscriptionPlanItem {
  features: string[];
  components: string[];
}

/** Group icon map */
const GROUP_ICONS: Record<string, any> = {
  "Restaurant": Building2,
  "Food Truck": CookingPot,
  "Hotel": Hotel,
  "Restaurant + Hotel": Layers,
  "All-in-One": Sparkles,
};

/** Group color map */
const GROUP_COLORS: Record<string, string> = {
  "Restaurant": "from-violet-500 to-purple-600",
  "Food Truck": "from-orange-500 to-amber-600",
  "Hotel": "from-teal-500 to-cyan-600",
  "Restaurant + Hotel": "from-blue-500 to-indigo-600",
  "All-in-One": "from-pink-500 to-rose-600",
};

const FeaturePermissions = () => {
  const queryClient = useQueryClient();
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [activeTier, setActiveTier] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [applyToAllDurations, setApplyToAllDurations] = useState(true);

  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [featureSearchQuery, setFeatureSearchQuery] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch plans
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["all-plans-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("price");
      if (error) throw error;
      return (data || []).filter(
        (p) => p.interval !== "quarterly" && !p.name.toLowerCase().includes("quarterly")
      ) as SubscriptionPlan[];
    },
  });

  // Group plans by business category
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

  // Auto-select first group if not set
  useEffect(() => {
    if (groupNames.length > 0 && !activeGroup) {
      setActiveGroup(groupNames[0]);
    }
  }, [groupNames, activeGroup]);

  // Plans within the active category
  const visiblePlans = activeGroup ? (groupedPlans[activeGroup] || []) : [];

  // Group plans within the active category by Tier
  const tierGroups = useMemo(() => {
    const map = new Map<string, SubscriptionPlan[]>();

    visiblePlans.forEach((plan) => {
      const { tier } = getPlanTierAndInterval(plan.name, activeGroup || "", plan.interval);
      if (!map.has(tier)) map.set(tier, []);
      map.get(tier)!.push(plan);
    });

    // Sort plans inside each tier by interval order
    map.forEach((plansList) => {
      plansList.sort((a, b) => {
        const { intervalKey: intA } = getPlanTierAndInterval(a.name, activeGroup || "", a.interval);
        const { intervalKey: intB } = getPlanTierAndInterval(b.name, activeGroup || "", b.interval);
        const orderA = INTERVAL_SORT_ORDER[intA] ?? 99;
        const orderB = INTERVAL_SORT_ORDER[intB] ?? 99;
        return orderA - orderB;
      });
    });

    // Sort tiers by established standard
    const sortedTiers = Array.from(map.keys()).sort((a, b) => {
      const orderA = TIER_SORT_ORDER[a.toLowerCase()] ?? 99;
      const orderB = TIER_SORT_ORDER[b.toLowerCase()] ?? 99;
      return orderA - orderB;
    });

    return sortedTiers.map((tierName) => ({
      tierName,
      plans: map.get(tierName) || [],
    }));
  }, [visiblePlans, activeGroup]);

  // Auto-select active tier and plan when group changes or initializes
  useEffect(() => {
    if (tierGroups.length === 0) return;

    // Check if activeTier exists in new tierGroups
    const tierExists = tierGroups.some((t) => t.tierName === activeTier);
    const targetTierName = tierExists && activeTier ? activeTier : tierGroups[0].tierName;

    if (targetTierName !== activeTier) {
      setActiveTier(targetTierName);
    }

    const currentTierObj = tierGroups.find((t) => t.tierName === targetTierName);
    const currentTierPlans = currentTierObj?.plans || [];

    if (currentTierPlans.length > 0) {
      const isSelectedPlanInTier = currentTierPlans.some((p) => p.id === selectedPlanId);
      if (!isSelectedPlanInTier) {
        // Preferred duration: half_yearly or yearly, fallback to first
        const preferred =
          currentTierPlans.find((p) => {
            const { intervalKey } = getPlanTierAndInterval(p.name, activeGroup || "", p.interval);
            return intervalKey === "half_yearly" || intervalKey === "yearly";
          }) || currentTierPlans[0];

        setSelectedPlanId(preferred.id);
        const comps = Array.isArray(preferred.components) ? preferred.components : [];
        setSelectedFeatures([...comps]);
        setHasUnsavedChanges(false);
      }
    }
  }, [tierGroups, activeTier, selectedPlanId, activeGroup]);

  // Currently selected plan object
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || null;

  // Plans belonging to the currently active tier
  const currentTierObj = tierGroups.find((t) => t.tierName === activeTier);
  const currentTierPlans = currentTierObj?.plans || [];

  // Save permissions mutation (supports single plan or batch sync across durations)
  const savePermissionsMutation = useMutation({
    mutationFn: async ({
      planIds,
      components,
    }: {
      planIds: string[];
      components: string[];
    }) => {
      const { error } = await supabase
        .from("subscription_plans")
        .update({ components })
        .in("id", planIds);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["all-plans-permissions"] });
      invalidateFeatureCache();
      queryClient.invalidateQueries({ queryKey: ["subscription-components"] });
      if (vars.planIds.length > 1) {
        toast.success(
          `Features updated for all ${vars.planIds.length} ${activeTier} billing options!`
        );
      } else {
        toast.success(`Features saved for ${selectedPlan?.name || "plan"}`);
      }
      setHasUnsavedChanges(false);
    },
    onError: (error: any) => toast.error(error.message),
  });

  const handleSelectGroup = (group: string) => {
    if (group === activeGroup) return;
    if (hasUnsavedChanges && !confirm("You have unsaved changes. Switch business type anyway?")) return;
    setActiveGroup(group);
    setActiveTier(null);
    setSelectedPlanId(null);
    setHasUnsavedChanges(false);
  };

  const handleSelectTier = (tierName: string) => {
    if (tierName === activeTier) return;
    if (hasUnsavedChanges && !confirm("You have unsaved changes. Switch plan tier anyway?")) return;

    setActiveTier(tierName);
    const tierObj = tierGroups.find((t) => t.tierName === tierName);
    const plansInTier = tierObj?.plans || [];

    if (plansInTier.length > 0) {
      // Try to preserve previous duration interval if possible
      const currentIntervalKey = selectedPlan
        ? getPlanTierAndInterval(selectedPlan.name, activeGroup || "", selectedPlan.interval).intervalKey
        : null;

      const matching =
        plansInTier.find((p) => {
          const { intervalKey } = getPlanTierAndInterval(p.name, activeGroup || "", p.interval);
          return intervalKey === currentIntervalKey;
        }) || plansInTier[0];

      setSelectedPlanId(matching.id);
      const comps = Array.isArray(matching.components) ? matching.components : [];
      setSelectedFeatures([...comps]);
      setHasUnsavedChanges(false);
    }
  };

  const handleSelectDurationPlan = (plan: SubscriptionPlan) => {
    if (plan.id === selectedPlanId) return;
    if (hasUnsavedChanges && !confirm("You have unsaved changes. Switch billing duration anyway?")) return;

    setSelectedPlanId(plan.id);
    const comps = Array.isArray(plan.components) ? plan.components : [];
    setSelectedFeatures([...comps]);
    setHasUnsavedChanges(false);
  };

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

  const handleSave = () => {
    if (!selectedPlan) return;
    const planIds =
      applyToAllDurations && currentTierPlans.length > 1
        ? currentTierPlans.map((p) => p.id)
        : [selectedPlan.id];

    savePermissionsMutation.mutate({
      planIds,
      components: selectedFeatures,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
      </div>
    );
  }

  // Active tier config metadata
  const activeTierConfig = activeTier ? TIER_CONFIG[activeTier] || null : null;
  const selectedParsed = selectedPlan
    ? getPlanTierAndInterval(selectedPlan.name, activeGroup || "", selectedPlan.interval)
    : null;
  const selectedIntervalInfo =
    selectedPlan && selectedParsed
      ? formatIntervalLabel(selectedParsed.intervalKey, selectedParsed.tier, selectedPlan.price)
      : null;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent flex items-center gap-2.5">
            <Shield className="h-6 w-6 text-orange-600" />
            Feature Permissions Manager
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-xs sm:text-sm">
            Control which features each subscription plan & duration tier has access to
          </p>
        </div>
      </div>

      {/* ─── Level 1: Business Category Selection ───────────────────── */}
      <div className="flex flex-wrap gap-2 pt-1">
        {groupNames.map((group) => {
          const GroupIcon = GROUP_ICONS[group] || Shield;
          const isActive = activeGroup === group;
          const planCount = groupedPlans[group].length;
          const colorClass = GROUP_COLORS[group] || "from-slate-500 to-gray-600";

          return (
            <button
              key={group}
              onClick={() => handleSelectGroup(group)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                isActive
                  ? `bg-gradient-to-r ${colorClass} text-white border-transparent shadow-md shadow-purple-500/20 ring-2 ring-purple-500/30`
                  : "bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <GroupIcon className="h-4 w-4" />
              <span>{group}</span>
              <Badge
                variant="secondary"
                className={`text-[10px] px-1.5 py-0 h-4.5 font-bold ${
                  isActive ? "bg-white/25 text-white border-0" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                }`}
              >
                {planCount}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* ─── Level 2: Plan Tier (Plan Name) Selection ──────────────── */}
      {tierGroups.length > 0 && (
        <div className="bg-slate-50/80 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-amber-500" />
                Step 1: Select Plan Name ({activeGroup})
              </span>
              <span className="text-xs text-slate-400">
                {tierGroups.length} commercial tiers available
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {tierGroups.map((tg) => {
                const isSelected = activeTier === tg.tierName;
                const config = TIER_CONFIG[tg.tierName] || {
                  subtitle: "Custom subscription tier",
                  inclusions: `${tg.plans.length} durations`,
                  gradient: "from-slate-600 to-gray-700",
                  borderActive: "border-slate-500 ring-slate-500/20",
                  bgActive: "bg-slate-50 dark:bg-slate-800",
                };
                const hasDurations = tg.plans.length > 1;

                // Feature counts across durations in this tier
                const minFeatures = Math.min(
                  ...tg.plans.map((p) => (Array.isArray(p.components) ? p.components.length : 0))
                );

                return (
                  <button
                    key={tg.tierName}
                    onClick={() => handleSelectTier(tg.tierName)}
                    className={`relative p-3.5 rounded-xl text-left transition-all duration-200 border-2 flex flex-col justify-between ${
                      isSelected
                        ? `${config.borderActive} ${config.bgActive} shadow-md ring-2`
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm"
                    }`}
                  >
                    {/* Top row: Name & Badge */}
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-1.5">
                        <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          {tg.tierName}
                        </span>
                        {config.badge && (
                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md text-white shrink-0 ${
                              config.isHero
                                ? "bg-gradient-to-r from-rose-500 to-indigo-600 animate-pulse"
                                : "bg-gradient-to-r from-purple-600 to-pink-600"
                            }`}
                          >
                            {config.badge}
                          </span>
                        )}
                      </div>

                      {/* Subtitle */}
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {config.subtitle}
                      </p>
                    </div>

                    {/* Bottom row: Durations count & features preview */}
                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 flex items-center gap-1 font-medium">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {tg.plans.length} {hasDurations ? "durations" : "term"}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 ${
                          isSelected ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-semibold" : ""
                        }`}
                      >
                        {minFeatures}/{totalFeatures}
                      </Badge>
                    </div>

                    {isSelected && (
                      <div className="absolute -top-1.5 -right-1.5 h-4.5 w-4.5 rounded-full bg-amber-500 flex items-center justify-center shadow">
                        <Check className="h-3 w-3 text-white stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── Level 3: Billing Duration (Time) Selection ─────────── */}
          {activeTier && currentTierPlans.length > 0 && (
            <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-indigo-500" />
                  Step 2: Select Duration / Billing Term for{" "}
                  <span className="text-indigo-600 dark:text-indigo-400">{activeTier}</span>
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Switch duration to inspect or customize specific plan permissions
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                {currentTierPlans.map((plan) => {
                  const { intervalKey } = getPlanTierAndInterval(plan.name, activeGroup || "", plan.interval);
                  const isSelected = selectedPlanId === plan.id;
                  const labelInfo = formatIntervalLabel(intervalKey, activeTier, plan.price);
                  const componentCount = Array.isArray(plan.components) ? plan.components.length : 0;

                  return (
                    <button
                      key={plan.id}
                      onClick={() => handleSelectDurationPlan(plan)}
                      className={`relative flex items-center justify-between p-3 rounded-xl text-left transition-all duration-200 border-2 ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-md ring-2 ring-indigo-500/20"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {labelInfo.title}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            ({labelInfo.period})
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 font-semibold mt-0.5">
                          <IndianRupee className="h-3 w-3 text-slate-400" />
                          <span>{plan.price}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            • {labelInfo.effectiveMonthly}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {labelInfo.badge && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              intervalKey === "yearly"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40"
                                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            {labelInfo.badge}
                          </span>
                        )}
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0 ${
                            isSelected ? "bg-indigo-600 text-white font-bold" : ""
                          }`}
                        >
                          {componentCount}/{totalFeatures}
                        </Badge>
                      </div>

                      {isSelected && (
                        <div className="absolute -top-1.5 -right-1.5 h-4.5 w-4.5 rounded-full bg-indigo-600 flex items-center justify-center shadow">
                          <Check className="h-3 w-3 text-white stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Level 4: Feature Checkbox Tree for Selected Plan ───────── */}
      {!selectedPlan ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white/50 dark:bg-slate-800/30 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
          <Shield className="h-14 w-14 text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-lg font-semibold text-slate-500 dark:text-slate-400">
            Select a plan above to manage features
          </p>
          <p className="text-sm text-slate-400 mt-1">
            Choose a business type, plan name, and duration term
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Plan Summary & Actions Toolbar */}
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between bg-white dark:bg-slate-800/70 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-3">
              <div
                className={`h-11 w-11 rounded-xl bg-gradient-to-br ${
                  activeTierConfig?.gradient || "from-amber-500 to-orange-600"
                } flex items-center justify-center shadow-lg text-white font-bold shrink-0`}
              >
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-base text-slate-900 dark:text-white">
                    {selectedPlan.name}
                  </h2>
                  <Badge variant="outline" className="text-xs border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300">
                    <IndianRupee className="h-3 w-3 mr-0.5 inline" />
                    {selectedPlan.price} / {selectedPlan.interval}
                  </Badge>
                  {selectedIntervalInfo?.effectiveMonthly && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      ({selectedIntervalInfo.effectiveMonthly})
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {selectedFeatures.length}
                  </span>{" "}
                  of {totalFeatures} features unlocked for this plan
                </p>
              </div>
            </div>

            {/* Durations Sync Option & Toolbar Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
              {currentTierPlans.length > 1 && (
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <Checkbox
                    checked={applyToAllDurations}
                    onCheckedChange={(checked) => setApplyToAllDurations(Boolean(checked))}
                    className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                  />
                  <span>
                    Apply to all {activeTier} billing options ({currentTierPlans.length} durations)
                  </span>
                </label>
              )}

              <div className="flex gap-2 flex-wrap justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedFeatures([...ALL_FEATURE_KEYS]);
                    setHasUnsavedChanges(true);
                  }}
                  className="text-xs h-8.5 rounded-lg"
                >
                  <Unlock className="h-3 w-3 mr-1 text-slate-500" /> Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedFeatures([]);
                    setHasUnsavedChanges(true);
                  }}
                  className="text-xs h-8.5 rounded-lg"
                >
                  <Lock className="h-3 w-3 mr-1 text-slate-500" /> Deselect All
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || savePermissionsMutation.isPending}
                  size="sm"
                  className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md text-xs h-8.5 px-4 rounded-lg font-semibold"
                >
                  {savePermissionsMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Save Permissions
                  {applyToAllDurations && currentTierPlans.length > 1
                    ? ` (${currentTierPlans.length} plans)`
                    : ""}
                </Button>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${totalFeatures} features in ${selectedPlan.name}...`}
              value={featureSearchQuery}
              onChange={(e) => setFeatureSearchQuery(e.target.value)}
              className="pl-10 bg-white dark:bg-slate-800/80 rounded-xl h-9.5 text-sm border-slate-200 dark:border-slate-700"
            />
          </div>

          {/* Feature Categories Tree */}
          <ScrollArea className="h-[calc(100vh-480px)] min-h-[400px]">
            <div className="space-y-3 pr-4 pb-12">
              {filteredRegistry.map((category) => {
                const Icon = ICON_MAP[category.icon] || Shield;
                const categoryKeys = category.features.map((f) => f.key);
                const selectedCount = categoryKeys.filter((k) => selectedFeatures.includes(k)).length;
                const totalCount = categoryKeys.length;
                const allSelected = selectedCount === totalCount;
                const someSelected = selectedCount > 0 && !allSelected;
                const isCollapsed = collapsedCategories.has(category.id);

                return (
                  <div
                    key={category.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800/60 shadow-sm"
                  >
                    {/* Category Header */}
                    <div
                      className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => toggleCollapseCategory(category.id)}
                    >
                      <div className="flex items-center gap-3">
                        {isCollapsed ? (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div
                          className={`h-7 w-7 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center shadow-xs`}
                        >
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                          {category.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            allSelected
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-bold"
                              : someSelected
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-semibold"
                              : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
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
                          className="text-xs h-7 px-2 font-medium"
                        >
                          {allSelected ? "Deselect All" : "Select All"}
                        </Button>
                      </div>
                    </div>

                    {/* Feature Items List */}
                    {!isCollapsed && (
                      <div className="border-t border-slate-100 dark:border-slate-700/60 px-4 py-3 bg-slate-50/40 dark:bg-slate-900/20">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {category.features.map((feature) => {
                            const isChecked = selectedFeatures.includes(feature.key);
                            return (
                              <div
                                key={feature.key}
                                className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                                  isChecked
                                    ? "bg-emerald-50/80 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-700 shadow-xs"
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
                                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 block cursor-pointer">
                                    {feature.label}
                                  </span>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {feature.description}
                                  </p>
                                </div>
                                <code className="text-[10px] text-muted-foreground bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded hidden xl:block font-mono">
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
