
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import CleaningSchedules from "@/components/Housekeeping/CleaningSchedules";
import MaintenanceRequests from "@/components/Housekeeping/MaintenanceRequests";
import AmenityManagement from "@/components/Housekeeping/AmenityManagement";
import RoomStatusDashboard from "@/components/Housekeeping/RoomStatusDashboard";
import GuestManagementDashboard from "@/components/Guests/GuestManagementDashboard";
import { Users, Home, Calendar, Wrench, Package, Sparkles } from "lucide-react";

const Housekeeping = () => {
  const [activeTab, setActiveTab] = useState("guests");
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 p-6">
      {/* Modern Header with Glass Effect */}
      <div className="mb-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-xl p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl shadow-lg">
            <Home className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
              Hotel Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg mt-2 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              Comprehensive hotel operations and guest management system
            </p>
          </div>
        </div>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="w-full"
      >
        <div className="overflow-x-auto pb-2 mb-6">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-xl p-2">
            <TabsList className="inline-flex w-auto min-w-full md:w-auto space-x-1 p-1 bg-transparent rounded-2xl">
              <TabsTrigger 
                value="guests" 
                className="whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Guest Management
              </TabsTrigger>
              <TabsTrigger 
                value="dashboard" 
                className="whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Room Status
              </TabsTrigger>
              <TabsTrigger 
                value="cleaning" 
                className="whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Cleaning Schedules
              </TabsTrigger>
              <TabsTrigger 
                value="maintenance" 
                className="whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2"
              >
                <Wrench className="h-4 w-4" />
                Maintenance
              </TabsTrigger>
              <TabsTrigger 
                value="amenities" 
                className="whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2"
              >
                <Package className="h-4 w-4" />
                Amenities
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="guests" className="mt-2 animate-in fade-in">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-xl p-8">
            <GuestManagementDashboard />
          </div>
        </TabsContent>

        <TabsContent value="dashboard" className="mt-2 animate-in fade-in">
          <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-8">
            <RoomStatusDashboard />
          </div>
        </TabsContent>

        <TabsContent value="cleaning" className="mt-2 animate-in fade-in">
          <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-8">
            <CleaningSchedules />
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="mt-2 animate-in fade-in">
          <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-8">
            <MaintenanceRequests />
          </div>
        </TabsContent>

        <TabsContent value="amenities" className="mt-2 animate-in fade-in">
          <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-8">
            <AmenityManagement />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Housekeeping;
