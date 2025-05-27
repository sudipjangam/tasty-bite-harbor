import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Megaphone, TrendingUp, Calendar, Users, Edit, Power, PowerOff, Plus, Target, Clock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface Promotion {
  id: number;
  name: string;
  timePeriod: string;
  potentialIncrease: string;
  status: "active" | "suggested" | "paused";
  description?: string;
}

interface PromotionalCampaignsProps {
  promotions: Promotion[];
}

type PromotionStatus = "active" | "suggested" | "paused";

const PromotionalCampaigns: React.FC<PromotionalCampaignsProps> = ({ promotions: initialPromotions }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [promotions, setPromotions] = useState(initialPromotions);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    timePeriod: "",
    potentialIncrease: "",
    description: "",
    status: "suggested" as PromotionStatus,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300";
      case "suggested":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300";
      case "paused":
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Sparkles className="h-3 w-3" />;
      case "suggested":
        return <Target className="h-3 w-3" />;
      case "paused":
        return <Clock className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const handleCreatePromotion = () => {
    setEditForm({
      name: "",
      timePeriod: "",
      potentialIncrease: "",
      description: "",
      status: "suggested",
    });
    setIsCreateDialogOpen(true);
  };

  const handleEditPromotion = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setEditForm({
      name: promotion.name,
      timePeriod: promotion.timePeriod,
      potentialIncrease: promotion.potentialIncrease,
      description: promotion.description || "",
      status: promotion.status,
    });
    setIsEditDialogOpen(true);
  };

  const savePromotionToDatabase = async (promotionData: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session found");

      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", session.user.id)
        .single();

      if (!profile?.restaurant_id) throw new Error("No restaurant found");

      const campaignData = {
        name: promotionData.name,
        description: promotionData.description,
        time_period: promotionData.timePeriod,
        potential_increase: promotionData.potentialIncrease,
        status: promotionData.status,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        discount_percentage: parseInt(promotionData.potentialIncrease.replace('%', '')) || 0,
        restaurant_id: profile.restaurant_id,
        is_active: promotionData.status === 'active'
      };

      const { data, error } = await supabase
        .from("promotion_campaigns")
        .insert(campaignData)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error saving promotion:", error);
      throw error;
    }
  };

  const updatePromotionInDatabase = async (promotionId: number, promotionData: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session found");

      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", session.user.id)
        .single();

      if (!profile?.restaurant_id) throw new Error("No restaurant found");

      // Find the corresponding database record
      const { data: campaigns } = await supabase
        .from("promotion_campaigns")
        .select("*")
        .eq("restaurant_id", profile.restaurant_id)
        .order("created_at", { ascending: false });

      if (campaigns && campaigns[promotionId - 1]) {
        const campaignId = campaigns[promotionId - 1].id;
        
        const { error } = await supabase
          .from("promotion_campaigns")
          .update({
            name: promotionData.name,
            description: promotionData.description,
            time_period: promotionData.timePeriod,
            potential_increase: promotionData.potentialIncrease,
            status: promotionData.status,
            is_active: promotionData.status === 'active'
          })
          .eq("id", campaignId);

        if (error) throw error;
      }
    } catch (error) {
      console.error("Error updating promotion:", error);
      throw error;
    }
  };

  const handleSaveCreate = async () => {
    try {
      await savePromotionToDatabase(editForm);
      
      const newPromotion: Promotion = {
        id: promotions.length + 1,
        name: editForm.name,
        timePeriod: editForm.timePeriod,
        potentialIncrease: editForm.potentialIncrease,
        description: editForm.description,
        status: editForm.status,
      };

      setPromotions([...promotions, newPromotion]);
      setIsCreateDialogOpen(false);

      // Refresh business dashboard data
      queryClient.invalidateQueries({ queryKey: ["business-dashboard-data"] });

      toast({
        title: "Promotion Created",
        description: "The new promotion has been successfully created.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create promotion. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingPromotion) return;

    try {
      await updatePromotionInDatabase(editingPromotion.id, editForm);

      const updatedPromotions = promotions.map(promotion =>
        promotion.id === editingPromotion.id
          ? {
              ...promotion,
              name: editForm.name,
              timePeriod: editForm.timePeriod,
              potentialIncrease: editForm.potentialIncrease,
              description: editForm.description,
              status: editForm.status,
            }
          : promotion
      );

      setPromotions(updatedPromotions);
      setIsEditDialogOpen(false);
      setEditingPromotion(null);

      // Refresh business dashboard data
      queryClient.invalidateQueries({ queryKey: ["business-dashboard-data"] });

      toast({
        title: "Promotion Updated",
        description: "The promotion has been successfully updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update promotion. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (promotionId: number) => {
    try {
      const promotion = promotions.find(p => p.id === promotionId);
      if (!promotion) return;

      const newStatus: "active" | "paused" = promotion.status === "active" ? "paused" : "active";
      
      await updatePromotionInDatabase(promotionId, {
        ...promotion,
        status: newStatus
      });

      const updatedPromotions = promotions.map(p => {
        if (p.id === promotionId) {
          return { ...p, status: newStatus };
        }
        return p;
      });

      setPromotions(updatedPromotions);
      
      // Refresh business dashboard data
      queryClient.invalidateQueries({ queryKey: ["business-dashboard-data"] });
      
      toast({
        title: `Promotion ${newStatus === "active" ? "Activated" : "Deactivated"}`,
        description: `${promotion.name} has been ${newStatus === "active" ? "activated" : "deactivated"}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update promotion status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleActivateSuggested = async (promotionId: number) => {
    try {
      const promotion = promotions.find(p => p.id === promotionId);
      if (!promotion) return;

      await updatePromotionInDatabase(promotionId, {
        ...promotion,
        status: "active"
      });

      const updatedPromotions = promotions.map(p => {
        if (p.id === promotionId && p.status === "suggested") {
          return { ...p, status: "active" as const };
        }
        return p;
      });

      setPromotions(updatedPromotions);
      
      // Refresh business dashboard data
      queryClient.invalidateQueries({ queryKey: ["business-dashboard-data"] });
      
      toast({
        title: "Promotion Activated",
        description: `${promotion.name} has been activated successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to activate promotion. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Group promotions by status for better organization
  const activePromotions = promotions.filter(p => p.status === "active");
  const suggestedPromotions = promotions.filter(p => p.status === "suggested");
  const pausedPromotions = promotions.filter(p => p.status === "paused");

  const renderPromotionCard = (promotion: Promotion) => (
    <div key={promotion.id} className="p-4 border rounded-lg hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-800">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">{promotion.name}</h4>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Clock className="h-3 w-3" />
            <span>{promotion.timePeriod}</span>
          </div>
          {promotion.description && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{promotion.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEditPromotion(promotion)}
            className="text-xs h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Badge 
            variant="outline" 
            className={`${getStatusColor(promotion.status)} flex items-center gap-1 text-xs`}
          >
            {getStatusIcon(promotion.status)}
            {promotion.status}
          </Badge>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-sm">
          <TrendingUp className="h-3 w-3 text-green-600" />
          <span className="text-green-600 font-medium">
            +{promotion.potentialIncrease} potential increase
          </span>
        </div>
        <div className="flex gap-2">
          {promotion.status === "suggested" ? (
            <Button 
              size="sm" 
              onClick={() => handleActivateSuggested(promotion.id)}
              className="text-xs h-7 bg-blue-600 hover:bg-blue-700"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Activate
            </Button>
          ) : (
            <Button 
              size="sm" 
              variant={promotion.status === "active" ? "destructive" : "default"}
              onClick={() => handleToggleStatus(promotion.id)}
              className="text-xs h-7 flex items-center gap-1"
            >
              {promotion.status === "active" ? (
                <>
                  <PowerOff className="h-3 w-3" />
                  Pause
                </>
              ) : (
                <>
                  <Power className="h-3 w-3" />
                  Activate
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-purple-600" />
                Promotional Campaigns
              </CardTitle>
              <CardDescription>
                Marketing opportunities to boost revenue - {promotions.length} total campaigns
              </CardDescription>
            </div>
            <Button 
              onClick={handleCreatePromotion}
              size="sm" 
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Campaign
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Active Promotions */}
          {activePromotions.length > 0 && (
            <div>
              <h5 className="font-medium text-green-800 dark:text-green-300 mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Active Campaigns ({activePromotions.length})
              </h5>
              <div className="space-y-3">
                {activePromotions.map(renderPromotionCard)}
              </div>
            </div>
          )}

          {/* Suggested Promotions */}
          {suggestedPromotions.length > 0 && (
            <div>
              <h5 className="font-medium text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                AI Suggested Campaigns ({suggestedPromotions.length})
              </h5>
              <div className="space-y-3">
                {suggestedPromotions.map(renderPromotionCard)}
              </div>
            </div>
          )}

          {/* Paused Promotions */}
          {pausedPromotions.length > 0 && (
            <div>
              <h5 className="font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Paused Campaigns ({pausedPromotions.length})
              </h5>
              <div className="space-y-3">
                {pausedPromotions.map(renderPromotionCard)}
              </div>
            </div>
          )}

          {promotions.length === 0 && (
            <div className="text-center py-12">
              <Megaphone className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No campaigns yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Create your first promotional campaign to boost revenue</p>
              <Button 
                onClick={handleCreatePromotion}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Promotion Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Promotion</DialogTitle>
            <DialogDescription>
              Set up a new promotional campaign to boost your restaurant's revenue.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="create-name">Campaign Name</Label>
              <Input
                id="create-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="e.g., Happy Hour Special"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-period">Time Period</Label>
              <Input
                id="create-period"
                value={editForm.timePeriod}
                onChange={(e) => setEditForm({ ...editForm, timePeriod: e.target.value })}
                placeholder="e.g., Weekdays 5 PM - 7 PM"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-increase">Expected Revenue Increase</Label>
              <Input
                id="create-increase"
                value={editForm.potentialIncrease}
                onChange={(e) => setEditForm({ ...editForm, potentialIncrease: e.target.value })}
                placeholder="e.g., 25%"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-status">Initial Status</Label>
              <Select value={editForm.status} onValueChange={(value: PromotionStatus) => setEditForm({ ...editForm, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="suggested">Suggested</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-description">Description (Optional)</Label>
              <Textarea
                id="create-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Describe the promotion details..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCreate} className="bg-purple-600 hover:bg-purple-700">
              Create Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Promotion Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Promotion</DialogTitle>
            <DialogDescription>
              Update the details of this promotional campaign.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Campaign Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-period">Time Period</Label>
              <Input
                id="edit-period"
                value={editForm.timePeriod}
                onChange={(e) => setEditForm({ ...editForm, timePeriod: e.target.value })}
                placeholder="e.g., Weekdays 5 PM - 7 PM"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-increase">Expected Revenue Increase</Label>
              <Input
                id="edit-increase"
                value={editForm.potentialIncrease}
                onChange={(e) => setEditForm({ ...editForm, potentialIncrease: e.target.value })}
                placeholder="e.g., 25%"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={editForm.status} onValueChange={(value: PromotionStatus) => setEditForm({ ...editForm, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="suggested">Suggested</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Add promotion details..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PromotionalCampaigns;
