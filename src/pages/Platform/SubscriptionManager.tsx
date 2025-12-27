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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Subscription Plans
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage pricing and subscription plans
          </p>
        </div>
        <Button
          onClick={() => setIsAddOpen(true)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Plan
        </Button>
      </div>

      {/* Plans Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const count = subscriberCounts[plan.id] || 0;
            const features = Array.isArray(plan.features) ? plan.features : [];

            return (
              <Card
                key={plan.id}
                className={`border-slate-200 dark:border-slate-700 relative ${
                  !plan.is_active ? "opacity-60" : ""
                }`}
              >
                {!plan.is_active && (
                  <Badge className="absolute top-3 right-3 bg-red-100 text-red-700">
                    Inactive
                  </Badge>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <p className="text-sm text-slate-500">{plan.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <span className="text-3xl font-bold flex items-center">
                      <IndianRupee className="h-5 w-5" />
                      {plan.price.toLocaleString()}
                    </span>
                    <span className="text-slate-500">/{plan.interval}</span>
                  </div>

                  <div className="space-y-2 mb-4">
                    {features
                      .slice(0, 4)
                      .map((feature: string, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Check className="h-4 w-4 text-emerald-500" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    {features.length > 4 && (
                      <p className="text-xs text-slate-400">
                        +{features.length - 4} more
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 mb-4">
                    <Building2 className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      {count} subscriber{count !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEdit(plan)}
                    >
                      <Edit className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        toggleMutation.mutate({
                          id: plan.id,
                          is_active: !plan.is_active,
                        })
                      }
                    >
                      {plan.is_active ? (
                        <X className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600"
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
                </CardContent>
              </Card>
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
