
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StandardizedCard } from "@/components/ui/standardized-card";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { PageHeader } from "@/components/Layout/PageHeader";
import CleaningSchedules from "./CleaningSchedules";
import MaintenanceRequests from "./MaintenanceRequests";
import RoomAmenities from "./RoomAmenities";
import GuestFeedback from "./GuestFeedback";
import { Calendar, Wrench, Coffee, MessageSquare, BarChart3 } from "lucide-react";

const HousekeepingDashboard = () => {
  const [activeTab, setActiveTab] = useState("cleaning");

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Housekeeping Management"
        description="Manage room cleaning, maintenance, amenities, and guest feedback"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="cleaning" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Cleaning Schedules
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Maintenance
          </TabsTrigger>
          <TabsTrigger value="amenities" className="flex items-center gap-2">
            <Coffee className="h-4 w-4" />
            Amenities
          </TabsTrigger>
          <TabsTrigger value="feedback" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Guest Feedback
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cleaning" className="mt-6">
          <CleaningSchedules />
        </TabsContent>

        <TabsContent value="maintenance" className="mt-6">
          <MaintenanceRequests />
        </TabsContent>

        <TabsContent value="amenities" className="mt-6">
          <RoomAmenities />
        </TabsContent>

        <TabsContent value="feedback" className="mt-6">
          <GuestFeedback />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HousekeepingDashboard;
