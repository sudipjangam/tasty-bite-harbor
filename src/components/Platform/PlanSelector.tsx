import React, { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
  IndianRupee,
  Clock,
  Check,
  Building2,
  CookingPot,
  Hotel,
  Layers,
  Sparkles,
  Zap,
  Store,
  Shield,
  BarChart3,
  Star,
} from "lucide-react";
import {
  getPlanGroup,
  getPlanTierAndInterval,
  formatIntervalLabel,
  TIER_CONFIG,
  TIER_SORT_ORDER,
  INTERVAL_SORT_ORDER,
  type SubscriptionPlanItem,
} from "@/utils/planHierarchy";

interface PlanSelectorProps {
  plans: SubscriptionPlanItem[];
  selectedPlanId: string;
  onSelectPlan: (planId: string) => void;
  className?: string;
}

const GROUP_ICONS: Record<string, any> = {
  Restaurant: Building2,
  "Food Truck": CookingPot,
  Hotel: Hotel,
  "Restaurant + Hotel": Layers,
  "All-in-One": Sparkles,
};

export const PlanSelector: React.FC<PlanSelectorProps> = ({
  plans,
  selectedPlanId,
  onSelectPlan,
  className = "",
}) => {
  // Filter out inactive and quarterly plans
  const activePlans = useMemo(() => {
    return plans.filter(
      (p) =>
        p.is_active !== false &&
        p.interval !== "quarterly" &&
        !p.name.toLowerCase().includes("quarterly")
    );
  }, [plans]);

  // Find selected plan object
  const currentSelectedPlan = useMemo(
    () => activePlans.find((p) => p.id === selectedPlanId) || null,
    [activePlans, selectedPlanId]
  );

  // Group all plans by category
  const groupedPlans = useMemo(() => {
    const groups: Record<string, SubscriptionPlanItem[]> = {};
    activePlans.forEach((p) => {
      const g = getPlanGroup(p.name);
      if (!groups[g]) groups[g] = [];
      groups[g].push(p);
    });
    return groups;
  }, [activePlans]);

  const groupNames = Object.keys(groupedPlans);

  // Determine initial group based on selected plan or first group
  const [activeGroup, setActiveGroup] = useState<string>(() => {
    if (currentSelectedPlan) {
      return getPlanGroup(currentSelectedPlan.name);
    }
    return groupNames[0] || "Restaurant";
  });

  // Keep activeGroup synced if selectedPlan changes externally
  useEffect(() => {
    if (currentSelectedPlan) {
      const g = getPlanGroup(currentSelectedPlan.name);
      if (g && g !== activeGroup) {
        setActiveGroup(g);
      }
    }
  }, [currentSelectedPlan]);

  const visiblePlans = groupedPlans[activeGroup] || [];

  // Group visible plans by Tier
  const tierGroups = useMemo(() => {
    const map = new Map<string, SubscriptionPlanItem[]>();
    visiblePlans.forEach((plan) => {
      const { tier } = getPlanTierAndInterval(plan.name, activeGroup, plan.interval);
      if (!map.has(tier)) map.set(tier, []);
      map.get(tier)!.push(plan);
    });

    map.forEach((plansList) => {
      plansList.sort((a, b) => {
        const { intervalKey: intA } = getPlanTierAndInterval(a.name, activeGroup, a.interval);
        const { intervalKey: intB } = getPlanTierAndInterval(b.name, activeGroup, b.interval);
        return (INTERVAL_SORT_ORDER[intA] ?? 99) - (INTERVAL_SORT_ORDER[intB] ?? 99);
      });
    });

    const sortedTiers = Array.from(map.keys()).sort((a, b) => {
      return (TIER_SORT_ORDER[a.toLowerCase()] ?? 99) - (TIER_SORT_ORDER[b.toLowerCase()] ?? 99);
    });

    return sortedTiers.map((tierName) => ({
      tierName,
      plans: map.get(tierName) || [],
    }));
  }, [visiblePlans, activeGroup]);

  // Determine active tier based on selected plan or first tier
  const [activeTier, setActiveTier] = useState<string | null>(() => {
    if (currentSelectedPlan) {
      return getPlanTierAndInterval(currentSelectedPlan.name, activeGroup, currentSelectedPlan.interval).tier;
    }
    return tierGroups[0]?.tierName || null;
  });

  // Keep activeTier aligned
  useEffect(() => {
    if (currentSelectedPlan) {
      const { tier } = getPlanTierAndInterval(currentSelectedPlan.name, activeGroup, currentSelectedPlan.interval);
      if (tier && tier !== activeTier) {
        setActiveTier(tier);
      }
    } else if (tierGroups.length > 0 && (!activeTier || !tierGroups.some((t) => t.tierName === activeTier))) {
      setActiveTier(tierGroups[0].tierName);
    }
  }, [currentSelectedPlan, tierGroups]);

  const currentTierObj = tierGroups.find((t) => t.tierName === activeTier);
  const currentTierPlans = currentTierObj?.plans || [];

  const handleSelectTier = (tierName: string) => {
    setActiveTier(tierName);
    const tierObj = tierGroups.find((t) => t.tierName === tierName);
    const plansInTier = tierObj?.plans || [];
    if (plansInTier.length > 0) {
      // Try to preserve current interval
      const currentIntervalKey = currentSelectedPlan
        ? getPlanTierAndInterval(currentSelectedPlan.name, activeGroup, currentSelectedPlan.interval).intervalKey
        : null;

      const matching =
        plansInTier.find((p) => {
          const { intervalKey } = getPlanTierAndInterval(p.name, activeGroup, p.interval);
          return intervalKey === currentIntervalKey;
        }) || plansInTier[0];

      onSelectPlan(matching.id);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 1. Category Switcher */}
      {groupNames.length > 1 && (
        <div className="flex flex-wrap gap-1.5 pb-1">
          {groupNames.map((group) => {
            const Icon = GROUP_ICONS[group] || Shield;
            const isGroupActive = activeGroup === group;
            return (
              <button
                type="button"
                key={group}
                onClick={() => {
                  setActiveGroup(group);
                  const firstTier = groupedPlans[group]?.[0];
                  if (firstTier) {
                    const { tier } = getPlanTierAndInterval(firstTier.name, group, firstTier.interval);
                    setActiveTier(tier);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  isGroupActive
                    ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{group}</span>
                <span className="text-[10px] opacity-75 font-normal">
                  ({groupedPlans[group]?.length || 0})
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 2. Tier Selection Cards */}
      {tierGroups.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-0.5">
            <span>Select Plan Name ({activeGroup})</span>
            <span>{tierGroups.length} tiers</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {tierGroups.map((tg) => {
              const isSelected = activeTier === tg.tierName;
              const config = TIER_CONFIG[tg.tierName] || {
                subtitle: "Subscription tier",
                inclusions: "",
                gradient: "from-slate-600 to-gray-700",
                borderActive: "border-slate-500 ring-slate-500/20",
                bgActive: "bg-slate-50 dark:bg-slate-800",
              };

              return (
                <button
                  type="button"
                  key={tg.tierName}
                  onClick={() => handleSelectTier(tg.tierName)}
                  className={`relative p-3 rounded-xl text-left transition-all border-2 flex flex-col justify-between ${
                    isSelected
                      ? `${config.borderActive} ${config.bgActive} shadow-xs ring-1`
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-slate-300"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {tg.tierName}
                      </span>
                      {config.badge && (
                        <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-rose-500 text-white shrink-0">
                          {config.isHero ? "POPULAR" : config.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                      {config.subtitle}
                    </p>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="h-3 w-3 text-slate-400" />
                      {tg.plans.length} {tg.plans.length > 1 ? "options" : "term"}
                    </span>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 stroke-[3]" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Duration / Billing Term Selection */}
      {activeTier && currentTierPlans.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-0.5">
            <span>
              Billing Duration for <strong className="text-slate-800 dark:text-slate-200">{activeTier}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {currentTierPlans.map((plan) => {
              const { intervalKey } = getPlanTierAndInterval(plan.name, activeGroup, plan.interval);
              const isSelected = selectedPlanId === plan.id;
              const labelInfo = formatIntervalLabel(intervalKey, activeTier, plan.price);

              return (
                <button
                  type="button"
                  key={plan.id}
                  onClick={() => onSelectPlan(plan.id)}
                  className={`relative flex items-center justify-between p-3 rounded-xl text-left transition-all border-2 ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 shadow-xs ring-1 ring-indigo-500/30"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {labelInfo.title}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        ({labelInfo.period})
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-700 dark:text-slate-200 font-bold mt-0.5">
                      <IndianRupee className="h-3 w-3 text-slate-400" />
                      <span>{plan.price}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({labelInfo.effectiveMonthly})
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {labelInfo.badge && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          intervalKey === "yearly"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {labelInfo.badge}
                      </span>
                    )}
                    {isSelected && (
                      <div className="h-4 w-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanSelector;
