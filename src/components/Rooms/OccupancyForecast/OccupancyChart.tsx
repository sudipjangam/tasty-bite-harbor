import React, { useState, useEffect } from "react";
import { format, addDays, startOfDay, eachDayOfInterval } from "date-fns";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
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

  // Check if dark mode
  const isDark = document.documentElement.classList.contains("dark");

  // Highcharts options
  const chartOptions: Highcharts.Options = {
    chart: {
      type: "area",
      height: 250,
      backgroundColor: "transparent",
      style: { fontFamily: "inherit" },
    },
    title: { text: undefined },
    credits: { enabled: false },
    xAxis: {
      categories: data.map((d) => d.dateLabel),
      labels: {
        style: { color: isDark ? "#9ca3af" : "#6b7280", fontSize: "12px" },
      },
      lineColor: isDark ? "#374151" : "#e5e7eb",
      tickColor: "transparent",
    },
    yAxis: {
      min: 0,
      max: 100,
      title: { text: undefined },
      labels: {
        format: "{value}%",
        style: { color: isDark ? "#9ca3af" : "#6b7280", fontSize: "12px" },
      },
      gridLineColor: isDark ? "#374151" : "#e5e7eb",
      plotLines: [
        {
          value: 80,
          color: "#ef4444",
          dashStyle: "Dash",
          width: 1,
          label: {
            text: "High",
            align: "right",
            style: { color: "#ef4444", fontSize: "10px" },
          },
        },
      ],
    },
    tooltip: {
      backgroundColor: isDark
        ? "rgba(31, 41, 55, 0.95)"
        : "rgba(255, 255, 255, 0.95)",
      borderWidth: 0,
      borderRadius: 12,
      shadow: true,
      useHTML: true,
      formatter: function () {
        const point = this.point as any;
        const idx = point.index;
        const d = data[idx];
        return `
          <div style="padding: 8px;">
            <p style="font-weight: 600; color: ${
              isDark ? "#e5e7eb" : "#1f2937"
            }; margin: 0 0 4px 0;">${d.dateLabel}</p>
            <p style="margin: 0; color: ${isDark ? "#9ca3af" : "#6b7280"};">
              <span style="font-weight: 500; color: #6366f1;">${
                d.occupancy
              }%</span> occupancy
            </p>
            <p style="font-size: 12px; color: ${
              isDark ? "#6b7280" : "#9ca3af"
            }; margin: 4px 0 0 0;">
              ${d.bookedRooms} of ${d.totalRooms} rooms
            </p>
          </div>
        `;
      },
    },
    legend: { enabled: false },
    plotOptions: {
      area: {
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, "rgba(99, 102, 241, 0.4)"],
            [1, "rgba(99, 102, 241, 0)"],
          ],
        },
        lineWidth: 2,
        marker: {
          enabled: false,
          states: { hover: { enabled: true, radius: 5 } },
        },
      },
    },
    series: [
      {
        type: "area",
        name: "Occupancy",
        data: data.map((d) => d.occupancy),
        color: "#6366f1",
      },
    ],
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
          <HighchartsReact highcharts={Highcharts} options={chartOptions} />
        )}
      </CardContent>
    </Card>
  );
};

export default OccupancyChart;
