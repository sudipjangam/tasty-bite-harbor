
import React from "react";
import SmartInsights from "./SmartInsights";
import PromotionalCampaigns from "./PromotionalCampaigns";
import DocumentRepository from "./DocumentRepository";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const BusinessDashboard = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 gap-6">
        <Tabs defaultValue="insights" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="insights">Smart Insights</TabsTrigger>
            <TabsTrigger value="promotions">Promotional Campaigns</TabsTrigger>
            <TabsTrigger value="documents">Document Repository</TabsTrigger>
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
