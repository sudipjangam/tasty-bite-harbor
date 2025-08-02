
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StandardizedCard } from "@/components/ui/standardized-card";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Star, Gift, Plus, Settings, Users, TrendingUp } from "lucide-react";
import { useRestaurantId } from "@/hooks/useRestaurantId";

interface LoyaltyProgram {
  id: string;
  is_enabled: boolean;
  points_per_amount: number;
  amount_per_point: number;
  points_expiry_days: number;
}

interface LoyaltyTier {
  id: string;
  name: string;
  points_required: number;
  benefits: string[];
  display_order: number;
}

interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  reward_type: string;
  reward_value: number;
  points_required: number;
  is_active: boolean;
}

const LoyaltyManager = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTierDialogOpen, setIsTierDialogOpen] = useState(false);
  const [isRewardDialogOpen, setIsRewardDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurantId();

  const { data: loyaltyProgram } = useQuery({
    queryKey: ["loyalty-program", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      
      const { data, error } = await supabase
        .from("loyalty_programs")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  const { data: loyaltyTiers = [] } = useQuery({
    queryKey: ["loyalty-tiers", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from("loyalty_tiers")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("display_order");

      if (error) throw error;
      return data as LoyaltyTier[];
    },
    enabled: !!restaurantId,
  });

  const { data: loyaltyRewards = [] } = useQuery({
    queryKey: ["loyalty-rewards", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from("loyalty_rewards")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("points_required");

      if (error) throw error;
      return data as LoyaltyReward[];
    },
    enabled: !!restaurantId,
  });

  const updateProgramMutation = useMutation({
    mutationFn: async (programData: any) => {
      if (loyaltyProgram) {
        const { error } = await supabase
          .from("loyalty_programs")
          .update(programData)
          .eq("id", loyaltyProgram.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("loyalty_programs")
          .insert([{ ...programData, restaurant_id: restaurantId }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-program"] });
      toast({ title: "Loyalty program updated successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error updating program",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createTierMutation = useMutation({
    mutationFn: async (tierData: any) => {
      const { error } = await supabase
        .from("loyalty_tiers")
        .insert([{ ...tierData, restaurant_id: restaurantId }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-tiers"] });
      setIsTierDialogOpen(false);
      toast({ title: "Loyalty tier created successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error creating tier",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createRewardMutation = useMutation({
    mutationFn: async (rewardData: any) => {
      const { error } = await supabase
        .from("loyalty_rewards")
        .insert([{ ...rewardData, restaurant_id: restaurantId }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-rewards"] });
      setIsRewardDialogOpen(false);
      toast({ title: "Loyalty reward created successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error creating reward",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleProgramSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const programData = {
      is_enabled: formData.get("is_enabled") === "on",
      points_per_amount: parseFloat(formData.get("points_per_amount") as string),
      amount_per_point: parseFloat(formData.get("amount_per_point") as string),
      points_expiry_days: formData.get("points_expiry_days") ? parseInt(formData.get("points_expiry_days") as string) : null,
    };

    updateProgramMutation.mutate(programData);
  };

  const handleTierSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const tierData = {
      name: formData.get("name"),
      points_required: parseInt(formData.get("points_required") as string),
      benefits: formData.get("benefits") ? (formData.get("benefits") as string).split("\n").filter(b => b.trim()) : [],
      display_order: loyaltyTiers.length,
    };

    createTierMutation.mutate(tierData);
  };

  const handleRewardSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const rewardData = {
      name: formData.get("name"),
      description: formData.get("description"),
      reward_type: formData.get("reward_type"),
      reward_value: parseFloat(formData.get("reward_value") as string),
      points_required: parseInt(formData.get("points_required") as string),
      is_active: true,
    };

    createRewardMutation.mutate(rewardData);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Loyalty Program Management</h2>
        <div className="flex gap-2">
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <StandardizedButton variant="secondary">
                <Settings className="h-4 w-4 mr-2" />
                Program Settings
              </StandardizedButton>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Loyalty Program Settings</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleProgramSubmit} className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_enabled"
                    name="is_enabled"
                    defaultChecked={loyaltyProgram?.is_enabled}
                  />
                  <Label htmlFor="is_enabled">Enable Loyalty Program</Label>
                </div>
                <div>
                  <Label htmlFor="points_per_amount">Points per Dollar Spent</Label>
                  <Input
                    id="points_per_amount"
                    name="points_per_amount"
                    type="number"
                    step="0.1"
                    defaultValue={loyaltyProgram?.points_per_amount || 1}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="amount_per_point">Dollar Value per Point</Label>
                  <Input
                    id="amount_per_point"
                    name="amount_per_point"
                    type="number"
                    step="0.01"
                    defaultValue={loyaltyProgram?.amount_per_point || 0.01}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="points_expiry_days">Points Expiry (days, leave empty for no expiry)</Label>
                  <Input
                    id="points_expiry_days"
                    name="points_expiry_days"
                    type="number"
                    defaultValue={loyaltyProgram?.points_expiry_days || ""}
                  />
                </div>
                <StandardizedButton type="submit" className="w-full">
                  Save Settings
                </StandardizedButton>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StandardizedCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Star className="h-6 w-6 text-yellow-500" />
            <h3 className="text-lg font-semibold">Loyalty Tiers</h3>
          </div>
          <div className="space-y-3">
            {loyaltyTiers.map((tier) => (
              <div key={tier.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{tier.name}</p>
                  <p className="text-sm text-gray-600">{tier.points_required} points</p>
                </div>
              </div>
            ))}
            <Dialog open={isTierDialogOpen} onOpenChange={setIsTierDialogOpen}>
              <DialogTrigger asChild>
                <StandardizedButton variant="secondary" size="sm" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tier
                </StandardizedButton>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Loyalty Tier</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleTierSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Tier Name</Label>
                    <Input id="name" name="name" required />
                  </div>
                  <div>
                    <Label htmlFor="points_required">Points Required</Label>
                    <Input id="points_required" name="points_required" type="number" required />
                  </div>
                  <div>
                    <Label htmlFor="benefits">Benefits (one per line)</Label>
                    <Textarea id="benefits" name="benefits" placeholder="10% discount on all orders" />
                  </div>
                  <StandardizedButton type="submit" className="w-full">
                    Create Tier
                  </StandardizedButton>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </StandardizedCard>

        <StandardizedCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Gift className="h-6 w-6 text-green-500" />
            <h3 className="text-lg font-semibold">Rewards</h3>
          </div>
          <div className="space-y-3">
            {loyaltyRewards.slice(0, 3).map((reward) => (
              <div key={reward.id} className="p-3 bg-gray-50 rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{reward.name}</p>
                    <p className="text-sm text-gray-600">{reward.points_required} points</p>
                  </div>
                  <Badge variant={reward.is_active ? "default" : "secondary"}>
                    {reward.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            ))}
            <Dialog open={isRewardDialogOpen} onOpenChange={setIsRewardDialogOpen}>
              <DialogTrigger asChild>
                <StandardizedButton variant="secondary" size="sm" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Reward
                </StandardizedButton>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Loyalty Reward</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleRewardSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Reward Name</Label>
                    <Input id="name" name="name" required />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input id="description" name="description" />
                  </div>
                  <div>
                    <Label htmlFor="reward_type">Reward Type</Label>
                    <Select name="reward_type" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="discount_percentage">Percentage Discount</SelectItem>
                        <SelectItem value="discount_amount">Fixed Amount Discount</SelectItem>
                        <SelectItem value="free_item">Free Item</SelectItem>
                        <SelectItem value="points_multiplier">Points Multiplier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="reward_value">Reward Value</Label>
                    <Input id="reward_value" name="reward_value" type="number" step="0.01" required />
                  </div>
                  <div>
                    <Label htmlFor="points_required">Points Required</Label>
                    <Input id="points_required" name="points_required" type="number" required />
                  </div>
                  <StandardizedButton type="submit" className="w-full">
                    Create Reward
                  </StandardizedButton>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </StandardizedCard>

        <StandardizedCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="h-6 w-6 text-blue-500" />
            <h3 className="text-lg font-semibold">Program Stats</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Status</span>
              <Badge variant={loyaltyProgram?.is_enabled ? "default" : "secondary"}>
                {loyaltyProgram?.is_enabled ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Tiers</span>
              <span className="font-medium">{loyaltyTiers.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active Rewards</span>
              <span className="font-medium">{loyaltyRewards.filter(r => r.is_active).length}</span>
            </div>
          </div>
        </StandardizedCard>
      </div>
    </div>
  );
};

export default LoyaltyManager;
