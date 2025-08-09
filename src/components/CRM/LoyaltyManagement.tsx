import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { Customer, CustomerLoyaltyTier } from "@/types/customer";
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
  Trophy
} from "lucide-react";

interface LoyaltyTier {
  id: string;
  name: CustomerLoyaltyTier;
  minSpent: number;
  minVisits: number;
  pointsMultiplier: number;
  benefits: string[];
  color: string;
}

interface LoyaltyProgram {
  id: string;
  restaurant_id: string;
  is_enabled: boolean;
  points_per_amount: number;
  amount_per_point: number;
  points_expiry_days?: number;
}

interface LoyaltyManagementProps {
  customer: Customer;
  onUpdateCustomer: (updates: Partial<Customer>) => void;
}

const defaultTiers: LoyaltyTier[] = [
  {
    id: "none",
    name: "None",
    minSpent: 0,
    minVisits: 0,
    pointsMultiplier: 1,
    benefits: ["Basic service"],
    color: "bg-gray-500"
  },
  {
    id: "bronze",
    name: "Bronze",
    minSpent: 10000,
    minVisits: 5,
    pointsMultiplier: 1,
    benefits: ["5% discount on special occasions"],
    color: "bg-amber-600"
  },
  {
    id: "silver",
    name: "Silver",
    minSpent: 50000,
    minVisits: 15,
    pointsMultiplier: 1.2,
    benefits: ["10% discount", "Priority reservations"],
    color: "bg-gray-400"
  },
  {
    id: "gold",
    name: "Gold",
    minSpent: 100000,
    minVisits: 30,
    pointsMultiplier: 1.5,
    benefits: ["15% discount", "Priority reservations", "Free appetizer"],
    color: "bg-yellow-500"
  },
  {
    id: "platinum",
    name: "Platinum",
    minSpent: 250000,
    minVisits: 50,
    pointsMultiplier: 2,
    benefits: ["20% discount", "VIP seating", "Free dessert", "Birthday special"],
    color: "bg-gray-500"
  },
  {
    id: "diamond",
    name: "Diamond",
    minSpent: 500000,
    minVisits: 100,
    pointsMultiplier: 2.5,
    benefits: ["25% discount", "VIP treatment", "Exclusive events", "Personal service"],
    color: "bg-purple-600"
  }
];

