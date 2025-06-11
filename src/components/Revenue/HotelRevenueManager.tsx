
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChannelManagementDashboard from "./ChannelManagementDashboard";
import DynamicPricingEngine from "./DynamicPricingEngine";
import RevenueManagementDashboard from "./RevenueManagementDashboard";
import { TrendingUp, Zap, Globe, BarChart3 } from "lucide-react";

const HotelRevenueManager = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="container mx-auto py-4 md:py-8 px-4 md:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Hotel Revenue Management</h1>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="w-full"
      >
        <div className="overflow-x-auto pb-2">
          <TabsList className="mb-6 inline-flex w-auto min-w-full md:w-auto space-x-1 p-1 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <TabsTrigger 
              value="dashboard" 
              className="whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-white px-4"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Revenue Dashboard
            </TabsTrigger>
            <TabsTrigger 
              value="channels" 
              className="whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-white px-4"
            >
              <Globe className="w-4 h-4 mr-2" />
              Channel Management
            </TabsTrigger>
            <TabsTrigger 
              value="pricing" 
              className="whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-white px-4"
            >
              <Zap className="w-4 h-4 mr-2" />
              Dynamic Pricing
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="mt-2 animate-in fade-in">
          <RevenueManagementDashboard />
        </TabsContent>

        <TabsContent value="channels" className="mt-2 animate-in fade-in">
          <ChannelManagementDashboard />
        </TabsContent>

        <TabsContent value="pricing" className="mt-2 animate-in fade-in">
          <DynamicPricingEngine />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HotelRevenueManager;
