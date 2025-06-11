
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import CleaningSchedules from "@/components/Housekeeping/CleaningSchedules";
import MaintenanceRequests from "@/components/Housekeeping/MaintenanceRequests";
import AmenityManagement from "@/components/Housekeeping/AmenityManagement";
import RoomStatusDashboard from "@/components/Housekeeping/RoomStatusDashboard";
import GuestManagementDashboard from "@/components/Guests/GuestManagementDashboard";

const Housekeeping = () => {
  const [activeTab, setActiveTab] = useState("guests");
  const isMobile = useIsMobile();

  return (
    <div className="container mx-auto py-4 md:py-8 px-4 md:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Hotel Management</h1>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="w-full"
      >
        <div className="overflow-x-auto pb-2">
          <TabsList className="mb-6 inline-flex w-auto min-w-full md:w-auto space-x-1 p-1 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <TabsTrigger 
              value="guests" 
              className="whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-white px-4"
            >
              Guest Management
            </TabsTrigger>
            <TabsTrigger 
              value="dashboard" 
              className="whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-white px-4"
            >
              Room Status
            </TabsTrigger>
            <TabsTrigger 
              value="cleaning" 
              className="whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-white px-4"
            >
              Cleaning Schedules
            </TabsTrigger>
            <TabsTrigger 
              value="maintenance" 
              className="whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-white px-4"
            >
              Maintenance
            </TabsTrigger>
            <TabsTrigger 
              value="amenities" 
              className="whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-white px-4"
            >
              Amenities
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="guests" className="mt-2 animate-in fade-in">
          <GuestManagementDashboard />
        </TabsContent>

        <TabsContent value="dashboard" className="mt-2 animate-in fade-in">
          <RoomStatusDashboard />
        </TabsContent>

        <TabsContent value="cleaning" className="mt-2 animate-in fade-in">
          <CleaningSchedules />
        </TabsContent>

        <TabsContent value="maintenance" className="mt-2 animate-in fade-in">
          <MaintenanceRequests />
        </TabsContent>

        <TabsContent value="amenities" className="mt-2 animate-in fade-in">
          <AmenityManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Housekeeping;
