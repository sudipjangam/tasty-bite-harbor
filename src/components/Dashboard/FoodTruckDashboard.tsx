import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useNavigate } from "react-router-dom";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag,
  TrendingUp,
  MapPin,
  Navigation,
  ExternalLink,
  Clock,
  Calendar,
  Truck,
  BarChart3,
  FileText,
  ArrowRight,
  Activity,
  Zap,
  ChefHat,
  History,
} from "lucide-react";
import { formatDistanceToNow, format, startOfDay, endOfDay } from "date-fns";
import LocationTodayWidget from "@/components/Dashboard/LocationTodayWidget";
import { DailySummaryDialog } from "@/components/QuickServe/DailySummaryDialog";

interface DaySchedule {
  location: string;
  link: string;
  startTime: string;
  endTime: string;
}

type WeeklySchedule = Record<string, DaySchedule>;

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const FoodTruckDashboard: React.FC = () => {
  const { user } = useAuth();
  const { restaurantId, restaurantName } = useRestaurantId();
  const navigate = useNavigate();
  const { symbol: currencySymbol } = useCurrencyContext();
  const [showDailySummary, setShowDailySummary] = useState(false);
  const queryClient = useQueryClient();

  // Realtime subscription for instant dashboard updates
  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase
      .channel("dashboard-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pos_transactions",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["food-truck-today-stats"],
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, queryClient]);

  // Fetch restaurant data
  const { data: restaurant } = useQuery({
    queryKey: ["food-truck-dashboard", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select(
          "name, slug, current_location, current_location_link, weekly_schedule, location_updated_at, address",
        )
        .eq("id", restaurantId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Today's stats from pos_transactions (populated at payment time)
  const today = new Date();
  const { data: todayStats } = useQuery({
    queryKey: [
      "food-truck-today-stats",
      restaurantId,
      format(today, "yyyy-MM-dd"),
    ],
    enabled: !!restaurantId,
    queryFn: async () => {
      const dayStart = startOfDay(today).toISOString();
      const dayEnd = endOfDay(today).toISOString();

      const { data: transactions, error } = await supabase
        .from("pos_transactions")
        .select("amount, status, payment_method, created_at")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd);

      if (error) throw error;

      const allTransactions = transactions || [];
      const completedTxns = allTransactions.filter(
        (t) => t.status === "completed",
      );
      const totalRevenue = completedTxns.reduce(
        (sum, t) => sum + (Number(t.amount) || 0),
        0,
      );
      const cashRevenue = completedTxns
        .filter((t) =>
          (t.payment_method || "cash").toLowerCase().includes("cash"),
        )
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const upiRevenue = completedTxns
        .filter((t) => (t.payment_method || "").toLowerCase().includes("upi"))
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      return {
        totalOrders: allTransactions.length,
        totalRevenue,
        cashRevenue,
        upiRevenue,
        avgOrderValue:
          completedTxns.length > 0 ? totalRevenue / completedTxns.length : 0,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const schedule = (restaurant?.weekly_schedule as WeeklySchedule) || {};
  const todayDay = format(today, "EEEE");
  const todaySchedule = schedule[todayDay];

  const currentHour = today.getHours();
  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 18
        ? "Good afternoon"
        : "Good evening";

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 dark:from-orange-700 dark:via-red-700 dark:to-pink-700">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        <div className="relative px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-white">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg">
                  <Truck className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-white/80">
                  Food Truck Mode
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
                {greeting}, {user?.email ? user.email.split("@")[0] : "Chef"}!
                🚚
              </h1>
              <p className="mt-1 text-white/80 text-sm sm:text-base">
                {restaurantName || "Your Food Truck"} —{" "}
                {format(today, "EEEE, dd MMM yyyy")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                <Clock className="h-5 w-5 text-white" />
                <span className="text-white font-medium text-sm">
                  {today.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                <Activity className="h-5 w-5 text-green-300" />
                <span className="text-white font-medium text-sm">Live</span>
              </div>
            </div>
          </div>
        </div>
        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" className="w-full h-auto">
            <path
              d="M0,40 C200,80 400,0 600,40 C800,80 1000,0 1200,40 C1350,80 1400,20 1440,40 L1440,80 L0,80 Z"
              className="fill-orange-50 dark:fill-gray-900"
            />
          </svg>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 -mt-2">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => navigate("/quickserve-pos")}
            className="group relative bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-4 text-white transition-all duration-300 hover:scale-105 hover:-translate-y-1 shadow-lg shadow-orange-500/30 hover:shadow-xl active:scale-95"
          >
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 rounded-2xl transition-all duration-300"></div>
            <div className="relative flex flex-col items-center text-center gap-2">
              <div className="p-2 bg-white/20 rounded-xl group-hover:bg-white/30 transition-colors">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <div className="font-semibold text-sm">QuickServe</div>
            </div>
          </button>

          <button
            onClick={() => navigate("/settings?tab=location")}
            className="group relative bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-4 text-white transition-all duration-300 hover:scale-105 hover:-translate-y-1 shadow-lg shadow-purple-500/30 hover:shadow-xl active:scale-95"
          >
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 rounded-2xl transition-all duration-300"></div>
            <div className="relative flex flex-col items-center text-center gap-2">
              <div className="p-2 bg-white/20 rounded-xl group-hover:bg-white/30 transition-colors">
                <MapPin className="h-6 w-6" />
              </div>
              <div className="font-semibold text-sm">Location</div>
            </div>
          </button>

          <button
            onClick={() => navigate("/menu")}
            className="group relative bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-4 text-white transition-all duration-300 hover:scale-105 hover:-translate-y-1 shadow-lg shadow-emerald-500/30 hover:shadow-xl active:scale-95"
          >
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 rounded-2xl transition-all duration-300"></div>
            <div className="relative flex flex-col items-center text-center gap-2">
              <div className="p-2 bg-white/20 rounded-xl group-hover:bg-white/30 transition-colors">
                <ChefHat className="h-6 w-6" />
              </div>
              <div className="font-semibold text-sm">Menu</div>
            </div>
          </button>

          <button
            onClick={() => setShowDailySummary(true)}
            className="group relative bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl p-4 text-white transition-all duration-300 hover:scale-105 hover:-translate-y-1 shadow-lg shadow-blue-500/30 hover:shadow-xl active:scale-95"
          >
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 rounded-2xl transition-all duration-300"></div>
            <div className="relative flex flex-col items-center text-center gap-2">
              <div className="p-2 bg-white/20 rounded-xl group-hover:bg-white/30 transition-colors">
                <FileText className="h-6 w-6" />
              </div>
              <div className="font-semibold text-sm">Day Report</div>
            </div>
          </button>
        </div>

        {/* Live Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-0 shadow-lg rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-md">
                  <ShoppingBag className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Today's Orders
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {todayStats?.totalOrders || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-0 shadow-lg rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-md">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Revenue
                  </p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    {currencySymbol}
                    {(todayStats?.totalRevenue || 0).toFixed(0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-0 shadow-lg rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-md">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Avg Order
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {currencySymbol}
                    {(todayStats?.avgOrderValue || 0).toFixed(0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-0 shadow-lg rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl shadow-md">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Cash / UPI
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {currencySymbol}
                    {(todayStats?.cashRevenue || 0).toFixed(0)}
                    <span className="text-sm text-gray-400 mx-1">/</span>
                    {currencySymbol}
                    {(todayStats?.upiRevenue || 0).toFixed(0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid: Location + Schedule */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Location Today */}
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-0 shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-orange-500/10 to-red-500/10 dark:from-orange-500/20 dark:to-red-500/20 border-b border-gray-100 dark:border-gray-700">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg shadow-orange-500/30">
                  <Navigation className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  Your Location Today
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <LocationTodayWidget />
            </CardContent>
          </Card>

          {/* Weekly Schedule Overview */}
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-0 shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 border-b border-gray-100 dark:border-gray-700">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg shadow-purple-500/30">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  This Week
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-2">
                {DAYS.map((day) => {
                  const dayData = schedule[day];
                  const isToday = day === todayDay;
                  return (
                    <div
                      key={day}
                      className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                        isToday
                          ? "bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-2 border-orange-300 dark:border-orange-700"
                          : "bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            isToday
                              ? "bg-gradient-to-r from-orange-500 to-red-500 text-white"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {day.charAt(0)}
                        </span>
                        <div>
                          <p
                            className={`text-sm font-semibold ${
                              isToday
                                ? "text-orange-700 dark:text-orange-400"
                                : "text-gray-600 dark:text-gray-400"
                            }`}
                          >
                            {day.slice(0, 3)}
                            {isToday && (
                              <span className="ml-1.5 text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full">
                                TODAY
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {dayData && dayData.location ? (
                          <>
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[140px]">
                              {dayData.location}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {dayData.startTime} – {dayData.endTime}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-gray-400 italic">
                            Not set
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Share & Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Share truck page */}
          {restaurant?.slug && (
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-0 shadow-lg rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-md">
                    <Truck className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">
                      Public Truck Page
                    </p>
                    <p className="text-xs text-gray-500">
                      Share with your customers
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-xl px-3 py-2 text-sm text-gray-600 dark:text-gray-300 truncate">
                    /truck/{restaurant.slug}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => {
                      const url = `${window.location.origin}/truck/${restaurant.slug}`;
                      navigator.clipboard.writeText(url);
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick links */}
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-0 shadow-lg rounded-2xl">
            <CardContent className="p-4 space-y-2">
              <p className="font-bold text-gray-900 dark:text-white text-sm mb-3">
                Quick Links
              </p>
              <button
                onClick={() => navigate("/daily-summary-history")}
                className="w-full flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-orange-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                    Daily Reports History
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </button>
              <button
                onClick={() => navigate("/menu")}
                className="w-full flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                  Manage Menu
                </span>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </button>
              <button
                onClick={() => navigate("/orders")}
                className="w-full flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                  Order History
                </span>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </button>
              <button
                onClick={() => navigate("/customers")}
                className="w-full flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                  Customers (CRM)
                </span>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Daily Summary Dialog */}
      <DailySummaryDialog
        isOpen={showDailySummary}
        onClose={() => setShowDailySummary(false)}
      />
    </div>
  );
};

export default FoodTruckDashboard;
