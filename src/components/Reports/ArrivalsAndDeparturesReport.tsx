import React, { useState, useEffect } from "react";
import { format, startOfDay, endOfDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import {
  LogIn,
  LogOut,
  Calendar as CalendarIcon,
  Users,
  Crown,
  Phone,
  Mail,
  Bed,
  Clock,
  Loader2,
  Printer,
  FileDown,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Arrival {
  id: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string | null;
  room_name: string;
  room_id: string;
  check_in_date: string;
  check_out_date: string;
  guests_count: number;
  status: string;
  is_vip?: boolean;
  special_requests?: string;
}

interface Departure {
  id: string;
  guest_name: string;
  guest_phone: string;
  room_name: string;
  room_id: string;
  checkout_date: string;
  nights_stayed: number;
  total_charges: number;
  status: string;
  is_vip?: boolean;
}

const ArrivalsAndDeparturesReport: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState("arrivals");
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const { symbol: currencySymbol } = useCurrencyContext();

  // Fetch restaurant ID
  useEffect(() => {
    const fetchRestaurantId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", user.id)
        .single();

      if (profile?.restaurant_id) {
        setRestaurantId(profile.restaurant_id);
      }
    };
    fetchRestaurantId();
  }, []);

  // Fetch arrivals (reservations for selected date)
  const {
    data: arrivals = [],
    isLoading: arrivalsLoading,
    refetch: refetchArrivals,
  } = useQuery({
    queryKey: [
      "arrivals-report",
      restaurantId,
      format(selectedDate, "yyyy-MM-dd"),
    ],
    queryFn: async (): Promise<Arrival[]> => {
      if (!restaurantId) return [];
      const dateStr = format(selectedDate, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("reservations")
        .select(
          `
          id,
          customer_name,
          customer_phone,
          customer_email,
          start_date,
          end_date,
          guests,
          status,
          notes,
          room:rooms(id, name)
        `
        )
        .eq("restaurant_id", restaurantId)
        .eq("start_date", dateStr)
        .in("status", ["confirmed", "pending", "checked_in"]);

      if (error) throw error;

      return (data || []).map((r: any) => ({
        id: r.id,
        guest_name: r.customer_name,
        guest_phone: r.customer_phone,
        guest_email: r.customer_email,
        room_name: r.room?.name || "Unassigned",
        room_id: r.room?.id,
        check_in_date: r.start_date,
        check_out_date: r.end_date,
        guests_count: r.guests || 1,
        status: r.status,
        special_requests: r.notes,
        is_vip: false, // Would come from guest loyalty tier
      }));
    },
    enabled: !!restaurantId,
  });

  // Fetch departures (check-ins with checkout date today)
  const {
    data: departures = [],
    isLoading: departuresLoading,
    refetch: refetchDepartures,
  } = useQuery({
    queryKey: [
      "departures-report",
      restaurantId,
      format(selectedDate, "yyyy-MM-dd"),
    ],
    queryFn: async (): Promise<Departure[]> => {
      if (!restaurantId) return [];
      const dateStr = format(selectedDate, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("check_ins")
        .select(
          `
          id,
          guest_name,
          guest_phone,
          expected_checkout_date,
          actual_checkout_date,
          check_in_date,
          total_room_charges,
          total_food_charges,
          status,
          room:rooms(id, name)
        `
        )
        .eq("restaurant_id", restaurantId)
        .eq("expected_checkout_date", dateStr);

      if (error) throw error;

      return (data || []).map((c: any) => {
        const nights = Math.ceil(
          (new Date(c.expected_checkout_date).getTime() -
            new Date(c.check_in_date).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        return {
          id: c.id,
          guest_name: c.guest_name,
          guest_phone: c.guest_phone,
          room_name: c.room?.name || "Unknown",
          room_id: c.room?.id,
          checkout_date: c.expected_checkout_date,
          nights_stayed: nights || 1,
          total_charges:
            (c.total_room_charges || 0) + (c.total_food_charges || 0),
          status: c.status,
          is_vip: false,
        };
      });
    },
    enabled: !!restaurantId,
  });

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-700">Confirmed</Badge>;
      case "pending":
        return <Badge className="bg-amber-100 text-amber-700">Pending</Badge>;
      case "checked_in":
        return <Badge className="bg-blue-100 text-blue-700">Checked In</Badge>;
      case "checked_out":
        return <Badge className="bg-gray-100 text-gray-700">Checked Out</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isLoading = arrivalsLoading || departuresLoading;

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl shadow-lg">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Arrivals & Departures
            </h1>
            <p className="text-gray-500 text-sm">Daily guest movement report</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(selectedDate, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button
            onClick={() => {
              refetchArrivals();
              refetchDepartures();
            }}
            variant="outline"
            size="icon"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button onClick={handlePrint} variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center pb-4 border-b">
        <h1 className="text-2xl font-bold">Arrivals & Departures Report</h1>
        <p className="text-gray-600">
          {format(selectedDate, "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <LogIn className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">
                  Expected Arrivals
                </p>
                <p className="text-3xl font-bold text-green-700">
                  {arrivals.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <LogOut className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">
                  Expected Departures
                </p>
                <p className="text-3xl font-bold text-blue-700">
                  {departures.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="print:hidden">
          <TabsTrigger value="arrivals" className="gap-2">
            <LogIn className="h-4 w-4" />
            Arrivals ({arrivals.length})
          </TabsTrigger>
          <TabsTrigger value="departures" className="gap-2">
            <LogOut className="h-4 w-4" />
            Departures ({departures.length})
          </TabsTrigger>
        </TabsList>

        {/* Arrivals Tab */}
        <TabsContent value="arrivals" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <LogIn className="h-5 w-5 text-green-500" />
                Expected Arrivals - {format(selectedDate, "MMM d, yyyy")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : arrivals.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No arrivals expected for this date
                </p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {arrivals.map((arrival) => (
                      <div
                        key={arrival.id}
                        className={cn(
                          "p-4 rounded-lg border",
                          arrival.is_vip
                            ? "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200"
                            : "bg-gray-50 border-gray-200"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {arrival.is_vip && (
                                <Crown className="h-4 w-4 text-amber-500" />
                              )}
                              <span className="font-semibold text-lg">
                                {arrival.guest_name}
                              </span>
                              {getStatusBadge(arrival.status)}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {arrival.guest_phone}
                              </span>
                              {arrival.guest_email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {arrival.guest_email}
                                </span>
                              )}
                            </div>
                            {arrival.special_requests && (
                              <p className="text-sm text-amber-600 italic">
                                Note: {arrival.special_requests}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-blue-600 font-medium">
                              <Bed className="h-4 w-4" />
                              {arrival.room_name}
                            </div>
                            <p className="text-sm text-gray-500">
                              {arrival.guests_count} guest
                              {arrival.guests_count > 1 ? "s" : ""}
                            </p>
                            <p className="text-xs text-gray-400">
                              Until{" "}
                              {format(
                                new Date(arrival.check_out_date),
                                "MMM d"
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Departures Tab */}
        <TabsContent value="departures" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <LogOut className="h-5 w-5 text-blue-500" />
                Expected Departures - {format(selectedDate, "MMM d, yyyy")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : departures.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No departures expected for this date
                </p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {departures.map((departure) => (
                      <div
                        key={departure.id}
                        className={cn(
                          "p-4 rounded-lg border",
                          departure.is_vip
                            ? "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200"
                            : "bg-gray-50 border-gray-200"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {departure.is_vip && (
                                <Crown className="h-4 w-4 text-amber-500" />
                              )}
                              <span className="font-semibold text-lg">
                                {departure.guest_name}
                              </span>
                              {getStatusBadge(departure.status)}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {departure.guest_phone}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {departure.nights_stayed} night
                                {departure.nights_stayed > 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-blue-600 font-medium">
                              <Bed className="h-4 w-4" />
                              {departure.room_name}
                            </div>
                            <p className="text-lg font-bold text-emerald-600">
                              {currencySymbol}
                              {departure.total_charges.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ArrivalsAndDeparturesReport;
