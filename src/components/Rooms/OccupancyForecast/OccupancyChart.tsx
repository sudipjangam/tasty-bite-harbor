import React, { useState, useEffect } from "react";
import { format, addDays, startOfDay, eachDayOfInterval } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OccupancyData {
  date: string;
  dateLabel: string;
  occupancy: number;
  bookedRooms: number;
  totalRooms: number;
}

interface OccupancyChartProps {
  className?: string;
}

const OccupancyChart: React.FC<OccupancyChartProps> = ({ className }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OccupancyData[]>([]);
  const [startDate, setStartDate] = useState<Date>(startOfDay(new Date()));
  const [totalRooms, setTotalRooms] = useState(0);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const daysToShow = 14; // Show 2 weeks

  // Fetch restaurant ID
  useEffect(() => {
    const fetchRestaurantId = async () => {
      try {
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
      } catch (error) {
        console.error("Error fetching restaurant ID:", error);
      }
    };

    fetchRestaurantId();
  }, []);

  // Fetch occupancy data
  useEffect(() => {
    if (!restaurantId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Get total rooms
        const { data: rooms, error: roomsError } = await supabase
          .from("rooms")
          .select("id")
          .eq("restaurant_id", restaurantId)
          .neq("status", "maintenance");

        if (roomsError) throw roomsError;
        const roomCount = rooms?.length || 0;
        setTotalRooms(roomCount);

        if (roomCount === 0) {
          setData([]);
          setLoading(false);
          return;
        }

        // Get date range
        const endDate = addDays(startDate, daysToShow - 1);
        const dates = eachDayOfInterval({ start: startDate, end: endDate });

        // Get reservations in range
        const { data: reservations, error: resError } = await supabase
          .from("reservations")
          .select("room_id, start_time, end_time")
          .eq("restaurant_id", restaurantId)
          .not("status", "in", '("cancelled","checked_out")')
          .lte("start_time", endDate.toISOString())
          .gte("end_time", startDate.toISOString());

        if (resError) throw resError;

        // Calculate occupancy for each date
        const occupancyData: OccupancyData[] = dates.map((date) => {
          const dateStr = format(date, "yyyy-MM-dd");

          // Count rooms occupied on this date
          const bookedRooms = new Set(
            (reservations || [])
              .filter((res) => {
                const resStart = new Date(res.start_time).setHours(0, 0, 0, 0);
                const resEnd = new Date(res.end_time).setHours(0, 0, 0, 0);
                const checkDate = date.getTime();
                return checkDate >= resStart && checkDate < resEnd;
              })
              .map((res) => res.room_id)
          ).size;

          return {
            date: dateStr,
            dateLabel: format(date, "MMM d"),
            occupancy: Math.round((bookedRooms / roomCount) * 100),
            bookedRooms,
            totalRooms: roomCount,
          };
        });

        setData(occupancyData);
      } catch (error) {
        console.error("Error fetching occupancy data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [restaurantId, startDate]);

  const navigatePrevious = () => setStartDate(addDays(startDate, -daysToShow));
  const navigateNext = () => setStartDate(addDays(startDate, daysToShow));
  const navigateToday = () => setStartDate(startOfDay(new Date()));

  const averageOccupancy =
    data.length > 0
      ? Math.round(data.reduce((sum, d) => sum + d.occupancy, 0) / data.length)
      : 0;

  const maxOccupancy =
    data.length > 0 ? Math.max(...data.map((d) => d.occupancy)) : 0;
  const peakDate = data.find((d) => d.occupancy === maxOccupancy);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-gray-800 dark:text-gray-200">
            {d.dateLabel}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium text-indigo-600 dark:text-indigo-400">
              {d.occupancy}%
            </span>{" "}
            occupancy
          </p>
          <p className="text-xs text-gray-500">
            {d.bookedRooms} of {d.totalRooms} rooms
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card
      className={cn(
        "bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm",
        className
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-lg">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <CardTitle className="text-lg">Occupancy Forecast</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={navigatePrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={navigateToday}>
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={navigateNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-3">
          <Badge variant="secondary" className="text-sm">
            Avg: {averageOccupancy}%
          </Badge>
          {peakDate && (
            <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
              Peak: {peakDate.dateLabel} ({maxOccupancy}%)
            </Badge>
          )}
          <Badge variant="outline">{totalRooms} rooms total</Badge>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[250px]">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[250px] text-gray-500">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="occupancyGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-gray-200 dark:stroke-gray-700"
              />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={80}
                stroke="#ef4444"
                strokeDasharray="3 3"
                label="High"
              />
              <Area
                type="monotone"
                dataKey="occupancy"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#occupancyGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default OccupancyChart;
