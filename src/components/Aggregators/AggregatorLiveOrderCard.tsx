import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  CheckCircle2,
  Bike,
  Phone,
  AlertCircle,
  XCircle,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { AggregatorOrder } from "@/types/aggregators";
import { formatDistanceToNow } from "date-fns";

interface AggregatorLiveOrderCardProps {
  order: AggregatorOrder;
  onAction: (params: {
    orderId?: string;
    aggregatorOrderId: string;
    action: "accept" | "food_ready" | "reject";
    prepTime?: number;
    reason?: string;
  }) => void;
  isUpdating?: boolean;
}

const PROVIDER_THEMES = {
  swiggy: {
    bg: "bg-orange-500",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-200 dark:border-orange-900/40",
    badge: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
    name: "SWIGGY",
  },
  zomato: {
    bg: "bg-rose-600",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-900/40",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
    name: "ZOMATO",
  },
  magicpin: {
    bg: "bg-blue-600",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-900/40",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    name: "MAGICPIN",
  },
  urbanpiper: {
    bg: "bg-purple-600",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-900/40",
    badge: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
    name: "URBANPIPER",
  },
  ondc: {
    bg: "bg-emerald-600",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-900/40",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    name: "ONDC",
  },
};

export const AggregatorLiveOrderCard: React.FC<AggregatorLiveOrderCardProps> = ({
  order,
  onAction,
  isUpdating,
}) => {
  const theme = PROVIDER_THEMES[order.provider] || PROVIDER_THEMES.swiggy;
  const isPending = order.channel_status === "placed";
  const isPreparing = order.channel_status === "preparing" || order.channel_status === "acknowledged";
  const isReady = order.channel_status === "food_ready";
  const isDispatched = order.channel_status === "dispatched";

  return (
    <Card className={`rounded-3xl border-2 overflow-hidden shadow-lg transition-all ${theme.border} bg-white dark:bg-gray-800`}>
      {/* Top Banner with Provider Badge & Time */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Badge className={`font-bold px-2.5 py-0.5 rounded-lg ${theme.badge}`}>
            {theme.name}
          </Badge>
          <span className="font-bold text-gray-900 dark:text-white text-sm">
            #{order.display_order_id}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <Clock className="h-3.5 w-3.5" />
          <span>
            {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>

      <CardContent className="p-5 space-y-4">
        {/* Customer & Amount */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-base">
              {order.customer_name}
            </p>
            {order.customer_phone && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {order.customer_phone}
              </p>
            )}
          </div>

          <div className="text-right">
            <p className="text-lg font-extrabold text-gray-900 dark:text-white">
              ₹{order.gross_amount.toFixed(0)}
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              Net Payout: ₹{order.net_payout.toFixed(0)}
            </p>
          </div>
        </div>

        {/* Order Items List */}
        <div className="space-y-2 py-2 border-t border-b border-gray-100 dark:border-gray-700/60">
          {order.items?.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-300">
                  {item.quantity}
                </span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {item.name}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                ₹{(item.price * item.quantity).toFixed(0)}
              </span>
            </div>
          ))}
        </div>

        {/* Rider Status & OTP */}
        {order.rider_name ? (
          <div className="flex items-center justify-between bg-blue-50/60 dark:bg-blue-950/30 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/40 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-500 text-white rounded-xl">
                <Bike className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  Rider: {order.rider_name}
                </p>
                <p className="text-gray-500 dark:text-gray-400">
                  Status: {order.rider_status?.replace(/_/g, " ") || "Assigned"}
                </p>
              </div>
            </div>

            {order.otp && (
              <div className="text-right">
                <span className="text-[10px] text-gray-400 block">HANDOVER OTP</span>
                <Badge variant="outline" className="font-mono text-sm font-bold tracking-wider">
                  {order.otp}
                </Badge>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 dark:bg-gray-900/40 p-2.5 rounded-xl">
            <Bike className="h-4 w-4" />
            <span>Waiting for delivery platform to assign rider...</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-2 flex items-center gap-2">
          {isPending && (
            <>
              <Button
                size="sm"
                onClick={() =>
                  onAction({
                    orderId: order.order_id,
                    aggregatorOrderId: order.aggregator_order_id,
                    action: "accept",
                    prepTime: 15,
                  })
                }
                disabled={isUpdating}
                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-xs shadow-md"
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Accept (15 Mins)
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  onAction({
                    orderId: order.order_id,
                    aggregatorOrderId: order.aggregator_order_id,
                    action: "reject",
                    reason: "Kitchen Overloaded",
                  })
                }
                disabled={isUpdating}
                className="rounded-xl border-red-200 hover:bg-red-50 text-red-600 dark:border-red-900 text-xs font-semibold"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </>
          )}

          {isPreparing && (
            <Button
              size="sm"
              onClick={() =>
                onAction({
                  orderId: order.order_id,
                  aggregatorOrderId: order.aggregator_order_id,
                  action: "food_ready",
                })
              }
              disabled={isUpdating}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-xs shadow-md"
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              Mark Food Ready (Alert Rider)
            </Button>
          )}

          {isReady && (
            <div className="w-full text-center p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-700 dark:text-emerald-400 font-semibold text-xs flex items-center justify-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Food Packed & Ready for Pickup
            </div>
          )}

          {isDispatched && (
            <div className="w-full text-center p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 text-blue-700 dark:text-blue-400 font-semibold text-xs flex items-center justify-center gap-1.5">
              <Bike className="h-4 w-4" />
              Out for Delivery with Rider
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
