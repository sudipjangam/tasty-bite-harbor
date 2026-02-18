import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import {
  Loader2,
  MapPin,
  Truck,
  Building2,
  Save,
  Clock,
  ExternalLink,
  Calendar,
  Navigation,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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

const EMPTY_DAY: DaySchedule = {
  location: "",
  link: "",
  startTime: "10:00",
  endTime: "22:00",
};

const LocationSettingsTab = () => {
  const { toast } = useToast();
  const { restaurantId } = useRestaurantId();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [locationType, setLocationType] = useState<"fixed" | "mobile">("fixed");
  const [currentLocation, setCurrentLocation] = useState("");
  const [currentLocationLink, setCurrentLocationLink] = useState("");
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({});
  const [activeDays, setActiveDays] = useState<Set<string>>(new Set());

  // Fetch restaurant location data
  const { data: restaurant, isLoading } = useQuery({
    queryKey: ["restaurant-location", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select(
          "location_type, current_location, current_location_link, weekly_schedule, location_updated_at, name, address",
        )
        .eq("id", restaurantId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Populate form from DB
  useEffect(() => {
    if (restaurant) {
      setLocationType(
        (restaurant.location_type as "fixed" | "mobile") || "fixed",
      );
      setCurrentLocation(restaurant.current_location || "");
      setCurrentLocationLink(restaurant.current_location_link || "");

      const schedule = (restaurant.weekly_schedule as WeeklySchedule) || {};
      setWeeklySchedule(schedule);

      const active = new Set<string>();
      DAYS.forEach((day) => {
        if (schedule[day] && schedule[day].location) {
          active.add(day);
        }
      });
      setActiveDays(active);
    }
  }, [restaurant]);

  const toggleDay = (day: string) => {
    const newActive = new Set(activeDays);
    if (newActive.has(day)) {
      newActive.delete(day);
      // Clear that day's schedule
      const newSchedule = { ...weeklySchedule };
      delete newSchedule[day];
      setWeeklySchedule(newSchedule);
    } else {
      newActive.add(day);
      // Initialize that day
      setWeeklySchedule((prev) => ({
        ...prev,
        [day]: { ...EMPTY_DAY },
      }));
    }
    setActiveDays(newActive);
  };

  const updateDaySchedule = (
    day: string,
    field: keyof DaySchedule,
    value: string,
  ) => {
    setWeeklySchedule((prev) => ({
      ...prev,
      [day]: {
        ...(prev[day] || EMPTY_DAY),
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!restaurantId) {
      toast({
        title: "Error",
        description: "Restaurant ID not found",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Build the clean schedule (only active days)
      const cleanSchedule: WeeklySchedule = {};
      activeDays.forEach((day) => {
        if (weeklySchedule[day]) {
          cleanSchedule[day] = weeklySchedule[day];
        }
      });

      const updateData: Record<string, unknown> = {
        location_type: locationType,
        current_location:
          locationType === "mobile" ? currentLocation.trim() || null : null,
        current_location_link:
          locationType === "mobile" ? currentLocationLink.trim() || null : null,
        weekly_schedule:
          locationType === "mobile" && Object.keys(cleanSchedule).length > 0
            ? cleanSchedule
            : null,
        location_updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("restaurants")
        .update(updateData as any)
        .eq("id", restaurantId);

      if (error) throw error;

      await queryClient.invalidateQueries({
        queryKey: ["restaurant-location"],
      });
      await queryClient.invalidateQueries({ queryKey: ["restaurant"] });

      toast({
        title: "✅ Location Saved",
        description: `${locationType === "mobile" ? "Mobile" : "Fixed"} location settings saved successfully`,
      });
    } catch (error: any) {
      console.error("Error saving location:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save location settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Location Type Selector */}
      <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-2xl">
        <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl shadow-lg">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            Location Management
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
            Set your business type and manage your location for customers
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          {/* Type Toggle */}
          <div>
            <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 block">
              Business Type
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setLocationType("fixed")}
                className={`p-6 rounded-2xl border-2 transition-all duration-300 text-center ${
                  locationType === "fixed"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-lg shadow-blue-200/50"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                }`}
              >
                <Building2
                  className={`h-8 w-8 mx-auto mb-2 ${locationType === "fixed" ? "text-blue-600" : "text-gray-400"}`}
                />
                <p
                  className={`font-bold text-lg ${locationType === "fixed" ? "text-blue-700 dark:text-blue-300" : "text-gray-600 dark:text-gray-400"}`}
                >
                  Fixed Location
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Restaurant with a permanent address
                </p>
              </button>
              <button
                type="button"
                onClick={() => setLocationType("mobile")}
                className={`p-6 rounded-2xl border-2 transition-all duration-300 text-center relative ${
                  locationType === "mobile"
                    ? "border-orange-500 bg-orange-50 dark:bg-orange-900/30 shadow-lg shadow-orange-200/50"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                }`}
              >
                <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs">
                  Food Truck
                </Badge>
                <Truck
                  className={`h-8 w-8 mx-auto mb-2 ${locationType === "mobile" ? "text-orange-600" : "text-gray-400"}`}
                />
                <p
                  className={`font-bold text-lg ${locationType === "mobile" ? "text-orange-700 dark:text-orange-300" : "text-gray-600 dark:text-gray-400"}`}
                >
                  Mobile / Food Truck
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Changes location regularly
                </p>
              </button>
            </div>
          </div>

          {/* Fixed location info */}
          {locationType === "fixed" && (
            <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl border border-blue-100 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-600">
                  Your Registered Address
                </span>
              </div>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {restaurant?.address || "Not set — update in Restaurant tab"}
              </p>
              <p className="text-xs text-blue-500 dark:text-blue-400 mt-2">
                Fixed-location businesses use the address from your Restaurant
                profile
              </p>
            </div>
          )}

          {/* Mobile location fields */}
          {locationType === "mobile" && (
            <>
              <Separator />

              {/* Current Location */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Navigation className="h-5 w-5 text-orange-600" />
                  Current Location
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="currentLocation"
                      className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2"
                    >
                      <MapPin className="h-4 w-4" />
                      Where are you today? *
                    </Label>
                    <Input
                      id="currentLocation"
                      type="text"
                      placeholder="e.g. MG Road, near Metro Station"
                      value={currentLocation}
                      onChange={(e) => setCurrentLocation(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      This will be shown to customers looking for your truck
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="currentLocationLink"
                      className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Google Maps Link (Optional)
                    </Label>
                    <Input
                      id="currentLocationLink"
                      type="url"
                      placeholder="https://maps.google.com/..."
                      value={currentLocationLink}
                      onChange={(e) => setCurrentLocationLink(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Paste a Google Maps link so customers can navigate to you
                    </p>
                  </div>
                </div>

                {/* Last updated info */}
                {restaurant?.location_updated_at && (
                  <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-100 dark:border-green-800 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700 dark:text-green-400">
                      Last updated{" "}
                      {formatDistanceToNow(
                        new Date(restaurant.location_updated_at),
                        { addSuffix: true },
                      )}
                    </span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Weekly Schedule */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  Weekly Schedule
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Plan your week ahead — customers will see where you'll be on
                  each day
                </p>

                {/* Day toggles */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {DAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        activeDays.has(day)
                          ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>

                {/* Day details */}
                <div className="space-y-4">
                  {DAYS.filter((day) => activeDays.has(day)).map(
                    (day, index) => (
                      <div
                        key={day}
                        className="p-5 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-700/50 dark:to-slate-700/50 rounded-2xl border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                              {day.charAt(0)}
                            </span>
                            {day}
                          </h4>
                          <button
                            type="button"
                            onClick={() => toggleDay(day)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="lg:col-span-2 space-y-1">
                            <Label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              Location
                            </Label>
                            <Input
                              placeholder="e.g. Koramangala, 4th Block"
                              value={weeklySchedule[day]?.location || ""}
                              onChange={(e) =>
                                updateDaySchedule(
                                  day,
                                  "location",
                                  e.target.value,
                                )
                              }
                              className="bg-white dark:bg-gray-800"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              Start Time
                            </Label>
                            <Input
                              type="time"
                              value={weeklySchedule[day]?.startTime || "10:00"}
                              onChange={(e) =>
                                updateDaySchedule(
                                  day,
                                  "startTime",
                                  e.target.value,
                                )
                              }
                              className="bg-white dark:bg-gray-800"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              End Time
                            </Label>
                            <Input
                              type="time"
                              value={weeklySchedule[day]?.endTime || "22:00"}
                              onChange={(e) =>
                                updateDaySchedule(
                                  day,
                                  "endTime",
                                  e.target.value,
                                )
                              }
                              className="bg-white dark:bg-gray-800"
                            />
                          </div>
                        </div>
                        <div className="mt-3">
                          <Label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Maps Link (Optional)
                          </Label>
                          <Input
                            type="url"
                            placeholder="https://maps.google.com/..."
                            value={weeklySchedule[day]?.link || ""}
                            onChange={(e) =>
                              updateDaySchedule(day, "link", e.target.value)
                            }
                            className="bg-white dark:bg-gray-800 mt-1"
                          />
                        </div>
                      </div>
                    ),
                  )}

                  {activeDays.size === 0 && (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">No days scheduled yet</p>
                      <p className="text-xs mt-1">
                        Click on a day above to add a location
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={
                saving || (locationType === "mobile" && !currentLocation.trim())
              }
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold px-8 shadow-lg"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Location Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
            How Location Sharing Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/30 dark:to-red-900/30 rounded-xl">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">1</span>
              </div>
              <p className="text-sm font-medium dark:text-gray-300">
                Set your current location & weekly schedule here
              </p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-xl">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">2</span>
              </div>
              <p className="text-sm font-medium dark:text-gray-300">
                Customers see "Find Us Today" on your dashboard
              </p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">3</span>
              </div>
              <p className="text-sm font-medium dark:text-gray-300">
                They click the map link to navigate directly to you
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LocationSettingsTab;
