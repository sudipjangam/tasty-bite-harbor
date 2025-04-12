
import React, { useState } from "react";
import SmartInsights from "./SmartInsights";
import PromotionalCampaigns from "./PromotionalCampaigns";
import DocumentRepository from "./DocumentRepository";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const BusinessDashboard = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("insights");
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ["business-dashboard-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["business-dashboard-profile"] }),
      queryClient.invalidateQueries({ queryKey: ["smart-insights-data"] }),
      queryClient.invalidateQueries({ queryKey: ["promotional-campaigns"] }),
      queryClient.invalidateQueries({ queryKey: ["document-repository-restaurant-id"] }),
    ]);
    
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  if (profileLoading) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (profileError) {
    return (
      <Alert variant="destructive" className="my-4 mx-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load dashboard data. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  if (!profile?.restaurant_id) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[300px]">
        <h3 className="text-xl font-semibold mb-2">Restaurant Profile Not Found</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Please complete your restaurant profile setup to access the business dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-semibold">Business Intelligence Dashboard</h2>
        <Button 
          variant="outline"
          size="sm"
          onClick={refreshData}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`${isMobile ? 'flex flex-wrap gap-1' : 'grid grid-cols-3'} w-full mb-4`}>
            <TabsTrigger value="insights" className="whitespace-nowrap">Smart Insights</TabsTrigger>
            <TabsTrigger value="promotions" className="whitespace-nowrap">Promotional Campaigns</TabsTrigger>
            <TabsTrigger value="documents" className="whitespace-nowrap">Document Repository</TabsTrigger>
          </TabsList>
          <TabsContent value="insights" className="space-y-4">
            <SmartInsights />
          </TabsContent>
          <TabsContent value="promotions" className="space-y-4">
            <PromotionalCampaigns />
          </TabsContent>
          <TabsContent value="documents" className="space-y-4">
            <DocumentRepository />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BusinessDashboard;
