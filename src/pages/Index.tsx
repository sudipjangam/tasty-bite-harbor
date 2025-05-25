
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subDays, startOfWeek, startOfMonth } from "date-fns";
import Stats from "@/components/Dashboard/Stats";
import OrderList from "@/components/Orders/OrderList";
import WeeklySalesChart from "@/components/Dashboard/WeeklySalesChart";
import QuickStats from "@/components/Dashboard/QuickStats";
import Chatbot from "@/components/Chatbot/Chatbot";
import PredictiveAnalytics from "@/components/Dashboard/PredictiveAnalytics";
import DashboardHeader from "@/components/Dashboard/DashboardHeader";
import { useToast } from "@/hooks/use-toast";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import type { Order } from "@/types/orders";
import { Card } from "@/components/ui/card";

const Index = () => {
  const [timeRange, setTimeRange] = useState<string>("today");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const { restaurantId, isLoading: loadingRestaurantId } = useRestaurantId();
  
  // Calculate date range based on selected time range
  const getDateRange = () => {
    const today = new Date();
    
    switch (timeRange) {
      case "week":
        return {
          start: startOfWeek(today),
          end: endOfDay(today)
        };
      case "month":
        return {
          start: startOfMonth(today),
          end: endOfDay(today)
        };
      case "today":
      default:
        return {
          start: startOfDay(today),
          end: endOfDay(today)
        };
    }
  };
  
  const dateRange = getDateRange();
  
  const { data: orders = [], refetch, isLoading: loadingOrders } = useQuery({
    queryKey: ["orders", restaurantId, dateRange.start, dateRange.end],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!restaurantId,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: "Dashboard refreshed",
        description: `Data updated for ${timeRange === "today" ? "today" : timeRange === "week" ? "this week" : "this month"}.`,
      });
    } catch (error) {
      toast({
        title: "Error refreshing data",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Automatically refresh when time range changes
  useEffect(() => {
    refetch();
  }, [timeRange, refetch]);

  return (
    <div className="space-y-6 animate-fade-in px-4 md:px-6 max-w-full overflow-hidden">
      <DashboardHeader
        onRefresh={handleRefresh}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        isRefreshing={isRefreshing}
      />
      
      <div className="rounded-xl bg-gradient-to-br from-card/50 to-background/50 backdrop-blur-xl border border-primary/10 p-4 md:p-6">
        <QuickStats timeRange={timeRange} />
      </div>
      
      {/* AI-Powered Predictive Analytics */}
      <PredictiveAnalytics />
      
      <div className="rounded-xl bg-gradient-to-br from-card/50 to-background/50 backdrop-blur-xl border border-primary/10 p-4 md:p-6">
        <h2 className="text-xl font-semibold mb-4">Weekly Sales Overview</h2>
        <WeeklySalesChart />
      </div>
      
      <div className="rounded-xl bg-gradient-to-br from-card/50 to-background/50 backdrop-blur-xl border border-primary/10 p-4 md:p-6">
        <h2 className="text-xl font-semibold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Stats Overview
        </h2>
        <Stats />
      </div>
      
      <div className="rounded-xl bg-gradient-to-br from-card/50 to-background/50 backdrop-blur-xl border border-primary/10 p-4 md:p-6">
        <h2 className="text-xl font-semibold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Recent Orders {orders.length > 0 ? `(${orders.length})` : ""}
        </h2>
        <div className="overflow-x-auto">
          {loadingOrders ? (
            <Card className="p-8 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-muted-foreground">Loading orders...</p>
              </div>
            </Card>
          ) : orders.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No orders found for the selected time range.</p>
            </Card>
          ) : (
            <OrderList orders={orders} onOrdersChange={refetch} />
          )}
        </div>
      </div>

      <Chatbot />
    </div>
  );
};

export default Index;
