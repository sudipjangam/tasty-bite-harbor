import { useState, useMemo } from "react";
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
} from "lucide-react";
import {
  FEATURE_REGISTRY,
  FeatureCategory,
  ALL_FEATURE_KEYS,
} from "@/constants/featureRegistry";

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
    null
  );
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [featureSearchQuery, setFeatureSearchQuery] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set()
  );
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
      return data as SubscriptionPlan[];
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

  // ─── Permissions Manager Logic ──────────────────────────────────────

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
        : [...prev, featureKey]
    );
  };

  const toggleCategory = (category: FeatureCategory) => {
    const categoryKeys = category.features.map((f) => f.key);
    const allSelected = categoryKeys.every((k) =>
      selectedFeatures.includes(k)
    );

    if (allSelected) {
      // Deselect all in this category
      setSelectedFeatures((prev) =>
        prev.filter((f) => !categoryKeys.includes(f))
      );
    } else {
      // Select all in this category
      setSelectedFeatures((prev) => [
        ...new Set([...prev, ...categoryKeys]),
      ]);
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
          f.description.toLowerCase().includes(q)
      ),
    })).filter((c) => c.features.length > 0);
  }, [featureSearchQuery]);

  const totalFeatures = ALL_FEATURE_KEYS.length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
            Subscription Plans
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-lg">
            Manage pricing tiers and granular feature entitlements
          </p>
        </div>
        <Button
          onClick={() => setIsAddOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 shadow-lg hover:shadow-emerald-500/25 transition-all text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Plan
        </Button>
      </div>

      {/* Plans Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-20 bg-white/30 dark:bg-slate-900/30 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
          <CreditCard className="h-16 w-16 mx-auto text-slate-300 mb-4" />
          <p className="text-xl font-semibold text-slate-600 dark:text-slate-300">
            No plans defined
          </p>
          <Button onClick={() => setIsAddOpen(true)} className="mt-4">
            Create First Plan
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const count = subscriberCounts[plan.id] || 0;
            const features = Array.isArray(plan.features) ? plan.features : [];
            const componentCount = Array.isArray(plan.components)
              ? plan.components.length
              : 0;

            // Tier-based color schemes
            const tierColor =
              plan.price === 0
                ? {
                    gradient: "from-slate-400 to-slate-500",
                    light: "slate",
                    text: "slate",
                  }
                : plan.price < 1000
                ? {
                    gradient: "from-emerald-500 to-teal-600",
                    light: "emerald",
                    text: "emerald",
                  }
                : plan.price < 2000
                ? {
                    gradient: "from-blue-500 to-indigo-600",
                    light: "blue",
                    text: "indigo",
                  }
                : plan.price < 5000
                ? {
                    gradient: "from-violet-500 to-purple-600",
                    light: "violet",
                    text: "purple",
                  }
                : {
                    gradient: "from-amber-500 to-orange-600",
                    light: "amber",
                    text: "orange",
                  };

            return (
              <div
                key={plan.id}
                className={`group relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 overflow-hidden
                ${!plan.is_active ? "opacity-60 grayscale" : ""}
                `}
              >
                {/* Gradient border on hover */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${tierColor.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl`}
                />
                <div className="absolute inset-[2px] bg-white dark:bg-slate-900 rounded-3xl" />

                {/* Top gradient bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${tierColor.gradient} rounded-t-3xl`}
                />

                {!plan.is_active && (
                  <div className="absolute top-4 right-4 bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider z-20">
                    Inactive
                  </div>
                )}

                <div className="relative z-10">
                  <div className="mb-6">
                    <h3
                      className={`text-xl font-bold mb-2 bg-gradient-to-r ${tierColor.gradient} bg-clip-text text-transparent`}
                    >
                      {plan.name}
                    </h3>
                    <p className="text-slate-500 text-sm leading-relaxed min-h-[40px]">
                      {plan.description}
                    </p>
                  </div>

                  <div className="mb-8">
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400">
                        <IndianRupee className="h-8 w-8 inline-block -mt-1 mr-1" />
                        {plan.price.toLocaleString()}
                      </span>
                      <span className="text-slate-400 ml-2 font-medium">
                        /{plan.interval}
                      </span>
                    </div>
                  </div>

                  {/* Feature count badge */}
                  <div className="mb-6">
                    <Badge
                      variant="outline"
                      className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700"
                    >
                      <Lock className="h-3 w-3 mr-1" />
                      {componentCount} / {totalFeatures} features enabled
                    </Badge>
                  </div>

                  <div className="space-y-3 mb-8 min-h-[120px]">
                    {features.slice(0, 5).map((feature, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300"
                      >
                        <div className="mt-1 min-w-[1.25rem] h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                          <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="leading-tight">{feature}</span>
                      </div>
                    ))}
                    {features.length > 5 && (
                      <p className="text-xs text-slate-400 pl-8">
                        +{features.length - 5} more features
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800/50">
                    <div className="flex items-center gap-2">
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded-lg">
                        <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                          Subscribers
                        </p>
                        <p className="font-bold text-slate-900 dark:text-white">
                          {count}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {/* Feature Permissions Button — NEW */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openPermissions(plan)}
                        className="hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-900/20"
                        title="Manage Feature Permissions"
                      >
                        <Shield className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(plan)}
                        className="hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-900/20"
                      >
                        <Edit className="h-4 w-4" />
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
                        className={
                          plan.is_active
                            ? "text-emerald-600 hover:bg-emerald-50"
                            : "text-slate-400 hover:bg-slate-50"
                        }
                      >
                        {plan.is_active ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => {
                          if (count > 0) {
                            toast.error(
                              "Cannot delete plan with active subscribers"
                            );
                            return;
                          }
                          if (confirm("Delete this plan?")) {
                            deleteMutation.mutate(plan.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Feature Permissions Manager Dialog ─────────────────────────── */}
      <Dialog open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-700/50">
          <DialogHeader className="pb-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-lg font-semibold">
                  Feature Permissions — {selectedPlan?.name}
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
                    selectedFeatures.includes(k)
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
                                feature.key
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
                placeholder="e.g., Restaurant Pro"
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
                <Label>Price (₹) *</Label>
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
            <div>
              <Label>Price (₹)</Label>
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
                      features: features,
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
    </div>
  );
};

export default SubscriptionManager;
