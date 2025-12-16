import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BillingHistory from "@/components/Rooms/BillingHistory";
import SpecialOccasions from "@/components/Rooms/SpecialOccasions";
import PromotionsManager from "@/components/Rooms/PromotionsManager";
import RoomsList from "@/components/Rooms/RoomsList";
import { useRooms } from "@/hooks/useRooms";
import { useIsMobile } from "@/hooks/use-mobile";
import { Hotel, Calendar, Gift, Percent, Sparkles } from "lucide-react";

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 flex justify-center items-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-48 bg-white/20 backdrop-blur-xl rounded-2xl mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 bg-white/20 backdrop-blur-xl rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 flex flex-col justify-center items-center p-4">
        <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Hotel className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">{authError}</h2>
          <p className="mb-4 text-gray-600">You need to be logged in with a valid restaurant account to access this page.</p>
          <Button 
            onClick={() => window.location.href = '/auth'}
            className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // Ensure restaurantId is available before rendering tabs that require it
  const hasRestaurantId = !!restaurantId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 p-6">
      {/* Modern Header with Glass Effect */}
      <div className="mb-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-xl p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
            <Hotel className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Rooms Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg mt-2 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              Manage hotel rooms, reservations, and guest services
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
                value="rooms" 
                className="whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2"
              >
                <Hotel className="h-4 w-4" />
                Rooms
              </TabsTrigger>
              <TabsTrigger 
                value="billing" 
                className="whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2"
                disabled={!hasRestaurantId}
              >
                <Calendar className="h-4 w-4" />
                Billing History
              </TabsTrigger>
              <TabsTrigger 
                value="occasions" 
                className="whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2"
                disabled={!hasRestaurantId}
              >
                <Gift className="h-4 w-4" />
                Special Occasions
              </TabsTrigger>
              <TabsTrigger 
                value="promotions" 
                className="whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2"
                disabled={!hasRestaurantId}
              >
                <Percent className="h-4 w-4" />
                Promotions
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="rooms" className="mt-2 animate-in fade-in">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-xl p-8">
            <RoomsList 
              rooms={rooms}
              getRoomFoodOrdersTotal={getRoomFoodOrdersTotal}
              onAddRoom={addRoom}
              onEditRoom={editRoom}
              onCreateReservation={createReservation}
              onCheckoutComplete={refreshRooms}
            />
          </div>
        </TabsContent>

        <TabsContent value="billing" className="mt-2 animate-in fade-in">
          <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-8">
            {restaurantId && <BillingHistory restaurantId={restaurantId} />}
          </div>
        </TabsContent>

        <TabsContent value="occasions" className="mt-2 animate-in fade-in">
          <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-8">
            {restaurantId && <SpecialOccasions restaurantId={restaurantId} />}
          </div>
        </TabsContent>

        <TabsContent value="promotions" className="mt-2 animate-in fade-in">
          <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-8">
            {restaurantId ? (
              <PromotionsManager restaurantId={restaurantId} />
            ) : (
              <div className="flex justify-center items-center min-h-[200px]">
                <p className="text-muted-foreground">Restaurant ID not available. Please refresh the page.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Rooms;