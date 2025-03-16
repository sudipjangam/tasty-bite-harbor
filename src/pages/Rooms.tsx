
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BillingHistory from "@/components/Rooms/BillingHistory";
import SpecialOccasions from "@/components/Rooms/SpecialOccasions";
import PromotionsManager from "@/components/Rooms/PromotionsManager";
import RoomsList from "@/components/Rooms/RoomsList";
import { useRooms } from "@/hooks/useRooms";

const Rooms = () => {
  const [activeTab, setActiveTab] = useState("rooms");
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
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (authError) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <h2 className="text-2xl font-bold text-red-600 mb-4">{authError}</h2>
        <p className="mb-4">You need to be logged in with a valid restaurant account to access this page.</p>
        <Button onClick={() => window.location.href = '/auth'}>
          Go to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Tabs 
        defaultValue="rooms" 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="w-full"
      >
        <TabsList className="mb-6">
          <TabsTrigger value="rooms">Rooms</TabsTrigger>
          <TabsTrigger value="billing">Billing History</TabsTrigger>
          <TabsTrigger value="occasions">Special Occasions</TabsTrigger>
          <TabsTrigger value="promotions">Promotions</TabsTrigger>
        </TabsList>

        <TabsContent value="rooms">
          <RoomsList 
            rooms={rooms}
            getRoomFoodOrdersTotal={getRoomFoodOrdersTotal}
            onAddRoom={addRoom}
            onEditRoom={editRoom}
            onCreateReservation={createReservation}
            onCheckoutComplete={refreshRooms}
          />
        </TabsContent>

        <TabsContent value="billing">
          {restaurantId && <BillingHistory restaurantId={restaurantId} />}
        </TabsContent>

        <TabsContent value="occasions">
          {restaurantId && <SpecialOccasions restaurantId={restaurantId} />}
        </TabsContent>

        <TabsContent value="promotions">
          {restaurantId && <PromotionsManager restaurantId={restaurantId} />}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Rooms;
