
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BillingHistory from "@/components/Rooms/BillingHistory";
import SpecialOccasions from "@/components/Rooms/SpecialOccasions";
import PromotionsManager from "@/components/Rooms/PromotionsManager";
import RoomsList from "@/components/Rooms/RoomsList";
import { useRooms } from "@/hooks/useRooms";
import { useIsMobile } from "@/hooks/use-mobile";

const Rooms = () => {
  const [activeTab, setActiveTab] = useState("rooms");
  const isMobile = useIsMobile();
  const {
    rooms,
    loading,
    restaurantId,
    authError,
    addRoom,
    editRoom,
    createReservation,
    getRoomFoodOrdersTotal,
    refreshRooms
  } = useRooms();

  if (loading) {
    return <div className="flex justify-center items-center min-h-[50vh]">Loading...</div>;
  }

  if (authError) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[50vh] p-4">
        <h2 className="text-2xl font-bold text-red-600 mb-4">{authError}</h2>
        <p className="mb-4 text-center">You need to be logged in with a valid restaurant account to access this page.</p>
        <Button onClick={() => window.location.href = '/auth'}>
          Go to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 md:py-8 px-4 md:px-6">
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="w-full"
      >
        <div className="overflow-x-auto pb-2">
          <TabsList className="mb-6 inline-flex w-auto min-w-full md:w-auto space-x-1 p-1">
            <TabsTrigger value="rooms" className="whitespace-nowrap">Rooms</TabsTrigger>
            <TabsTrigger value="billing" className="whitespace-nowrap">Billing History</TabsTrigger>
            <TabsTrigger value="occasions" className="whitespace-nowrap">Special Occasions</TabsTrigger>
            <TabsTrigger value="promotions" className="whitespace-nowrap">Promotions</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="rooms" className="mt-2">
          <RoomsList 
            rooms={rooms}
            getRoomFoodOrdersTotal={getRoomFoodOrdersTotal}
            onAddRoom={addRoom}
            onEditRoom={editRoom}
            onCreateReservation={createReservation}
            onCheckoutComplete={refreshRooms}
          />
        </TabsContent>

        <TabsContent value="billing" className="mt-2">
          {restaurantId && <BillingHistory restaurantId={restaurantId} />}
        </TabsContent>

        <TabsContent value="occasions" className="mt-2">
          {restaurantId && <SpecialOccasions restaurantId={restaurantId} />}
        </TabsContent>

        <TabsContent value="promotions" className="mt-2">
          {restaurantId && <PromotionsManager restaurantId={restaurantId} />}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Rooms;
