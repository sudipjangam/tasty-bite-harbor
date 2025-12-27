import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  CreditCard,
  Edit,
  Trash2,
  Loader2,
  Check,
  X,
  Building2,
  IndianRupee,
} from "lucide-react";

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
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    null
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
      console.log("Subscriber counts:", counts);
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
            Subscription Plans
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-lg">
            Manage pricing tiers and feature entitlements
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
          {plans.map((plan, index) => {
            const count = subscriberCounts[plan.id] || 0;
            const features = Array.isArray(plan.features) ? plan.features : [];

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
            <div>
              <Label>Components (one per line)</Label>
              <Textarea
                value={formData.components}
                onChange={(e) =>
                  setFormData({ ...formData, components: e.target.value })
                }
                placeholder="dashboard&#10;menu&#10;orders"
                rows={3}
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
