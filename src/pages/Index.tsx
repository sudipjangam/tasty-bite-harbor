
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ModernStats from "@/components/Dashboard/ModernStats";
import TodaysReservations from "@/components/Dashboard/TodaysReservations";
import Chatbot from "@/components/Chatbot/Chatbot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Order } from "@/types/orders";

const Index = () => {
  const { data: orders = [], refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error("No user found");

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", profile.user.id)
        .single();

      if (!userProfile?.restaurant_id) {
        throw new Error("No restaurant found for user");
      }

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", userProfile.restaurant_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back to your restaurant overview</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button variant="outline">Export Report</Button>
        </div>
      </div>
      
      <ModernStats />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Restaurant Layout</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border border-dashed border-gray-300 rounded-md p-6 h-80 relative bg-gray-50">
                <div className="absolute left-4 top-4 px-4 py-2 bg-gray-200 rounded text-sm">Entrance</div>
                <div className="absolute right-4 top-4 px-4 py-2 bg-gray-200 rounded text-sm">Bar</div>
                <div className="absolute left-4 bottom-4 px-4 py-2 bg-gray-200 rounded text-sm">Kitchen</div>
                
                {/* Sample tables for visual representation */}
                <div className="absolute top-[25%] left-[25%] w-12 h-12 rounded-full bg-green-200 flex items-center justify-center">1</div>
                <div className="absolute top-[25%] left-[50%] w-12 h-12 rounded-full bg-red-200 flex items-center justify-center">2</div>
                <div className="absolute top-[25%] left-[75%] w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center">3</div>
                <div className="absolute top-[50%] left-[25%] w-12 h-12 rounded-full bg-green-200 flex items-center justify-center">4</div>
                <div className="absolute top-[50%] left-[50%] w-12 h-12 rounded-full bg-red-200 flex items-center justify-center">5</div>
                <div className="absolute top-[50%] left-[75%] w-12 h-12 rounded-full bg-green-200 flex items-center justify-center">6</div>
                <div className="absolute top-[75%] left-[25%] w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center">7</div>
                <div className="absolute top-[75%] left-[50%] w-12 h-12 rounded-full bg-yellow-200 flex items-center justify-center">8</div>
                <div className="absolute top-[75%] left-[75%] w-12 h-12 rounded-full bg-green-200 flex items-center justify-center">9</div>
                
                {/* Legend */}
                <div className="absolute right-4 bottom-4 bg-white p-2 border border-gray-200 rounded shadow-sm">
                  <div className="text-xs font-medium mb-1">Status</div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-200 rounded-full"></div>
                      <span className="text-xs">Available</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-200 rounded-full"></div>
                      <span className="text-xs">Occupied</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-200 rounded-full"></div>
                      <span className="text-xs">Reserved</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-yellow-200 rounded-full"></div>
                      <span className="text-xs">Maintenance</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <TodaysReservations />
        </div>
      </div>

      {/* Add Chatbot component */}
      <Chatbot />
    </div>
  );
};

export default Index;
