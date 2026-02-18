import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  MapPin,
  Navigation,
  ExternalLink,
  Clock,
  Calendar,
  Phone,
  Mail,
  Truck,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

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

const PublicTruckPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTruckData = async () => {
      if (!slug) {
        setError("Invalid truck link");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchErr } = await supabase
          .from("restaurants")
          .select(
            "name, slug, phone, email, address, location_type, current_location, current_location_link, weekly_schedule, location_updated_at, description",
          )
          .eq("slug", slug.toLowerCase())
          .single();

        if (fetchErr || !data) {
          setError("Truck not found");
        } else {
          setRestaurant(data);
        }
      } catch {
        setError("Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchTruckData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
          <p className="text-gray-600 font-medium">
            Finding the truck for you...
          </p>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {error || "Not Found"}
          </h1>
          <p className="text-gray-500">
            We couldn't find this food truck. Please check the link and try
            again.
          </p>
        </div>
      </div>
    );
  }

  const schedule = (restaurant.weekly_schedule as WeeklySchedule) || {};
  const today = format(new Date(), "EEEE");
  const todaySchedule = schedule[today];
  const isMobile = restaurant.location_type === "mobile";

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-r from-orange-500 via-red-500 to-pink-500">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')]"></div>
        </div>
        <div className="relative px-4 py-12 sm:py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
            <Truck className="h-5 w-5 text-white" />
            <span className="text-white font-medium text-sm">Food Truck</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3">
            {restaurant.name}
          </h1>
          {restaurant.description && (
            <p className="text-white/80 text-lg max-w-xl mx-auto">
              {restaurant.description}
            </p>
          )}
        </div>
        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" className="w-full h-auto">
            <path
              d="M0,40 C200,80 400,0 600,40 C800,80 1000,0 1200,40 C1350,80 1400,20 1440,40 L1440,80 L0,80 Z"
              className="fill-orange-50"
            />
          </svg>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-4 -mt-4 pb-12 space-y-6">
        {/* Current Location Card */}
        {isMobile && restaurant.current_location && (
          <div className="bg-white rounded-3xl shadow-xl p-6 border border-orange-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl shadow-md">
                <Navigation className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-lg">
                  Find Us Today
                </h2>
                {restaurant.location_updated_at && (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Updated{" "}
                    {formatDistanceToNow(
                      new Date(restaurant.location_updated_at),
                      { addSuffix: true },
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl mb-4">
              <p className="text-xl font-bold text-gray-900">
                {restaurant.current_location}
              </p>
            </div>

            {restaurant.current_location_link && (
              <a
                href={restaurant.current_location_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-2xl font-bold hover:from-orange-600 hover:to-red-600 transition-all shadow-lg hover:shadow-xl w-full text-center"
              >
                <ExternalLink className="h-5 w-5" />
                Navigate to Us
              </a>
            )}
          </div>
        )}

        {/* Fixed location */}
        {!isMobile && restaurant.address && (
          <div className="bg-white rounded-3xl shadow-xl p-6 border border-blue-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-md">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <h2 className="font-bold text-gray-900 text-lg">Our Location</h2>
            </div>
            <p className="text-lg text-gray-700">{restaurant.address}</p>
          </div>
        )}

        {/* Today's Schedule */}
        {isMobile && todaySchedule && todaySchedule.location && (
          <div className="bg-white rounded-3xl shadow-xl p-6 border border-purple-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-md">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <h2 className="font-bold text-gray-900 text-lg">
                {today}'s Schedule
              </h2>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl">
              <p className="font-semibold text-gray-900 text-lg">
                {todaySchedule.location}
              </p>
              <p className="text-gray-600 mt-1">
                🕒 {todaySchedule.startTime} – {todaySchedule.endTime}
              </p>
            </div>
            {todaySchedule.link && (
              <a
                href={todaySchedule.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 mt-4 text-purple-600 hover:text-purple-800 font-semibold"
              >
                <ExternalLink className="h-4 w-4" />
                View on Maps
              </a>
            )}
          </div>
        )}

        {/* Weekly Schedule */}
        {isMobile && Object.keys(schedule).length > 0 && (
          <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100">
            <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-600" />
              Weekly Schedule
            </h2>
            <div className="space-y-3">
              {DAYS.map((day) => {
                const dayData = schedule[day];
                const isToday = day === today;
                if (!dayData || !dayData.location) return null;

                return (
                  <div
                    key={day}
                    className={`flex items-center justify-between p-3 rounded-2xl transition-all ${
                      isToday
                        ? "bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 shadow-sm"
                        : "bg-gray-50 border border-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          isToday
                            ? "bg-gradient-to-r from-orange-500 to-red-500 text-white"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {day.charAt(0)}
                      </span>
                      <div>
                        <p
                          className={`font-semibold ${
                            isToday ? "text-orange-700" : "text-gray-700"
                          }`}
                        >
                          {day}
                          {isToday && (
                            <span className="ml-2 text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">
                              Today
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          {dayData.location}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-400">
                      {dayData.startTime} – {dayData.endTime}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Contact Info */}
        {(restaurant.phone || restaurant.email) && (
          <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100">
            <h2 className="font-bold text-gray-900 text-lg mb-4">Contact Us</h2>
            <div className="space-y-3">
              {restaurant.phone && (
                <a
                  href={`tel:${restaurant.phone}`}
                  className="flex items-center gap-3 p-3 bg-green-50 rounded-2xl hover:bg-green-100 transition-colors"
                >
                  <div className="p-2 bg-green-500 rounded-xl">
                    <Phone className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-semibold text-gray-700">
                    {restaurant.phone}
                  </span>
                </a>
              )}
              {restaurant.email && (
                <a
                  href={`mailto:${restaurant.email}`}
                  className="flex items-center gap-3 p-3 bg-blue-50 rounded-2xl hover:bg-blue-100 transition-colors"
                >
                  <div className="p-2 bg-blue-500 rounded-xl">
                    <Mail className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-semibold text-gray-700">
                    {restaurant.email}
                  </span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-4">
          <p className="text-sm text-gray-400">
            Powered by{" "}
            <span className="font-semibold text-orange-500">
              Swadeshi Solutions
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicTruckPage;
