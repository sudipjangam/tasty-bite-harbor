import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { Customer, CustomerLoyaltyTier } from "@/types/customer";
import {
  LoyaltyTierDB,
  LoyaltyProgramDB,
  DEFAULT_TIER_COLORS,
} from "@/types/loyalty";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import {
  Star,
  Plus,
  Edit2,
  Settings,
  Gift,
  TrendingUp,
  Crown,
  Award,
  Trophy,
  Trash2,
  GripVertical,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LoyaltyManagementProps {
  customer: Customer;
  onUpdateCustomer: (updates: Partial<Customer>) => void;
}

// Default tiers to use when no tiers exist in database
const defaultTiers: Omit<
  LoyaltyTierDB,
  "id" | "restaurant_id" | "created_at" | "updated_at"
>[] = [
  {
    name: "None",
    points_required: 0,
    min_spent: 0,
    min_visits: 0,
    points_multiplier: 1,
    benefits: ["Basic service"],
    color: "bg-gray-500",
    display_order: 0,
  },
  {
    name: "Bronze",
    points_required: 100,
    min_spent: 1000,
    min_visits: 3,
    points_multiplier: 1,
    benefits: ["5% discount on special occasions"],
    color: "bg-amber-600",
    display_order: 1,
  },
  {
    name: "Silver",
    points_required: 500,
    min_spent: 2500,
    min_visits: 5,
    points_multiplier: 1.2,
    benefits: ["10% discount", "Priority reservations"],
    color: "bg-gray-400",
    display_order: 2,
  },
  {
    name: "Gold",
    points_required: 1000,
    min_spent: 5000,
    min_visits: 8,
    points_multiplier: 1.5,
    benefits: ["15% discount", "Priority reservations", "Free appetizer"],
    color: "bg-yellow-500",
    display_order: 3,
  },
  {
    name: "Platinum",
    points_required: 2500,
    min_spent: 10000,
    min_visits: 10,
    points_multiplier: 2,
    benefits: [
      "20% discount",
      "VIP seating",
      "Free dessert",
      "Birthday special",
    ],
    color: "bg-slate-500",
    display_order: 4,
  },
  {
    name: "Diamond",
    points_required: 5000,
    min_spent: 20000,
    min_visits: 15,
    points_multiplier: 2.5,
    benefits: [
      "25% discount",
      "VIP treatment",
      "Exclusive events",
      "Personal service",
    ],
    color: "bg-purple-600",
    display_order: 5,
  },
];

const LoyaltyManagement: React.FC<LoyaltyManagementProps> = ({
  customer,
  onUpdateCustomer,
}) => {
  const { toast } = useToast();
  const { restaurantId } = useRestaurantId();
  const queryClient = useQueryClient();

  const [isEditingPoints, setIsEditingPoints] = useState(false);
  const [isEditingTier, setIsEditingTier] = useState(false);
  const [newPoints, setNewPoints] = useState(
    customer.loyalty_points.toString()
  );
  const [newTier, setNewTier] = useState<CustomerLoyaltyTier>(
    customer.loyalty_tier
  );
  const [showProgramSettings, setShowProgramSettings] = useState(false);
  const [showTierEditor, setShowTierEditor] = useState(false);
  const [editingTier, setEditingTier] = useState<LoyaltyTierDB | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tierToDelete, setTierToDelete] = useState<LoyaltyTierDB | null>(null);

  // Fetch loyalty program settings
  const { data: loyaltyProgram } = useQuery({
    queryKey: ["loyalty-program", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      const { data, error } = await supabase
        .from("loyalty_programs")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching loyalty program:", error);
        return null;
      }
      return data as LoyaltyProgramDB | null;
    },
    enabled: !!restaurantId,
  });

  // Fetch loyalty tiers from database
  const { data: tiers = [], isLoading: tiersLoading } = useQuery({
    queryKey: ["loyalty-tiers", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("loyalty_tiers")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("display_order");

      if (error) {
        console.error("Error fetching loyalty tiers:", error);
        return [];
      }

      // Transform database response to proper type with defaults
      return (data || []).map((tier) => ({
        ...tier,
        min_spent: tier.min_spent ?? 0,
        min_visits: tier.min_visits ?? 0,
        points_multiplier: tier.points_multiplier ?? 1,
        color: tier.color ?? "bg-gray-500",
        benefits: Array.isArray(tier.benefits) ? tier.benefits : [],
      })) as LoyaltyTierDB[];
    },
    enabled: !!restaurantId,
  });

  // Use database tiers or defaults if none exist
  const effectiveTiers =
    tiers.length > 0
      ? tiers
      : (defaultTiers.map((t, i) => ({
          ...t,
          id: `default-${i}`,
          restaurant_id: restaurantId || "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })) as LoyaltyTierDB[]);

  // Save tier mutation
  const saveTierMutation = useMutation({
    mutationFn: async (tier: Partial<LoyaltyTierDB> & { id?: string }) => {
      if (!restaurantId) throw new Error("No restaurant ID");

      const tierData = {
        name: tier.name,
        points_required: tier.points_required || 0,
        min_spent: tier.min_spent || 0,
        min_visits: tier.min_visits || 0,
        points_multiplier: tier.points_multiplier || 1,
        benefits: tier.benefits || [],
        color: tier.color || "bg-gray-500",
        display_order: tier.display_order ?? effectiveTiers.length,
        restaurant_id: restaurantId,
      };

      if (tier.id && !tier.id.startsWith("default-")) {
        const { error } = await supabase
          .from("loyalty_tiers")
          .update(tierData)
          .eq("id", tier.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("loyalty_tiers")
          .insert([tierData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-tiers"] });
      setShowTierEditor(false);
      setEditingTier(null);
      toast({ title: "Tier saved successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error saving tier",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete tier mutation
  const deleteTierMutation = useMutation({
    mutationFn: async (tierId: string) => {
      const { error } = await supabase
        .from("loyalty_tiers")
        .delete()
        .eq("id", tierId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-tiers"] });
      setShowDeleteConfirm(false);
      setTierToDelete(null);
      toast({ title: "Tier deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting tier",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update customer points
  const updateLoyaltyPoints = async () => {
    const points = parseInt(newPoints);
    if (isNaN(points) || points < 0) {
      toast({
        title: "Invalid Points",
        description: "Please enter a valid number.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("customers")
        .update({ loyalty_points: points })
        .eq("id", customer.id);

      if (error) throw error;
      onUpdateCustomer({ loyalty_points: points });
      setIsEditingPoints(false);
      toast({
        title: "Points Updated",
        description: `Loyalty points updated to ${points}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Update customer tier
  const updateLoyaltyTier = async () => {
    try {
      const { error } = await supabase
        .from("customers")
        .update({ loyalty_tier: newTier })
        .eq("id", customer.id);

      if (error) throw error;
      onUpdateCustomer({ loyalty_tier: newTier });
      setIsEditingTier(false);
      toast({
        title: "Tier Updated",
        description: `Loyalty tier updated to ${newTier}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Save program settings
  const saveProgramSettings = async (settings: Partial<LoyaltyProgramDB>) => {
    if (!restaurantId) return;

    try {
      if (loyaltyProgram) {
        const { error } = await supabase
          .from("loyalty_programs")
          .update(settings)
          .eq("id", loyaltyProgram.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("loyalty_programs")
          .insert([{ ...settings, restaurant_id: restaurantId }]);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["loyalty-program"] });
      setShowProgramSettings(false);
      toast({ title: "Program settings saved" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Get tier icon based on name
  const getTierIcon = (tierName: string) => {
    const lower = tierName.toLowerCase();
    if (lower.includes("diamond")) return <Crown className="h-4 w-4" />;
    if (lower.includes("platinum")) return <Star className="h-4 w-4" />;
    if (lower.includes("gold")) return <Award className="h-4 w-4" />;
    return <Trophy className="h-4 w-4" />;
  };

  // Find current tier for customer
  const currentTier =
    effectiveTiers.find((t) => t.name === customer.loyalty_tier) ||
    effectiveTiers[0];
  const currentTierIndex = effectiveTiers.findIndex(
    (t) => t.name === customer.loyalty_tier
  );
  const nextTier =
    currentTierIndex < effectiveTiers.length - 1
      ? effectiveTiers[currentTierIndex + 1]
      : null;

  return (
    <div className="space-y-6">
      {/* Loyalty Status Card */}
      <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 dark:from-purple-900/20 dark:to-indigo-900/20 dark:border-purple-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-300">
              <Gift className="h-5 w-5" />
              Loyalty Status
            </CardTitle>
            <div className="flex gap-2">
              <Dialog open={showTierEditor} onOpenChange={setShowTierEditor}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingTier(null)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Tiers
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTier
                        ? `Edit ${editingTier.name} Tier`
                        : "Manage Loyalty Tiers"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingTier
                        ? "Update the tier settings below"
                        : "Customize your loyalty tiers with spending thresholds, visit requirements, and benefits"}
                    </DialogDescription>
                  </DialogHeader>
                  {editingTier ? (
                    <TierEditorForm
                      tier={editingTier}
                      onSave={(tier) => saveTierMutation.mutate(tier)}
                      onCancel={() => setEditingTier(null)}
                      isLoading={saveTierMutation.isPending}
                    />
                  ) : (
                    <TierListManager
                      tiers={effectiveTiers}
                      onEdit={(tier) => setEditingTier(tier)}
                      onAdd={() =>
                        setEditingTier({
                          id: "",
                          restaurant_id: restaurantId || "",
                          name: "",
                          points_required: 0,
                          min_spent: 0,
                          min_visits: 0,
                          points_multiplier: 1,
                          benefits: [],
                          color: "bg-gray-500",
                          display_order: effectiveTiers.length,
                          created_at: "",
                          updated_at: "",
                        })
                      }
                      onDelete={(tier) => {
                        setTierToDelete(tier);
                        setShowDeleteConfirm(true);
                      }}
                    />
                  )}
                </DialogContent>
              </Dialog>
              <Dialog
                open={showProgramSettings}
                onOpenChange={setShowProgramSettings}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Points Settings
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Loyalty Program Settings</DialogTitle>
                  </DialogHeader>
                  <ProgramSettingsForm
                    program={loyaltyProgram}
                    onSave={saveProgramSettings}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Points Management */}
          <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Loyalty Points
              </p>
              <div className="flex items-center gap-2">
                {isEditingPoints ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={newPoints}
                      onChange={(e) => setNewPoints(e.target.value)}
                      className="w-24"
                      min="0"
                    />
                    <Button size="sm" onClick={updateLoyaltyPoints}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditingPoints(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-purple-600">
                      {customer.loyalty_points.toLocaleString()}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingPoints(true)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Points Value
              </p>
              <CurrencyDisplay
                amount={
                  customer.loyalty_points *
                  (loyaltyProgram?.amount_per_point || 1)
                }
                className="text-lg font-semibold text-green-600"
              />
            </div>
          </div>

          {/* Tier Management */}
          <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Loyalty Tier
              </p>
              <div className="flex items-center gap-2 mt-1">
                {isEditingTier ? (
                  <div className="flex items-center gap-2">
                    <Select
                      value={newTier}
                      onValueChange={(value: CustomerLoyaltyTier) =>
                        setNewTier(value)
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {effectiveTiers.map((tier) => (
                          <SelectItem key={tier.id} value={tier.name}>
                            <div className="flex items-center gap-2">
                              {getTierIcon(tier.name)}
                              {tier.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={updateLoyaltyTier}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditingTier(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <Badge
                      className={cn(
                        currentTier?.color || "bg-gray-500",
                        "text-white"
                      )}
                    >
                      {getTierIcon(customer.loyalty_tier)}
                      <span className="ml-1">{customer.loyalty_tier}</span>
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingTier(true)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Points Multiplier
              </p>
              <p className="text-lg font-semibold text-purple-600">
                {currentTier?.points_multiplier || 1}x
              </p>
            </div>
          </div>

          {/* Tier Benefits */}
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
            <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">
              Current Tier Benefits
            </h4>
            <ul className="space-y-1">
              {(currentTier?.benefits || []).map((benefit, index) => (
                <li
                  key={index}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                >
                  <Star className="h-3 w-3 text-yellow-500" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          {/* Progress to Next Tier */}
          {nextTier && (
            <TierProgress
              customer={customer}
              currentTier={currentTier}
              nextTier={nextTier}
            />
          )}
          {!nextTier && (
            <div className="p-4 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg border">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-purple-600" />
                <p className="font-medium text-purple-800 dark:text-purple-300">
                  Maximum tier reached! 🎉
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Delete Tier?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the "{tierToDelete?.name}" tier?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                tierToDelete && deleteTierMutation.mutate(tierToDelete.id)
              }
              disabled={deleteTierMutation.isPending}
            >
              {deleteTierMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Tier Progress Component
const TierProgress: React.FC<{
  customer: Customer;
  currentTier: LoyaltyTierDB;
  nextTier: LoyaltyTierDB;
}> = ({ customer, currentTier, nextTier }) => {
  const spentProgress = Math.min(
    (customer.total_spent / (nextTier.min_spent || 1)) * 100,
    100
  );
  const visitsProgress = Math.min(
    (customer.visit_count / (nextTier.min_visits || 1)) * 100,
    100
  );
  const pointsProgress = Math.min(
    (customer.loyalty_points / (nextTier.points_required || 1)) * 100,
    100
  );
  const overallProgress = Math.min(
    (spentProgress + visitsProgress + pointsProgress) / 3,
    100
  );

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-800 dark:text-gray-200">
          Progress to {nextTier.name}
        </h4>
        <Badge variant="outline">{Math.round(overallProgress)}%</Badge>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Spending</span>
            <span>
              <CurrencyDisplay
                amount={customer.total_spent}
                className="text-sm"
              />{" "}
              /{" "}
              <CurrencyDisplay
                amount={nextTier.min_spent || 0}
                className="text-sm"
              />
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${spentProgress}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Visits</span>
            <span>
              {customer.visit_count} / {nextTier.min_visits || 0}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${visitsProgress}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Points</span>
            <span>
              {customer.loyalty_points} / {nextTier.points_required || 0}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-pink-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${pointsProgress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Tier List Manager Component
const TierListManager: React.FC<{
  tiers: LoyaltyTierDB[];
  onEdit: (tier: LoyaltyTierDB) => void;
  onAdd: () => void;
  onDelete: (tier: LoyaltyTierDB) => void;
}> = ({ tiers, onEdit, onAdd, onDelete }) => {
  return (
    <div className="space-y-4">
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-2">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border"
            >
              <GripVertical className="h-4 w-4 text-gray-400" />
              <Badge className={cn(tier.color, "text-white")}>
                {tier.name}
              </Badge>
              <div className="flex-1 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Min Spent:</span>{" "}
                  <CurrencyDisplay
                    amount={tier.min_spent || 0}
                    className="font-medium"
                  />
                </div>
                <div>
                  <span className="text-gray-500">Min Visits:</span>{" "}
                  <span className="font-medium">{tier.min_visits || 0}</span>
                </div>
                <div>
                  <span className="text-gray-500">Multiplier:</span>{" "}
                  <span className="font-medium">
                    {tier.points_multiplier || 1}x
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => onEdit(tier)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                {tier.name !== "None" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => onDelete(tier)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <Button onClick={onAdd} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add New Tier
      </Button>
    </div>
  );
};

// Tier Editor Form Component
const TierEditorForm: React.FC<{
  tier: LoyaltyTierDB;
  onSave: (tier: Partial<LoyaltyTierDB>) => void;
  onCancel: () => void;
  isLoading: boolean;
}> = ({ tier, onSave, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    id: tier.id,
    name: tier.name,
    points_required: tier.points_required,
    min_spent: tier.min_spent || 0,
    min_visits: tier.min_visits || 0,
    points_multiplier: tier.points_multiplier || 1,
    benefits: tier.benefits || [],
    color: tier.color || "bg-gray-500",
    display_order: tier.display_order,
  });
  const [benefitsText, setBenefitsText] = useState(
    (tier.benefits || []).join("\n")
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      benefits: benefitsText.split("\n").filter((b) => b.trim()),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Tier Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Gold"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="color">Badge Color</Label>
          <Select
            value={formData.color}
            onValueChange={(value) =>
              setFormData({ ...formData, color: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEFAULT_TIER_COLORS.map((color) => (
                <SelectItem key={color.value} value={color.value}>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-4 h-4 rounded", color.value)} />
                    {color.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="min_spent">Min Spent (₹)</Label>
          <Input
            id="min_spent"
            type="number"
            value={formData.min_spent}
            onChange={(e) =>
              setFormData({
                ...formData,
                min_spent: parseFloat(e.target.value) || 0,
              })
            }
            min="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="min_visits">Min Visits</Label>
          <Input
            id="min_visits"
            type="number"
            value={formData.min_visits}
            onChange={(e) =>
              setFormData({
                ...formData,
                min_visits: parseInt(e.target.value) || 0,
              })
            }
            min="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="points_multiplier">Points Multiplier</Label>
          <Input
            id="points_multiplier"
            type="number"
            step="0.1"
            value={formData.points_multiplier}
            onChange={(e) =>
              setFormData({
                ...formData,
                points_multiplier: parseFloat(e.target.value) || 1,
              })
            }
            min="1"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="points_required">Points Required</Label>
        <Input
          id="points_required"
          type="number"
          value={formData.points_required}
          onChange={(e) =>
            setFormData({
              ...formData,
              points_required: parseInt(e.target.value) || 0,
            })
          }
          min="0"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="benefits">Benefits (one per line)</Label>
        <Textarea
          id="benefits"
          value={benefitsText}
          onChange={(e) => setBenefitsText(e.target.value)}
          placeholder="10% discount on all orders&#10;Priority reservations&#10;Free dessert on birthday"
          rows={4}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !formData.name}>
          {isLoading ? "Saving..." : tier.id ? "Update Tier" : "Create Tier"}
        </Button>
      </DialogFooter>
    </form>
  );
};

// Program Settings Form Component
const ProgramSettingsForm: React.FC<{
  program: LoyaltyProgramDB | null;
  onSave: (settings: Partial<LoyaltyProgramDB>) => void;
}> = ({ program, onSave }) => {
  const [settings, setSettings] = useState({
    is_enabled: program?.is_enabled ?? true,
    points_per_amount: program?.points_per_amount ?? 1,
    amount_per_point: program?.amount_per_point ?? 1,
    points_expiry_days: program?.points_expiry_days ?? null,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(settings);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="enabled">Enable Loyalty Program</Label>
        <Button
          type="button"
          variant={settings.is_enabled ? "default" : "outline"}
          size="sm"
          onClick={() =>
            setSettings({ ...settings, is_enabled: !settings.is_enabled })
          }
        >
          {settings.is_enabled ? "Enabled" : "Disabled"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="pointsPerAmount">Points per ₹100 Spent</Label>
          <Input
            id="pointsPerAmount"
            type="number"
            value={settings.points_per_amount}
            onChange={(e) =>
              setSettings({
                ...settings,
                points_per_amount: Number(e.target.value),
              })
            }
            min="0"
            step="0.1"
          />
          <p className="text-xs text-gray-500">
            How many points customer earns per ₹100
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amountPerPoint">₹ Value per Point</Label>
          <Input
            id="amountPerPoint"
            type="number"
            value={settings.amount_per_point}
            onChange={(e) =>
              setSettings({
                ...settings,
                amount_per_point: Number(e.target.value),
              })
            }
            min="0.01"
            step="0.01"
          />
          <p className="text-xs text-gray-500">
            Rupee value of each point for redemption
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expiryDays">Points Expiry (Days)</Label>
        <Input
          id="expiryDays"
          type="number"
          value={settings.points_expiry_days || ""}
          onChange={(e) =>
            setSettings({
              ...settings,
              points_expiry_days: e.target.value
                ? Number(e.target.value)
                : null,
            })
          }
          placeholder="Leave empty for no expiry"
          min="1"
        />
      </div>

      <Button type="submit" className="w-full">
        Save Settings
      </Button>
    </form>
  );
};

export default LoyaltyManagement;
