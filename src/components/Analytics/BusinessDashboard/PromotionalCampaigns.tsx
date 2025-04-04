
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import PromotionItem, { PromotionStatus } from "./PromotionItem";
import { Button } from "@/components/ui/button";
import { PlusCircle, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const PromotionalCampaigns = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  const [generatedIdeas, setGeneratedIdeas] = useState<string | null>(null);
  const { toast } = useToast();

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

      const restaurantId = userProfile.restaurant_id;

      // Fetch existing campaigns
      const { data, error } = await supabase
        .from("promotion_campaigns")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("start_date", { ascending: false });

      if (error) throw error;

      // Format campaigns for display
      return (data || []).map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        timePeriod: `${new Date(campaign.start_date).toLocaleDateString()} - ${new Date(campaign.end_date).toLocaleDateString()}`,
        potentialIncrease: campaign.discount_percentage ? `${campaign.discount_percentage}%` : "N/A",
        status: new Date(campaign.end_date) < new Date() ? "completed" : "active" as PromotionStatus,
        description: campaign.description || ""
      }));
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

      // Call AI function to generate campaign ideas
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

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get('campaignName') as string;
    const description = formData.get('campaignDescription') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const discount = parseInt(formData.get('discount') as string, 10);
    
    if (!name || !startDate || !endDate || isNaN(discount)) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields with valid values",
        variant: "destructive",
      });
      return;
    }
    
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
      
      // Create new campaign
      const { error } = await supabase
        .from("promotion_campaigns")
        .insert({
          name,
          description,
          start_date: startDate,
          end_date: endDate,
          discount_percentage: discount,
          discount_amount: 0, // Set actual amount if needed
          restaurant_id: userProfile.restaurant_id
        });
        
      if (error) throw error;
      
      toast({
        title: "Campaign Created",
        description: "The promotional campaign has been created successfully",
      });
      
      setIsDialogOpen(false);
      refetch(); // Refresh the campaigns list
      
    } catch (error) {
      console.error("Error creating campaign:", error);
      toast({
        title: "Creation failed",
        description: error instanceof Error ? error.message : "An error occurred while creating the campaign",
        variant: "destructive",
      });
    }
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
              {campaignData.map((campaign, index) => (
                <PromotionItem
                  key={index}
                  name={campaign.name}
                  timePeriod={campaign.timePeriod}
                  potentialIncrease={campaign.potentialIncrease}
                  status={campaign.status}
                  description={campaign.description}
                />
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreateCampaign}>
            <DialogHeader>
              <DialogTitle>Create Promotional Campaign</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="campaignName" className="text-right">
                  Name
                </Label>
                <Input
                  id="campaignName"
                  name="campaignName"
                  placeholder="Summer Special"
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="campaignDescription" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="campaignDescription"
                  name="campaignDescription"
                  placeholder="Details about the promotion..."
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="startDate" className="text-right">
                  Start Date
                </Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="endDate" className="text-right">
                  End Date
                </Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="discount" className="text-right">
                  Discount %
                </Label>
                <Input
                  id="discount"
                  name="discount"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="20"
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Create Campaign</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PromotionalCampaigns;
