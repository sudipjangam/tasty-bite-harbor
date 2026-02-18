import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import {
  MapPin,
  Navigation,
  ExternalLink,
  Clock,
  Calendar,
  Truck,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

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

const LocationTodayWidget = () => {
  const { restaurantId } = useRestaurantId();
  const navigate = useNavigate();

  const { data: restaurant, isLoading } = useQuery({
    queryKey: ["restaurant-location", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select(
          "location_type, current_location, current_location_link, weekly_schedule, location_updated_at, address",
        )
        .eq("id", restaurantId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      </div>
    );
  }

  // Not a mobile/food truck → don't show the widget
  if (!restaurant || restaurant.location_type !== "mobile") {
    return null;
  }

  const schedule = (restaurant.weekly_schedule as WeeklySchedule) || {};
  const today = format(new Date(), "EEEE"); // "Monday", "Tuesday" etc
  const todaySchedule = schedule[today];

  return (
    <div className="space-y-4">
      {/* Current Location */}
      <div className="p-4 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-2xl border border-orange-200 dark:border-orange-800">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl shadow-md flex-shrink-0">
            <Navigation className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">
              📍 Right Now
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-white truncate">
              {restaurant.current_location || "Location not set"}
            </p>
            {restaurant.location_updated_at && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Updated{" "}
                {formatDistanceToNow(new Date(restaurant.location_updated_at), {
                  addSuffix: true,
                })}
              </p>
            )}
          </div>
        </div>

        {/* Google Maps button */}
        {restaurant.current_location_link && (
          <a
            href={restaurant.current_location_link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:from-orange-600 hover:to-red-600 transition-all shadow-md hover:shadow-lg"
          >
            <ExternalLink className="h-4 w-4" />
            Open in Google Maps
          </a>
        )}
      </div>

      {/* Today's scheduled location */}
      {todaySchedule && todaySchedule.location && (
        <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              {today}'s Plan
            </span>
          </div>
          <p className="font-semibold text-gray-900 dark:text-white">
            {todaySchedule.location}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {todaySchedule.startTime} – {todaySchedule.endTime}
          </p>
          {todaySchedule.link && (
            <a
              href={todaySchedule.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 mt-2"
            >
              <ExternalLink className="h-3 w-3" />
              View on map
            </a>
          )}
        </div>
      )}

      {/* Upcoming schedule preview */}
      {Object.keys(schedule).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Upcoming
          </p>
          <div className="space-y-1.5">
            {DAYS.filter(
              (day) => day !== today && schedule[day] && schedule[day].location,
            )
              .slice(0, 3)
              .map((day) => (
                <div
                  key={day}
                  className="flex items-center justify-between p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold">
                      {day.charAt(0)}
                    </span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {day.slice(0, 3)}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                    {schedule[day].location}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Quick action to update */}
      <Button
        variant="outline"
        size="sm"
        className="w-full mt-2 text-orange-600 border-orange-200 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-900/20"
        onClick={() => navigate("/settings?tab=location")}
      >
        <MapPin className="h-4 w-4 mr-2" />
        Update Location
      </Button>
    </div>
  );
};

export default LocationTodayWidget;
