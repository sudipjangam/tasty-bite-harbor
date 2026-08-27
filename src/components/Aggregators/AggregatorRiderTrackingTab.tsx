import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Bike,
  Navigation,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Flame,
  Hourglass,
  Sparkles,
  ShieldCheck,
  Search,
  ArrowUpRight,
  Radio,
} from "lucide-react";
import { useRiderTracking } from "@/hooks/useRiderTracking";
import { AggregatorOrder } from "@/types/aggregators";

const PLATFORM_STYLES: Record<string, { bg: string; text: string; label: string; ring: string }> = {
  swiggy: { bg: "bg-orange-500", text: "text-orange-500", label: "Swiggy", ring: "border-orange-500" },
  zomato: { bg: "bg-red-500", text: "text-red-500", label: "Zomato", ring: "border-red-500" },
  ubereats: { bg: "bg-emerald-600", text: "text-emerald-600", label: "Uber Eats", ring: "border-emerald-500" },
  magicpin: { bg: "bg-purple-600", text: "text-purple-600", label: "magicpin", ring: "border-purple-500" },
  urbanpiper: { bg: "bg-blue-600", text: "text-blue-600", label: "UrbanPiper", ring: "border-blue-500" },
};

export const AggregatorRiderTrackingTab: React.FC = () => {
  const {
    orders,
    isLoading,
    ridersAtStore,
    ridersEnRoute,
    totalActiveRiders,
    handoverFood,
    delayOrder,
  } = useRiderTracking();

  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = orders.filter((o) => {
    const matchesPlatform = filterPlatform === "all" || o.platform === filterPlatform;
    const matchesSearch =
      !searchQuery ||
      o.platform_order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.rider?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPlatform && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 rounded-3xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">RIDERS AT COUNTER</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <MapPin className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{ridersAtStore.length}</span>
            <span className="text-xs text-gray-400">Ready for Handover</span>
          </div>
        </Card>

        <Card className="p-4 rounded-3xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">EN ROUTE TO STORE</span>
            <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl">
              <Bike className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-600">{ridersEnRoute.length}</span>
            <span className="text-xs text-gray-400">ETA &lt; 5 mins</span>
          </div>
        </Card>

        <Card className="p-4 rounded-3xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">OUT FOR DELIVERY</span>
            <div className="p-2 bg-purple-500/10 text-purple-600 rounded-xl">
              <Navigation className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-600">
              {orders.filter((o) => o.status === "dispatched").length}
            </span>
            <span className="text-xs text-gray-400">En Route to Customer</span>
          </div>
        </Card>

        <Card className="p-4 rounded-3xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">ACTIVE CHANNELS</span>
            <div className="p-2 bg-orange-500/10 text-orange-600 rounded-xl">
              <Radio className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-orange-600">Swiggy • Zomato • Uber</span>
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-3.5 rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-md">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {["all", "swiggy", "zomato", "ubereats", "magicpin"].map((p) => (
            <Button
              key={p}
              size="sm"
              variant={filterPlatform === p ? "default" : "outline"}
              onClick={() => setFilterPlatform(p)}
              className={`rounded-xl text-xs font-bold capitalize ${
                filterPlatform === p
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : ""
              }`}
            >
              {p === "all" ? "All Platforms" : p}
            </Button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rider, order, ID..."
            className="pl-9 rounded-2xl h-9 text-xs"
          />
        </div>
      </div>

      {/* Live Rider Cards Grid */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center rounded-3xl border border-dashed space-y-3">
          <Bike className="h-12 w-12 text-gray-300 mx-auto" />
          <h3 className="text-base font-bold text-gray-700 dark:text-gray-300">
            No Active Delivery Riders Right Now
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            When customer orders are accepted on Swiggy, Zomato, or UberEats, assigned delivery partners appear here with live GPS & counter proximity.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((order) => {
            const platformConfig = PLATFORM_STYLES[order.platform] || PLATFORM_STYLES.swiggy;
            const isAtStore = order.rider?.status === "arrived_at_store" || order.status === "food_ready";
            const isDispatched = order.status === "dispatched" || order.rider?.status === "picked_up";

            return (
              <Card
                key={order.id}
                className={`p-5 rounded-3xl border-2 transition-all space-y-4 shadow-lg ${
                  isAtStore
                    ? "border-emerald-500 ring-4 ring-emerald-400/20 bg-emerald-50/10"
                    : isDispatched
                    ? "border-purple-200 dark:border-purple-900/40 opacity-95"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-xl text-white font-black text-xs uppercase shadow-sm ${platformConfig.bg}`}
                    >
                      {platformConfig.label}
                    </span>
                    <span className="font-mono font-extrabold text-sm text-gray-800 dark:text-gray-200">
                      #{order.platform_order_id.slice(-6)}
                    </span>
                  </div>

                  <Badge
                    className={`font-black text-[10px] uppercase tracking-wide px-2.5 py-1 ${
                      isAtStore
                        ? "bg-emerald-500 text-white animate-pulse shadow-md shadow-emerald-500/30"
                        : isDispatched
                        ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                    }`}
                  >
                    {isAtStore ? "🚨 RIDER AT COUNTER" : isDispatched ? "🚀 OUT FOR DELIVERY" : "🛵 EN ROUTE TO STORE"}
                  </Badge>
                </div>

                {/* Rider Profile Card */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
                      <Bike className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900 dark:text-white">
                        {order.rider?.name || "Assigned Driver"}
                      </p>
                      <span className="text-xs text-gray-400 font-mono">
                        {order.rider?.vehicle_number || "MH-12-XX-0000"}
                      </span>
                    </div>
                  </div>

                  {order.rider?.phone && (
                    <a
                      href={`tel:${order.rider.phone}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm"
                    >
                      <Phone className="h-3.5 w-3.5" /> Call
                    </a>
                  )}
                </div>

                {/* Live Distance & ETA Radar */}
                <div className="bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
                    <span className="font-bold text-blue-900 dark:text-blue-300">
                      {isAtStore
                        ? "At Restaurant Pickup Desk"
                        : isDispatched
                        ? "Delivering to customer"
                        : `${order.rider?.distance_meters || 450}m away`}
                    </span>
                  </div>

                  <span className="font-extrabold text-blue-700 dark:text-blue-400">
                    {isAtStore ? "0 min" : isDispatched ? "ETA ~12m" : `ETA ${order.rider?.eta_minutes || 3} mins`}
                  </span>
                </div>

                {/* Items & Amount */}
                <div className="flex items-center justify-between text-xs pt-1 border-t">
                  <span className="text-gray-500 font-medium">
                    {order.items.length} Items ({order.customer_name})
                  </span>
                  <span className="font-extrabold text-emerald-600 text-sm">
                    ₹{order.total_amount}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {!isDispatched ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handoverFood(order.id)}
                        className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 text-white font-bold text-xs gap-1.5 shadow-md"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Handover Food
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => delayOrder({ orderId: order.id, extraMinutes: 5 })}
                        className="rounded-2xl text-xs font-semibold gap-1 text-amber-700 border-amber-200 hover:bg-amber-50"
                      >
                        <Hourglass className="h-3.5 w-3.5" />
                        +5m Delay
                      </Button>
                    </>
                  ) : (
                    <div className="col-span-2 text-center py-2 text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center justify-center gap-1.5 bg-purple-50 dark:bg-purple-950/40 rounded-2xl">
                      <ShieldCheck className="h-4 w-4" /> Dispatched & Discharged
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
