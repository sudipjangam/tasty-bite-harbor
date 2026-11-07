import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Pencil,
  Trash2,
  CreditCard,
  IndianRupee,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { CreateRestaurantDialog } from "./CreateRestaurantDialog";
import { EditRestaurantDialog } from "./EditRestaurantDialog";
import { DeleteRestaurantDialog } from "./DeleteRestaurantDialog";
import { toast } from "sonner";
import { calculateSubscriptionEndDate } from "@/utils/subscriptionUtils";

interface Restaurant {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  verification_status: string;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  created_at: string;
  restaurant_subscriptions?: Array<{
    id: string;
    status: string;
    plan_id: string;
    current_period_end: string;
    subscription_plans?: {
      id: string;
      name: string;
      price: number;
      interval: string;
    } | null;
  }>;
}

export const RestaurantManagement = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(
    null,
  );
  const [deletingRestaurant, setDeletingRestaurant] =
    useState<Restaurant | null>(null);
  const [managingSubRestaurant, setManagingSubRestaurant] =
    useState<Restaurant | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");

  const {
    data: restaurants = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin-restaurants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select(
          `
          *,
          restaurant_subscriptions (
            id,
            status,
            current_period_end,
            plan_id,
            subscription_plans:plan_id (
              id,
              name,
              price,
              interval
            )
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Restaurant[];
    },
  });

  const { data: availablePlans = [] } = useQuery({
    queryKey: ["all-available-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("price");
      if (error) throw error;
      return data || [];
    },
  });

  const updateSubMutation = useMutation({
    mutationFn: async ({
      restaurantId,
      planId,
      existingSubId,
    }: {
      restaurantId: string;
      planId: string;
      existingSubId?: string;
    }) => {
      const plan = availablePlans.find((p: any) => p.id === planId);
      const endDate = calculateSubscriptionEndDate(plan?.interval || "monthly");
      const componentsToAssign = Array.isArray(plan?.components)
        ? plan.components
        : [];

      if (existingSubId) {
        const { error } = await supabase
          .from("restaurant_subscriptions")
          .update({
            plan_id: planId,
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: endDate,
            components: componentsToAssign,
          })
          .eq("id", existingSubId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("restaurant_subscriptions")
          .insert({
            restaurant_id: restaurantId,
            plan_id: planId,
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: endDate,
            components: componentsToAssign,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      refetch();
      toast.success("Subscription plan updated successfully");
      setManagingSubRestaurant(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update subscription");
    },
  });

  const handleSuccess = () => {
    refetch();
    toast.success("Operation completed successfully");
  };

  const openManagePlan = (restaurant: Restaurant) => {
    setManagingSubRestaurant(restaurant);
    const subArray = restaurant.restaurant_subscriptions;
    const sub = Array.isArray(subArray) ? subArray[0] : subArray;
    setSelectedPlanId(sub?.plan_id || "");
  };

  if (isLoading) {
    return (
      <div className="py-8 text-center text-slate-500">
        Loading restaurants...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Restaurant Management</CardTitle>
              <CardDescription>
                Manage all restaurants, pricing tiers, and active subscription
                plans
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Restaurant
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {restaurants.map((restaurant) => {
              const subArray = restaurant.restaurant_subscriptions;
              const sub = Array.isArray(subArray) ? subArray[0] : subArray;
              const plan = sub?.subscription_plans;

              return (
                <Card
                  key={restaurant.id}
                  className="hover:border-slate-300 transition-colors"
                >
                  <CardContent className="pt-6">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold">
                            {restaurant.name}
                          </h3>
                          <Badge
                            variant={
                              restaurant.is_active ? "default" : "secondary"
                            }
                          >
                            {restaurant.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline">
                            {restaurant.verification_status}
                          </Badge>

                          {/* Subscription Plan Badge */}
                          {plan ? (
                            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200">
                              <CreditCard className="h-3 w-3 mr-1" />
                              {plan.name} — ₹{plan.price.toLocaleString()} /{" "}
                              {plan.interval}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-amber-600 bg-amber-50 dark:bg-amber-950/20 border-amber-300"
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              No Plan Assigned
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                          {restaurant.owner_name && (
                            <div>
                              Owner:{" "}
                              <span className="text-foreground">
                                {restaurant.owner_name}
                              </span>
                            </div>
                          )}
                          {restaurant.email && (
                            <div>Email: {restaurant.email}</div>
                          )}
                          {restaurant.phone && (
                            <div>Phone: {restaurant.phone}</div>
                          )}
                          {restaurant.address && (
                            <div>Address: {restaurant.address}</div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                          <div>
                            Created:{" "}
                            {new Date(
                              restaurant.created_at,
                            ).toLocaleDateString()}
                          </div>
                          {sub && (
                            <div className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                              <Clock className="h-3.5 w-3.5 text-blue-500" />
                              Subscription expires:{" "}
                              {new Date(
                                sub.current_period_end,
                              ).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openManagePlan(restaurant)}
                          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                          title="Manage Subscription Plan"
                        >
                          <CreditCard className="h-4 w-4 mr-1.5" />
                          Plan
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingRestaurant(restaurant)}
                          title="Edit Details"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingRestaurant(restaurant)}
                          title="Delete Restaurant"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Manage Subscription Dialog */}
      <Dialog
        open={!!managingSubRestaurant}
        onOpenChange={(open) => !open && setManagingSubRestaurant(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Subscription Plan</DialogTitle>
            <DialogDescription>
              Assign or update pricing plan for{" "}
              <span className="font-semibold text-foreground">
                {managingSubRestaurant?.name}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div>
              <Label>Select Subscription Plan</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Choose a plan..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {availablePlans.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — ₹{p.price.toLocaleString()} / {p.interval}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setManagingSubRestaurant(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (managingSubRestaurant && selectedPlanId) {
                  const subArray =
                    managingSubRestaurant.restaurant_subscriptions;
                  const sub = Array.isArray(subArray) ? subArray[0] : subArray;
                  updateSubMutation.mutate({
                    restaurantId: managingSubRestaurant.id,
                    planId: selectedPlanId,
                    existingSubId: sub?.id,
                  });
                }
              }}
              disabled={!selectedPlanId || updateSubMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {updateSubMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Update Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateRestaurantDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleSuccess}
      />

      {editingRestaurant && (
        <EditRestaurantDialog
          restaurant={editingRestaurant}
          open={!!editingRestaurant}
          onOpenChange={(open) => !open && setEditingRestaurant(null)}
          onSuccess={handleSuccess}
        />
      )}

      {deletingRestaurant && (
        <DeleteRestaurantDialog
          restaurant={deletingRestaurant}
          open={!!deletingRestaurant}
          onOpenChange={(open) => !open && setDeletingRestaurant(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};
