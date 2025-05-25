import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import PromotionItem, { PromotionStatus } from "./PromotionItem";
import { Button } from "@/components/ui/button";
import { PlusCircle, Sparkles, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  discount_percentage: number;
  discount_amount: number;
  promotion_code: string | null;
  restaurant_id: string;
  created_at: string;
  updated_at: string;
}

const PromotionalCampaigns = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  const [generatedIdeas, setGeneratedIdeas] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: new Date(),
    endDate: new Date(),
    discountPercentage: 0,
    discountAmount: 0,
    promotionCode: ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch real campaign data from Supabase
  const { data: campaignData, isLoading, refetch } = useQuery({
    queryKey: ["promotional-campaigns"],
    queryFn: async () => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error("No user found");

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", profile.user.id)
        .single();

      if (!userProfile?.restaurant_id) {
        throw new Error("No restaurant found for user");
      }

      const { data, error } = await supabase
        .from("promotion_campaigns")
        .select("*")
        .eq("restaurant_id", userProfile.restaurant_id)
        .order("start_date", { ascending: false });

      if (error) throw error;
      return data as Campaign[];
    }
  });

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (newCampaign: Omit<Campaign, 'id' | 'created_at' | 'updated_at' | 'restaurant_id'>) => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error("No user found");

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", profile.user.id)
        .single();

      if (!userProfile?.restaurant_id) {
        throw new Error("No restaurant found for user");
      }

      const { data, error } = await supabase
        .from("promotion_campaigns")
        .insert({
          ...newCampaign,
          restaurant_id: userProfile.restaurant_id,
          start_date: newCampaign.start_date,
          end_date: newCampaign.end_date
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotional-campaigns"] });
      toast({
        title: "Campaign Created",
        description: "The promotional campaign has been created successfully",
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Creation failed",
        description: error instanceof Error ? error.message : "An error occurred while creating the campaign",
        variant: "destructive",
      });
    }
  });

  // Update campaign mutation
  const updateCampaignMutation = useMutation({
    mutationFn: async (updatedCampaign: Campaign) => {
      const { error } = await supabase
        .from("promotion_campaigns")
        .update({
          name: updatedCampaign.name,
          description: updatedCampaign.description,
          start_date: updatedCampaign.start_date,
          end_date: updatedCampaign.end_date,
          discount_percentage: updatedCampaign.discount_percentage,
          discount_amount: updatedCampaign.discount_amount,
          promotion_code: updatedCampaign.promotion_code
        })
        .eq('id', updatedCampaign.id);

      if (error) throw error;
      return updatedCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotional-campaigns"] });
      toast({
        title: "Campaign Updated",
        description: "The promotional campaign has been updated successfully",
      });
      setIsEditDialogOpen(false);
      setSelectedCampaign(null);
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "An error occurred while updating the campaign",
        variant: "destructive",
      });
    }
  });

  // Delete campaign mutation
  const deleteCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from("promotion_campaigns")
        .delete()
        .eq('id', campaignId);

      if (error) throw error;
      return campaignId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotional-campaigns"] });
      toast({
        title: "Campaign Deleted",
        description: "The promotional campaign has been deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "An error occurred while deleting the campaign",
        variant: "destructive",
      });
    }
  });

  const generateCampaignIdeas = async () => {
    setIsGeneratingIdeas(true);
    setGeneratedIdeas(null);
    
    try {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error("No user found");

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", profile.user.id)
        .single();

      if (!userProfile?.restaurant_id) {
        throw new Error("No restaurant found for user");
      }

      const { data, error } = await supabase.functions.invoke('chat-with-api', {
        body: { 
          messages: [
            { 
              role: "user", 
              content: "Generate 3 creative promotional campaign ideas for my restaurant. For each, include a catchy name, description, suggested discount percentage, and ideal duration. Focus on ideas that would increase customer visits during slow periods and maximize revenue."
            }
          ],
          restaurantId: userProfile.restaurant_id
        },
      });

      if (error) throw error;
      
      if (data && data.choices && data.choices[0]?.message?.content) {
        setGeneratedIdeas(data.choices[0].message.content);
      } else {
        throw new Error("Failed to generate campaign ideas");
      }
    } catch (error) {
      console.error("Error generating campaign ideas:", error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "An error occurred during generation",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingIdeas(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      startDate: new Date(),
      endDate: new Date(),
      discountPercentage: 0,
      discountAmount: 0,
      promotionCode: ""
    });
  };

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.startDate || !formData.endDate) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }
    
    createCampaignMutation.mutate({
      name: formData.name,
      description: formData.description || null,
      start_date: formData.startDate.toISOString(),
      end_date: formData.endDate.toISOString(),
      discount_percentage: formData.discountPercentage,
      discount_amount: formData.discountAmount,
      promotion_code: formData.promotionCode || null
    });
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setFormData({
      name: campaign.name,
      description: campaign.description || "",
      startDate: new Date(campaign.start_date),
      endDate: new Date(campaign.end_date),
      discountPercentage: campaign.discount_percentage,
      discountAmount: campaign.discount_amount,
      promotionCode: campaign.promotion_code || ""
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCampaign || !formData.name || !formData.startDate || !formData.endDate) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }
    
    updateCampaignMutation.mutate({
      ...selectedCampaign,
      name: formData.name,
      description: formData.description || null,
      start_date: formData.startDate.toISOString(),
      end_date: formData.endDate.toISOString(),
      discount_percentage: formData.discountPercentage,
      discount_amount: formData.discountAmount,
      promotion_code: formData.promotionCode || null
    });
  };

  const handleDeleteCampaign = (campaignId: string) => {
    if (window.confirm("Are you sure you want to delete this campaign?")) {
      deleteCampaignMutation.mutate(campaignId);
    }
  };

  const getPromotionStatus = (campaign: Campaign): PromotionStatus => {
    const now = new Date();
    const startDate = new Date(campaign.start_date);
    const endDate = new Date(campaign.end_date);
    
    if (now < startDate) return "upcoming";
    if (now > endDate) return "completed";
    return "active";
  };

  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Promotional Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <div className="flex flex-col space-y-1.5">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-medium">Promotional Campaigns</CardTitle>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8"
                onClick={generateCampaignIdeas}
                disabled={isGeneratingIdeas}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                {isGeneratingIdeas ? "Generating..." : "AI Ideas"}
              </Button>
              <Button 
                size="sm" 
                onClick={() => setIsDialogOpen(true)}
                className="h-8"
              >
                <PlusCircle className="h-4 w-4 mr-1" />
                New Campaign
              </Button>
            </div>
          </div>
          <CardDescription>
            Manage your promotional campaigns and special offers
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {generatedIdeas && (
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 mb-4">
              <h3 className="text-sm font-semibold mb-2 text-purple-800 dark:text-purple-300 flex items-center">
                <Sparkles className="h-4 w-4 mr-1" />
                AI-Generated Campaign Ideas
              </h3>
              <div className="text-xs text-purple-700 dark:text-purple-400 whitespace-pre-line">
                {generatedIdeas}
              </div>
            </div>
          )}

          {campaignData && campaignData.length > 0 ? (
            <div className="space-y-3">
              {campaignData.map((campaign) => (
                <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <PromotionItem
                    name={campaign.name}
                    timePeriod={`${new Date(campaign.start_date).toLocaleDateString()} - ${new Date(campaign.end_date).toLocaleDateString()}`}
                    potentialIncrease={campaign.discount_percentage > 0 ? `${campaign.discount_percentage}%` : `₹${campaign.discount_amount}`}
                    status={getPromotionStatus(campaign)}
                    description={campaign.description || ""}
                  />
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditCampaign(campaign)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <p>No promotional campaigns yet.</p>
              <p className="text-sm">Create your first campaign or generate ideas with AI.</p>
            </div>
          )}
        </div>
      </CardContent>

      {/* Create Campaign Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreateCampaign}>
            <DialogHeader>
              <DialogTitle>Create Promotional Campaign</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="campaignName" className="text-right">Name</Label>
                <Input
                  id="campaignName"
                  placeholder="Summer Special"
                  className="col-span-3"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="campaignDescription" className="text-right">Description</Label>
                <Textarea
                  id="campaignDescription"
                  placeholder="Details about the promotion..."
                  className="col-span-3"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("col-span-3 justify-start text-left font-normal")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.startDate ? format(formData.startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.startDate}
                      onSelect={(date) => date && setFormData({...formData, startDate: date})}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("col-span-3 justify-start text-left font-normal")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.endDate ? format(formData.endDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.endDate}
                      onSelect={(date) => date && setFormData({...formData, endDate: date})}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="discount" className="text-right">Discount %</Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="20"
                  className="col-span-3"
                  value={formData.discountPercentage}
                  onChange={(e) => setFormData({...formData, discountPercentage: Number(e.target.value)})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="discountAmount" className="text-right">Discount Amount</Label>
                <Input
                  id="discountAmount"
                  type="number"
                  min="0"
                  placeholder="100"
                  className="col-span-3"
                  value={formData.discountAmount}
                  onChange={(e) => setFormData({...formData, discountAmount: Number(e.target.value)})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="promoCode" className="text-right">Promo Code</Label>
                <Input
                  id="promoCode"
                  placeholder="SUMMER2024"
                  className="col-span-3"
                  value={formData.promotionCode}
                  onChange={(e) => setFormData({...formData, promotionCode: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createCampaignMutation.isPending}>
                {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Campaign Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleUpdateCampaign}>
            <DialogHeader>
              <DialogTitle>Edit Promotional Campaign</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Same form fields as create dialog */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editCampaignName" className="text-right">Name</Label>
                <Input
                  id="editCampaignName"
                  placeholder="Summer Special"
                  className="col-span-3"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editCampaignDescription" className="text-right">Description</Label>
                <Textarea
                  id="editCampaignDescription"
                  placeholder="Details about the promotion..."
                  className="col-span-3"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("col-span-3 justify-start text-left font-normal")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.startDate ? format(formData.startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.startDate}
                      onSelect={(date) => date && setFormData({...formData, startDate: date})}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("col-span-3 justify-start text-left font-normal")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.endDate ? format(formData.endDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.endDate}
                      onSelect={(date) => date && setFormData({...formData, endDate: date})}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editDiscount" className="text-right">Discount %</Label>
                <Input
                  id="editDiscount"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="20"
                  className="col-span-3"
                  value={formData.discountPercentage}
                  onChange={(e) => setFormData({...formData, discountPercentage: Number(e.target.value)})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editDiscountAmount" className="text-right">Discount Amount</Label>
                <Input
                  id="editDiscountAmount"
                  type="number"
                  min="0"
                  placeholder="100"
                  className="col-span-3"
                  value={formData.discountAmount}
                  onChange={(e) => setFormData({...formData, discountAmount: Number(e.target.value)})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editPromoCode" className="text-right">Promo Code</Label>
                <Input
                  id="editPromoCode"
                  placeholder="SUMMER2024"
                  className="col-span-3"
                  value={formData.promotionCode}
                  onChange={(e) => setFormData({...formData, promotionCode: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateCampaignMutation.isPending}>
                {updateCampaignMutation.isPending ? "Updating..." : "Update Campaign"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PromotionalCampaigns;
