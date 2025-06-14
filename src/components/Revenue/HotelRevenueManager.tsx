
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChannelManagementDashboard from "./ChannelManagementDashboard";
import DynamicPricingEngine from "./DynamicPricingEngine";
import RevenueManagementDashboard from "./RevenueManagementDashboard";
import { TrendingUp, Zap, Globe, BarChart3 } from "lucide-react";

const HotelRevenueManager = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl shadow-lg">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Hotel Revenue Management
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Optimize pricing and channel distribution
            </p>
          </div>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="w-full"
      >
        <div className="overflow-x-auto pb-2">
          <TabsList className="mb-6 inline-flex w-auto min-w-full md:w-auto space-x-1 p-1 bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
            <TabsTrigger 
              value="dashboard" 
              className="whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg px-6 py-3 rounded-xl transition-all duration-300"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Revenue Dashboard
            </TabsTrigger>
            <TabsTrigger 
              value="channels" 
              className="whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg px-6 py-3 rounded-xl transition-all duration-300"
            >
              <Globe className="w-4 h-4 mr-2" />
              Channel Management
            </TabsTrigger>
            <TabsTrigger 
              value="pricing" 
              className="whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg px-6 py-3 rounded-xl transition-all duration-300"
            >
              <Zap className="w-4 h-4 mr-2" />
              Dynamic Pricing
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="mt-2 animate-in fade-in">
          <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200/30 dark:border-blue-700/30">
            <RevenueManagementDashboard />
          </div>
        </TabsContent>

        <TabsContent value="channels" className="mt-2 animate-in fade-in">
          <div className="bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-6 border border-emerald-200/30 dark:border-emerald-700/30">
            <ChannelManagementDashboard />
          </div>
        </TabsContent>

        <TabsContent value="pricing" className="mt-2 animate-in fade-in">
          <div className="bg-gradient-to-br from-orange-50/50 to-red-50/50 dark:from-orange-900/20 dark:to-red-900/20 rounded-2xl p-6 border border-orange-200/30 dark:border-orange-700/30">
            <DynamicPricingEngine />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HotelRevenueManager;
