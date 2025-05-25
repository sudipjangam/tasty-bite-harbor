
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
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
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

  // Ensure restaurantId is available before rendering tabs that require it
  const hasRestaurantId = !!restaurantId;

  return (
    <div className="container mx-auto py-4 md:py-8 px-4 md:px-6">
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="w-full"
      >
        <div className="overflow-x-auto pb-2">
          <TabsList className="mb-6 inline-flex w-auto min-w-full md:w-auto space-x-1 p-1 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <TabsTrigger 
              value="rooms" 
              className="whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-white px-4"
            >
              Rooms
            </TabsTrigger>
            <TabsTrigger 
              value="billing" 
              className="whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-white px-4"
              disabled={!hasRestaurantId}
            >
              Billing History
            </TabsTrigger>
            <TabsTrigger 
              value="occasions" 
              className="whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-white px-4"
              disabled={!hasRestaurantId}
            >
              Special Occasions
            </TabsTrigger>
            <TabsTrigger 
              value="promotions" 
              className="whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-white px-4"
              disabled={!hasRestaurantId}
            >
              Promotions
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="rooms" className="mt-2 animate-in fade-in">
          <RoomsList 
            rooms={rooms}
            getRoomFoodOrdersTotal={getRoomFoodOrdersTotal}
            onAddRoom={addRoom}
            onEditRoom={editRoom}
            onCreateReservation={createReservation}
            onCheckoutComplete={refreshRooms}
          />
        </TabsContent>

        <TabsContent value="billing" className="mt-2 animate-in fade-in">
          {restaurantId && <BillingHistory restaurantId={restaurantId} />}
        </TabsContent>

        <TabsContent value="occasions" className="mt-2 animate-in fade-in">
          {restaurantId && <SpecialOccasions restaurantId={restaurantId} />}
        </TabsContent>

        <TabsContent value="promotions" className="mt-2 animate-in fade-in">
          {restaurantId ? (
            <PromotionsManager restaurantId={restaurantId} />
          ) : (
            <div className="flex justify-center items-center min-h-[200px]">
              <p className="text-muted-foreground">Restaurant ID not available. Please refresh the page.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Rooms;
