import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Megaphone, TrendingUp, Calendar, Users, Edit, Power, PowerOff } from "lucide-react";

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

const PromotionalCampaigns: React.FC<PromotionalCampaignsProps> = ({ promotions: initialPromotions }) => {
  const { toast } = useToast();
  const [promotions, setPromotions] = useState(initialPromotions);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    timePeriod: "",
    potentialIncrease: "",
    description: "",
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "suggested":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "paused":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Users className="h-3 w-3" />;
      case "suggested":
        return <TrendingUp className="h-3 w-3" />;
      case "paused":
        return <Calendar className="h-3 w-3" />;
      default:
        return <Calendar className="h-3 w-3" />;
    }
  };

  const handleEditPromotion = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setEditForm({
      name: promotion.name,
      timePeriod: promotion.timePeriod,
      potentialIncrease: promotion.potentialIncrease,
      description: promotion.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingPromotion) return;

    const updatedPromotions = promotions.map(promotion =>
      promotion.id === editingPromotion.id
        ? {
            ...promotion,
            name: editForm.name,
            timePeriod: editForm.timePeriod,
            potentialIncrease: editForm.potentialIncrease,
            description: editForm.description,
          }
        : promotion
    );

    setPromotions(updatedPromotions);
    setIsEditDialogOpen(false);
    setEditingPromotion(null);

    toast({
      title: "Promotion Updated",
      description: "The promotion has been successfully updated.",
    });
  };

  const handleToggleStatus = (promotionId: number) => {
    const updatedPromotions = promotions.map(promotion => {
      if (promotion.id === promotionId) {
        const newStatus: "active" | "paused" = promotion.status === "active" ? "paused" : "active";
        return { ...promotion, status: newStatus };
      }
      return promotion;
    });

    setPromotions(updatedPromotions);
    
    const promotion = promotions.find(p => p.id === promotionId);
    const newStatus = promotion?.status === "active" ? "paused" : "active";
    
    toast({
      title: `Promotion ${newStatus === "active" ? "Activated" : "Deactivated"}`,
      description: `${promotion?.name} has been ${newStatus === "active" ? "activated" : "deactivated"}.`,
    });
  };

  const handleActivateSuggested = (promotionId: number) => {
    const updatedPromotions = promotions.map(promotion => {
      if (promotion.id === promotionId && promotion.status === "suggested") {
        return { ...promotion, status: "active" as const };
      }
      return promotion;
    });

    setPromotions(updatedPromotions);
    
    const promotion = promotions.find(p => p.id === promotionId);
    toast({
      title: "Promotion Activated",
      description: `${promotion?.name} has been activated successfully.`,
    });
  };

  return (
    <>
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-purple-600" />
            Promotional Campaigns
          </CardTitle>
          <CardDescription>
            Marketing opportunities to boost revenue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {promotions.map((promotion) => (
            <div key={promotion.id} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{promotion.name}</h4>
                  <p className="text-sm text-gray-500">{promotion.timePeriod}</p>
                  {promotion.description && (
                    <p className="text-xs text-gray-400 mt-1">{promotion.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEditPromotion(promotion)}
                    className="text-xs h-8 w-8 p-0"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Badge 
                    variant="outline" 
                    className={`${getStatusColor(promotion.status)} flex items-center gap-1`}
                  >
                    {getStatusIcon(promotion.status)}
                    {promotion.status}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-600 font-medium">
                  +{promotion.potentialIncrease} potential increase
                </span>
                <div className="flex gap-2">
                  {promotion.status === "suggested" ? (
                    <Button 
                      size="sm" 
                      onClick={() => handleActivateSuggested(promotion.id)}
                      className="text-xs"
                    >
                      Activate
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      variant={promotion.status === "active" ? "destructive" : "default"}
                      onClick={() => handleToggleStatus(promotion.id)}
                      className="text-xs flex items-center gap-1"
                    >
                      {promotion.status === "active" ? (
                        <>
                          <PowerOff className="h-3 w-3" />
                          Deactivate
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
          ))}
        </CardContent>
      </Card>

      {/* Edit Promotion Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Promotion</DialogTitle>
            <DialogDescription>
              Update the details of this promotional campaign.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Promotion Name</Label>
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
                placeholder="e.g., 5 PM - 7 PM"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-increase">Potential Increase</Label>
              <Input
                id="edit-increase"
                value={editForm.potentialIncrease}
                onChange={(e) => setEditForm({ ...editForm, potentialIncrease: e.target.value })}
                placeholder="e.g., 25%"
              />
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