const LoyaltyManagement: React.FC<LoyaltyManagementProps> = ({
  customer,
  onUpdateCustomer,
}) => {
  const { toast } = useToast();
  const { restaurantId } = useRestaurantId();
  const [loyaltyProgram, setLoyaltyProgram] = useState<LoyaltyProgram | null>(null);
  const [tiers, setTiers] = useState<LoyaltyTier[]>(defaultTiers);
  const [isEditingPoints, setIsEditingPoints] = useState(false);
  const [isEditingTier, setIsEditingTier] = useState(false);
  const [newPoints, setNewPoints] = useState(customer.loyalty_points.toString());
  const [newTier, setNewTier] = useState<CustomerLoyaltyTier>(customer.loyalty_tier);
  const [showProgramSettings, setShowProgramSettings] = useState(false);

  useEffect(() => {
    fetchLoyaltyProgram();
  }, [restaurantId]);

  const fetchLoyaltyProgram = async () => {
    if (!restaurantId) return;

    try {
      const { data, error } = await supabase
        .from("loyalty_programs")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching loyalty program:", error);
        return;
      }

      if (data) {
        setLoyaltyProgram(data);
      }
    } catch (error) {
      console.error("Error fetching loyalty program:", error);
    }
  };

  const updateLoyaltyPoints = async () => {
    const points = parseInt(newPoints);
    if (isNaN(points) || points < 0) {
      toast({
        title: "Invalid Points",
        description: "Please enter a valid number of points.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("customers")
        .update({ 
          loyalty_points: points,
          loyalty_points_last_updated: new Date().toISOString()
        })
        .eq("id", customer.id);

      if (error) throw error;

      onUpdateCustomer({ loyalty_points: points });
      setIsEditingPoints(false);
      
      toast({
        title: "Points Updated",
        description: `Loyalty points updated to ${points}.`,
      });
    } catch (error) {
      console.error("Error updating loyalty points:", error);
      toast({
        title: "Error",
        description: "Failed to update loyalty points.",
        variant: "destructive",
      });
    }
  };

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
    } catch (error) {
      console.error("Error updating loyalty tier:", error);
      toast({
        title: "Error",
        description: "Failed to update loyalty tier.",
        variant: "destructive",
      });
    }
  };

  const createOrUpdateLoyaltyProgram = async (programData: Partial<LoyaltyProgram>) => {
    if (!restaurantId) return;

    try {
      if (loyaltyProgram) {
        const { error } = await supabase
          .from("loyalty_programs")
          .update(programData)
          .eq("id", loyaltyProgram.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("loyalty_programs")
          .insert({
            restaurant_id: restaurantId,
            ...programData,
          });

        if (error) throw error;
      }

      await fetchLoyaltyProgram();
      setShowProgramSettings(false);
      
      toast({
        title: "Program Updated",
        description: "Loyalty program settings have been saved.",
      });
    } catch (error) {
      console.error("Error updating loyalty program:", error);
      toast({
        title: "Error",
        description: "Failed to update loyalty program.",
        variant: "destructive",
      });
    }
  };

  const getTierIcon = (tier: CustomerLoyaltyTier) => {
    switch (tier) {
      case "Diamond": return <Crown className="h-4 w-4" />;
      case "Platinum": return <Star className="h-4 w-4" />;
      case "Gold": return <Award className="h-4 w-4" />;
      case "Silver": return <Trophy className="h-4 w-4" />;
      case "Bronze": return <Trophy className="h-4 w-4" />;
      default: return <Star className="h-4 w-4" />;
    }
  };

  const getCurrentTierData = () => tiers.find(t => t.name === customer.loyalty_tier) || tiers[0];
  const currentTier = getCurrentTierData();

  return (
    <div className="space-y-6">
      {/* Loyalty Status Card */}
      <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <Gift className="h-5 w-5" />
              Loyalty Status
            </CardTitle>
            <Dialog open={showProgramSettings} onOpenChange={setShowProgramSettings}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Program Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Loyalty Program Settings</DialogTitle>
                </DialogHeader>
                <LoyaltyProgramSettings 
                  program={loyaltyProgram}
                  onSave={createOrUpdateLoyaltyProgram}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Points Management */}
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
            <div>
              <p className="text-sm font-medium text-gray-600">Loyalty Points</p>
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
                    <Button size="sm" onClick={updateLoyaltyPoints}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditingPoints(false)}>Cancel</Button>
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-purple-600">{customer.loyalty_points.toLocaleString()}</p>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditingPoints(true)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Points Value</p>
              <CurrencyDisplay 
                amount={customer.loyalty_points * (loyaltyProgram?.amount_per_point || 100)} 
                className="text-lg font-semibold text-green-600"
              />
            </div>
          </div>

          {/* Tier Management */}
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
            <div>
              <p className="text-sm font-medium text-gray-600">Loyalty Tier</p>
              <div className="flex items-center gap-2 mt-1">
                {isEditingTier ? (
                  <div className="flex items-center gap-2">
                    <Select value={newTier} onValueChange={(value: CustomerLoyaltyTier) => setNewTier(value)}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tiers.map((tier) => (
                          <SelectItem key={tier.id} value={tier.name}>
                            <div className="flex items-center gap-2">
                              {getTierIcon(tier.name)}
                              {tier.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={updateLoyaltyTier}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditingTier(false)}>Cancel</Button>
                  </div>
                ) : (
                  <>
                    <Badge className={`${currentTier.color} text-white`}>
                      {getTierIcon(customer.loyalty_tier)}
                      <span className="ml-1">{customer.loyalty_tier}</span>
                    </Badge>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditingTier(true)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Points Multiplier</p>
              <p className="text-lg font-semibold text-purple-600">{currentTier.pointsMultiplier}x</p>
            </div>
          </div>

          {/* Tier Benefits */}
          <div className="p-4 bg-white rounded-lg border">
            <h4 className="font-medium text-gray-800 mb-2">Current Tier Benefits</h4>
            <ul className="space-y-1">
              {currentTier.benefits.map((benefit, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                  <Star className="h-3 w-3 text-yellow-500" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          {/* Progress to Next Tier */}
          <TierProgress customer={customer} tiers={tiers} />
        </CardContent>
      </Card>
    </div>
  );
};

const TierProgress: React.FC<{ customer: Customer; tiers: LoyaltyTier[] }> = ({ customer, tiers }) => {
  const currentTierIndex = tiers.findIndex(t => t.name === customer.loyalty_tier);
  const nextTier = currentTierIndex < tiers.length - 1 ? tiers[currentTierIndex + 1] : null;

  if (!nextTier) {
    return (
      <div className="p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-purple-600" />
          <p className="font-medium text-purple-800">Maximum tier reached!</p>
        </div>
      </div>
    );
  }

  const spentProgress = Math.min((customer.total_spent / nextTier.minSpent) * 100, 100);
  const visitsProgress = Math.min((customer.visit_count / nextTier.minVisits) * 100, 100);
  const overallProgress = Math.min((spentProgress + visitsProgress) / 2, 100);

  return (
    <div className="p-4 bg-white rounded-lg border">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-800">Progress to {nextTier.name}</h4>
        <Badge variant="outline" className={nextTier.color.replace('bg-', 'border-').replace('bg-', 'text-')}>
          {Math.round(overallProgress)}%
        </Badge>
      </div>
      
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Spending Progress</span>
            <span>
              <CurrencyDisplay amount={customer.total_spent} className="text-sm" /> / <CurrencyDisplay amount={nextTier.minSpent} className="text-sm" />
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${spentProgress}%` }}
            />
          </div>
        </div>
        
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Visits Progress</span>
            <span>{customer.visit_count} / {nextTier.minVisits}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${visitsProgress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const LoyaltyProgramSettings: React.FC<{
  program: LoyaltyProgram | null;
  onSave: (data: Partial<LoyaltyProgram>) => void;
}> = ({ program, onSave }) => {
  const [settings, setSettings] = useState({
    is_enabled: program?.is_enabled || false,
    points_per_amount: program?.points_per_amount || 1,
    amount_per_point: program?.amount_per_point || 100,
    points_expiry_days: program?.points_expiry_days || null,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="enabled">Enable Loyalty Program</Label>
        <Button
          variant={settings.is_enabled ? "default" : "outline"}
          size="sm"
          onClick={() => setSettings({ ...settings, is_enabled: !settings.is_enabled })}
        >
          {settings.is_enabled ? "Enabled" : "Disabled"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="pointsPerAmount">Points per Amount Spent</Label>
          <Input
            id="pointsPerAmount"
            type="number"
            value={settings.points_per_amount}
            onChange={(e) => setSettings({ ...settings, points_per_amount: Number(e.target.value) })}
            min="0"
            step="0.1"
          />
          <p className="text-xs text-gray-500">How many points per currency unit spent</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amountPerPoint">Currency per Point</Label>
          <Input
            id="amountPerPoint"
            type="number"
            value={settings.amount_per_point}
            onChange={(e) => setSettings({ ...settings, amount_per_point: Number(e.target.value) })}
            min="1"
          />
          <p className="text-xs text-gray-500">Currency value of each point</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expiryDays">Points Expiry (Days)</Label>
        <Input
          id="expiryDays"
          type="number"
          value={settings.points_expiry_days || ""}
          onChange={(e) => setSettings({ ...settings, points_expiry_days: e.target.value ? Number(e.target.value) : null })}
          placeholder="Leave empty for no expiry"
          min="1"
        />
      </div>

      <Button onClick={() => onSave(settings)} className="w-full">
        Save Program Settings
      </Button>
    </div>
  );
};

export default LoyaltyManagement;