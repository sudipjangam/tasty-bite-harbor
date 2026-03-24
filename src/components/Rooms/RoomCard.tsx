import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CalendarCheck,
  ShoppingBag,
  Users,
  Tag,
  Edit3,
  LogOut,
  LogIn,
  UserCheck,
  Clock,
  Timer,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface RoomCardProps {
  room: {
    id: string;
    name: string;
    capacity: number;
    status: string;
    price: number;
  };
  foodOrdersTotal?: number;
  onEdit: (room: any) => void;
  onReserve: (room: any) => void;
  onFoodOrder: (room: any) => void;
  onCheckout: (roomId: string) => void;
  onCheckIn?: (room: any) => void;
  getStatusClass: (status: string) => string;
}

// Helper to format elapsed time
const formatElapsed = (startTime: string) => {
  const start = new Date(startTime).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - start);
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const formatTime = (isoString: string) => {
  return new Date(isoString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const RoomCard: React.FC<RoomCardProps> = ({
  room,
  foodOrdersTotal,
  onEdit,
  onReserve,
  onFoodOrder,
  onCheckout,
  onCheckIn,
  getStatusClass,
}) => {
  const { symbol: currencySymbol } = useCurrencyContext();

  // Live timer tick for cleaning elapsed time
  const [, setTick] = useState(0);
  useEffect(() => {
    if (room.status !== "cleaning") return;
    const interval = setInterval(() => setTick((t) => t + 1), 30000); // update every 30s
    return () => clearInterval(interval);
  }, [room.status]);

  // Fetch active cleaning schedule for this room
  const { data: cleaningInfo } = useQuery({
    queryKey: ["room-cleaning-info", room.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_cleaning_schedules")
        .select(
          `
          id,
          status,
          cleaning_type,
          actual_start_time,
          actual_end_time,
          scheduled_time,
          scheduled_date,
          created_at,
          updated_at,
          staff:assigned_staff_id(first_name, last_name)
        `
        )
        .eq("room_id", room.id)
        .in("status", ["pending", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching cleaning info:", error);
        return null;
      }
      return data;
    },
    enabled: room.status === "cleaning",
    refetchInterval: room.status === "cleaning" ? 30000 : false,
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "available":
        return {
          bg: "bg-gradient-to-r from-emerald-500 to-teal-600",
          text: "text-white",
          icon: "✓",
        };
      case "occupied":
        return {
          bg: "bg-gradient-to-r from-blue-500 to-indigo-600",
          text: "text-white",
          icon: "👤",
        };
      case "cleaning":
        return {
          bg: "bg-gradient-to-r from-amber-500 to-orange-600",
          text: "text-white",
          icon: "🧹",
        };
      case "maintenance":
        return {
          bg: "bg-gradient-to-r from-rose-500 to-pink-600",
          text: "text-white",
          icon: "🔧",
        };
      default:
        return {
          bg: "bg-gray-200",
          text: "text-gray-700",
          icon: "",
        };
    }
  };

  const badge = getStatusBadge(room.status);

  // Get status vibrant gradient for card background
  const getStatusBackground = (status: string) => {
    switch (status.toLowerCase()) {
      case "available":
        return "bg-gradient-to-br from-emerald-100 via-teal-50 to-white dark:from-emerald-900/40 dark:via-teal-900/30 dark:to-gray-900 border-l-emerald-500 shadow-emerald-100/50";
      case "occupied":
        return "bg-gradient-to-br from-blue-200 via-indigo-100 to-white dark:from-blue-900/50 dark:via-indigo-900/40 dark:to-gray-900 border-l-blue-600 shadow-blue-200/50";
      case "cleaning":
        return "bg-gradient-to-br from-amber-200 via-orange-100 to-white dark:from-amber-900/50 dark:via-orange-900/40 dark:to-gray-900 border-l-amber-500 shadow-amber-200/50";
      case "maintenance":
        return "bg-gradient-to-br from-rose-200 via-pink-100 to-white dark:from-rose-900/50 dark:via-pink-900/40 dark:to-gray-900 border-l-rose-500 shadow-rose-200/50";
      default:
        return "bg-white dark:bg-gray-800 border-l-gray-300";
    }
  };

  // Get status accent color for glows
  const getStatusGlow = (status: string) => {
    switch (status.toLowerCase()) {
      case "available":
        return "group-hover:shadow-emerald-200/50 dark:group-hover:shadow-emerald-900/30";
      case "occupied":
        return "group-hover:shadow-blue-300/50 dark:group-hover:shadow-blue-900/30";
      case "cleaning":
        return "group-hover:shadow-amber-200/50 dark:group-hover:shadow-amber-900/30";
      case "maintenance":
        return "group-hover:shadow-rose-200/50 dark:group-hover:shadow-rose-900/30";
      default:
        return "";
    }
  };

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-500 ease-out",
        "hover:-translate-y-1.5 hover:shadow-2xl",
        "backdrop-blur-md border border-gray-100 dark:border-gray-800",
        "border-l-[6px]", // Thicker prominent border
        getStatusBackground(room.status),
        getStatusGlow(room.status),
        "rounded-2xl"
      )}
    >
      {/* Decorative background patterns */}
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] transform rotate-12 scale-150 pointer-events-none">
        {getStatusBadge(room.status).icon === "✓" && (
          <CalendarCheck size={120} />
        )}
        {getStatusBadge(room.status).icon === "👤" && <Users size={120} />}
        {getStatusBadge(room.status).icon === "🧹" && (
          <ShoppingBag size={120} />
        )}{" "}
        {/* Using closest shapes */}
      </div>

      <CardHeader className="relative pb-2 pt-5">
        <CardTitle className="flex justify-between items-start">
          <span className="text-xl font-bold text-gray-800 dark:text-gray-100">
            {room.name}
          </span>
          <span
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full font-semibold shadow-lg",
              badge.bg,
              badge.text
            )}
          >
            <span>{badge.icon}</span>
            {room.status}
          </span>
        </CardTitle>

        <CardDescription className="space-y-3 mt-4">
          <div className="flex items-center gap-3 p-3 bg-white/70 dark:bg-gray-800/70 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-md">
              <Users className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Capacity
              </p>
              <p className="font-semibold text-gray-800 dark:text-gray-100">
                {room.capacity} {room.capacity === 1 ? "person" : "people"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-white/70 dark:bg-gray-800/70 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shadow-md">
              <Tag className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Price</p>
              <p className="font-semibold text-gray-800 dark:text-gray-100">
                {currencySymbol}
                {room.price} / night
              </p>
            </div>
          </div>

          {room.status === "occupied" &&
            foodOrdersTotal &&
            foodOrdersTotal > 0 && (
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200/50 dark:border-purple-700/50">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-md">
                  <ShoppingBag className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    Food Orders
                  </p>
                  <p className="font-bold text-purple-700 dark:text-purple-300">
                    {currencySymbol}
                    {foodOrdersTotal.toFixed(2)}
                  </p>
                </div>
              </div>
            )}

          {/* Cleaning Details Section */}
          {room.status === "cleaning" && cleaningInfo && (
            <div className="space-y-2 p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200/60 dark:border-amber-700/40">
              {/* Assigned Staff */}
              {cleaningInfo.staff && (
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg shadow-sm">
                    <UserCheck className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-600/70 dark:text-amber-400/70 font-medium">Assigned Staff</p>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                      {(cleaningInfo.staff as any)?.first_name} {(cleaningInfo.staff as any)?.last_name}
                    </p>
                  </div>
                </div>
              )}

              {/* Started At */}
              {(cleaningInfo.actual_start_time || cleaningInfo.status === "in_progress") && (
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg shadow-sm">
                    <Clock className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-600/70 dark:text-amber-400/70 font-medium">Started At</p>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                      {cleaningInfo.actual_start_time
                        ? formatTime(cleaningInfo.actual_start_time)
                        : formatTime(cleaningInfo.updated_at)}
                    </p>
                  </div>
                </div>
              )}

              {/* Elapsed Time */}
              {(cleaningInfo.actual_start_time || cleaningInfo.status === "in_progress") && (
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-gradient-to-br from-rose-500 to-pink-600 rounded-lg shadow-sm">
                    <Timer className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-600/70 dark:text-amber-400/70 font-medium">Elapsed</p>
                    <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
                      {formatElapsed(cleaningInfo.actual_start_time || cleaningInfo.updated_at)}
                    </p>
                  </div>
                </div>
              )}

              {/* Cleaning Type */}
              {cleaningInfo.cleaning_type && (
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-sm">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-600/70 dark:text-amber-400/70 font-medium">Type</p>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 capitalize">
                      {cleaningInfo.cleaning_type === "deep" ? "Deep Clean" : cleaningInfo.cleaning_type === "checkout" ? "Checkout Clean" : cleaningInfo.cleaning_type === "maintenance" ? "Maintenance" : "Standard"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardDescription>
      </CardHeader>

      <CardFooter className="relative flex flex-wrap gap-2 pt-2 pb-5 px-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(room)}
          className="flex-1 bg-white/80 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all duration-200"
        >
          <Edit3 className="mr-1.5 h-3.5 w-3.5" />
          Edit
        </Button>

        {room.status === "available" ? (
          <div className="flex flex-1 gap-2">
            <Button
              size="sm"
              onClick={() => onReserve(room)}
              variant="outline"
              className="flex-1 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium rounded-xl transition-all duration-200"
            >
              <CalendarCheck className="mr-1.5 h-3.5 w-3.5" />
              Reserve
            </Button>
            <Button
              size="sm"
              onClick={() => onCheckIn && onCheckIn(room)}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <LogIn className="mr-1.5 h-3.5 w-3.5" />
              Check In
            </Button>
          </div>
        ) : room.status === "occupied" ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFoodOrder(room)}
              className="flex-1 border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 font-medium rounded-xl transition-all duration-200"
            >
              <ShoppingBag className="mr-1.5 h-3.5 w-3.5" />
              Food Order
            </Button>
            <Button
              size="sm"
              onClick={() => onCheckout(room.id)}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              Checkout
            </Button>
          </>
        ) : room.status === "cleaning" ? (
          <Link to="/housekeeping">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 font-medium rounded-xl transition-all duration-200"
            >
              🧹 Housekeeping →
            </Button>
          </Link>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled
            className="flex-1 text-gray-500 rounded-xl"
          >
            🔧 Maintenance
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default RoomCard;
