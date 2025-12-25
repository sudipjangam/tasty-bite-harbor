import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import CleaningSchedules from "@/components/Housekeeping/CleaningSchedules";
import MaintenanceRequests from "@/components/Housekeeping/MaintenanceRequests";
import AmenityManagement from "@/components/Housekeeping/AmenityManagement";
import RoomStatusDashboard from "@/components/Housekeeping/RoomStatusDashboard";
import GuestManagementDashboard from "@/components/Guests/GuestManagementDashboard";
import { LostFoundList } from "@/components/LostFound";
import {
  Users,
  Home,
  Calendar,
  Wrench,
  Package,
  Sparkles,
  Building2,
  PackageSearch,
} from "lucide-react";

const Housekeeping = () => {
  const [activeTab, setActiveTab] = useState("guests");
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-emerald-100 dark:from-gray-900 dark:via-slate-900 dark:to-emerald-950">
      {/* Modern 3D Header with Vibrant Gradient */}
      <div className="sticky top-0 z-40">
        <div className="relative overflow-hidden">
          {/* 3D Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-yellow-400/20 via-transparent to-transparent"></div>

          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-white/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-emerald-400/30 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/4"></div>
          <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-cyan-400/20 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2"></div>

          {/* Content */}
          <div className="relative py-4 md:py-6 px-4 md:px-6">
            <div className="flex items-center gap-4">
              {/* 3D Icon Badge */}
              <div className="relative">
                <div className="absolute inset-0 bg-white/30 rounded-2xl blur-lg"></div>
                <div className="relative p-3 md:p-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl shadow-2xl">
                  <Building2 className="w-6 h-6 md:w-8 md:h-8 text-white drop-shadow-lg" />
                </div>
              </div>

              {/* Title */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl md:text-4xl font-bold text-white drop-shadow-lg tracking-tight">
                    Hotel Management
                  </h1>
                  <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-yellow-300 animate-pulse" />
                </div>
                <p className="text-white/80 text-sm md:text-base font-medium flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Comprehensive hotel operations and guest management
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Glow Effect */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-emerald-400 to-cyan-500"></div>
        </div>
      </div>

      {/* Content with Tabs */}
      <div className="p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto pb-2 mb-4">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 rounded-2xl shadow-xl p-2">
              <TabsList className="inline-flex w-auto min-w-full md:w-auto space-x-1 p-1 bg-transparent rounded-xl">
                <TabsTrigger
                  value="guests"
                  className="whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/30 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  👥 Guests
                </TabsTrigger>
                <TabsTrigger
                  value="dashboard"
                  className="whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/30 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  🏠 Rooms
                </TabsTrigger>
                <TabsTrigger
                  value="cleaning"
                  className="whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  🧹 Cleaning
                </TabsTrigger>
                <TabsTrigger
                  value="maintenance"
                  className="whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/30 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-2"
                >
                  <Wrench className="h-4 w-4" />
                  🔧 Maintenance
                </TabsTrigger>
                <TabsTrigger
                  value="amenities"
                  className="whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/30 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-2"
                >
                  <Package className="h-4 w-4" />☕ Amenities
                </TabsTrigger>
                <TabsTrigger
                  value="lostfound"
                  className="whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-violet-500/30 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-2"
                >
                  <PackageSearch className="h-4 w-4" />
                  📦 Lost & Found
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="guests" className="mt-2 animate-in fade-in">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl shadow-xl p-4 md:p-6">
              <GuestManagementDashboard />
            </div>
          </TabsContent>

          <TabsContent value="dashboard" className="mt-2 animate-in fade-in">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl shadow-xl p-4 md:p-6">
              <RoomStatusDashboard />
            </div>
          </TabsContent>

          <TabsContent value="cleaning" className="mt-2 animate-in fade-in">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl shadow-xl p-4 md:p-6">
              <CleaningSchedules />
            </div>
          </TabsContent>

          <TabsContent value="maintenance" className="mt-2 animate-in fade-in">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl shadow-xl p-4 md:p-6">
              <MaintenanceRequests />
            </div>
          </TabsContent>

          <TabsContent value="amenities" className="mt-2 animate-in fade-in">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl shadow-xl p-4 md:p-6">
              <AmenityManagement />
            </div>
          </TabsContent>

          <TabsContent value="lostfound" className="mt-2 animate-in fade-in">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl shadow-xl p-4 md:p-6">
              <LostFoundList />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Housekeeping;
