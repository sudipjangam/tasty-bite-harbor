import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { useRiderTracking } from "@/hooks/useRiderTracking";
import { AggregatorOrder } from "@/types/aggregators";

interface POSRiderTrackingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const PLATFORM_STYLES: Record<string, { bg: string; text: string; label: string; ring: string }> = {
  swiggy: { bg: "bg-orange-500", text: "text-orange-500", label: "Swiggy", ring: "border-orange-500" },
  zomato: { bg: "bg-red-500", text: "text-red-500", label: "Zomato", ring: "border-red-500" },
  ubereats: { bg: "bg-emerald-600", text: "text-emerald-600", label: "Uber Eats", ring: "border-emerald-500" },
  magicpin: { bg: "bg-purple-600", text: "text-purple-600", label: "magicpin", ring: "border-purple-500" },
  urbanpiper: { bg: "bg-blue-600", text: "text-blue-600", label: "UrbanPiper", ring: "border-blue-500" },
};

export const POSRiderTrackingDrawer: React.FC<POSRiderTrackingDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    orders,
    isLoading,
    ridersAtStore,
    ridersEnRoute,
    totalActiveRiders,
    handoverFood,
    delayOrder,
  } = useRiderTracking();

  const [activeTab, setActiveTab] = useState<"all" | "at_store" | "en_route" | "dispatched">("all");
  const [selectedOrder, setSelectedOrder] = useState<AggregatorOrder | null>(null);

  const filteredOrders = orders.filter((o) => {
    if (activeTab === "at_store") return o.rider?.status === "arrived_at_store" || o.status === "food_ready";
    if (activeTab === "en_route") return o.rider?.status === "assigned" || o.rider?.status === "approaching";
    if (activeTab === "dispatched") return o.status === "dispatched" || o.rider?.status === "picked_up";
    return true;
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg">
                <Bike className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
                  Live Aggregator Rider Tracking
                </DialogTitle>
                <p className="text-xs text-gray-500">
                  Swiggy, Zomato & UberEats delivery partners en-route & counter pickup
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {ridersAtStore.length > 0 && (
                <Badge className="bg-emerald-500 text-white font-bold animate-pulse text-xs px-2.5 py-1">
                  🚨 {ridersAtStore.length} At Counter
                </Badge>
              )}
              <Badge variant="outline" className="text-xs font-semibold">
                {totalActiveRiders} Active Orders
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Filters */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
          <TabsList className="grid grid-cols-4 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1">
            <TabsTrigger value="all" className="rounded-xl text-xs font-bold py-2">
              All ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="at_store" className="rounded-xl text-xs font-bold py-2 text-emerald-600 dark:text-emerald-400">
              At Counter ({ridersAtStore.length})
            </TabsTrigger>
            <TabsTrigger value="en_route" className="rounded-xl text-xs font-bold py-2 text-blue-600 dark:text-blue-400">
              En Route ({ridersEnRoute.length})
            </TabsTrigger>
            <TabsTrigger value="dispatched" className="rounded-xl text-xs font-bold py-2 text-purple-600 dark:text-purple-400">
              Dispatched ({orders.filter((o) => o.status === "dispatched").length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-3">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/40 rounded-3xl space-y-2 border border-dashed border-gray-200 dark:border-gray-700">
                <Bike className="h-10 w-10 text-gray-300 mx-auto" />
                <p className="text-sm font-semibold text-gray-500">No active delivery riders in this status</p>
                <p className="text-xs text-gray-400">Online orders from Swiggy, Zomato, and UberEats appear here live.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredOrders.map((order) => {
                  const platformConfig = PLATFORM_STYLES[order.platform] || PLATFORM_STYLES.swiggy;
                  const isAtStore = order.rider?.status === "arrived_at_store" || order.status === "food_ready";
                  const isDispatched = order.status === "dispatched" || order.rider?.status === "picked_up";

                  return (
                    <div
                      key={order.id}
                      className={`p-4 rounded-3xl border-2 transition-all space-y-3 bg-white dark:bg-gray-800 shadow-md ${
                        isAtStore
                          ? "border-emerald-500 ring-2 ring-emerald-400/30 bg-emerald-50/10"
                          : isDispatched
                          ? "border-purple-200 dark:border-purple-900/40 opacity-90"
                          : "border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      {/* Top Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-lg text-white font-extrabold text-[10px] uppercase shadow-xs ${platformConfig.bg}`}
                          >
                            {platformConfig.label}
                          </span>
                          <span className="font-mono font-bold text-xs text-gray-800 dark:text-gray-200">
                            #{order.platform_order_id.slice(-6)}
                          </span>
                        </div>

                        <Badge
                          className={`font-bold text-[10px] ${
                            isAtStore
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 animate-pulse"
                              : isDispatched
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          }`}
                        >
                          {isAtStore ? "🚨 RIDER AT COUNTER" : isDispatched ? "🚀 OUT FOR DELIVERY" : "🛵 EN ROUTE"}
                        </Badge>
                      </div>

                      {/* Rider Profile Card */}
                      <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                            <Bike className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-bold text-xs text-gray-900 dark:text-white">
                              {order.rider?.name || "Assigned Driver"}
                            </p>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {order.rider?.vehicle_number || "MH-12-XX-0000"}
                            </span>
                          </div>
                        </div>

                        {/* Call Rider Button */}
                        {order.rider?.phone && (
                          <a
                            href={`tel:${order.rider.phone}`}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold shadow-xs"
                          >
                            <Phone className="h-3 w-3" /> Call
                          </a>
                        )}
                      </div>

                      {/* Live Proximity & Items Summary */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                          <Navigation className="h-3.5 w-3.5 text-blue-500" />
                          <span className="font-semibold text-[11px]">
                            {isAtStore
                              ? "At Outlet Pickup Counter"
                              : isDispatched
                              ? "En route to customer (12m)"
                              : `${order.rider?.distance_meters || 450}m away • ETA ${order.rider?.eta_minutes || 3} mins`}
                          </span>
                        </div>

                        <span className="font-bold text-emerald-600 text-xs">₹{order.total_amount}</span>
                      </div>

                      {/* Items List */}
                      <div className="text-[11px] text-gray-500 bg-gray-50/60 dark:bg-gray-900/40 p-2 rounded-xl">
                        <span className="font-medium text-gray-700 dark:text-gray-300 block mb-0.5">
                          Order Items ({order.items.length}):
                        </span>
                        <p className="truncate">
                          {order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {!isDispatched ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handoverFood(order.id)}
                              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 text-white font-bold text-xs gap-1 shadow-sm"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Handover to Rider
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => delayOrder({ orderId: order.id, extraMinutes: 5 })}
                              className="rounded-xl text-xs font-semibold gap-1 text-amber-700 border-amber-200 hover:bg-amber-50"
                            >
                              <Hourglass className="h-3.5 w-3.5" />
                              +5m Delay Prep
                            </Button>
                          </>
                        ) : (
                          <div className="col-span-2 text-center py-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 flex items-center justify-center gap-1">
                            <ShieldCheck className="h-4 w-4" /> Dispatched & Handed Over
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
