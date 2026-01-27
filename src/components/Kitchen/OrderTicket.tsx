import { useState } from "react";
import { formatDistanceToNow, differenceInMinutes } from "date-fns";
import {
  Check,
  ChevronRight,
  Clock,
  Play,
  CheckCircle2,
  Timer,
  Star,
  Zap,
  AlertTriangle,
  Archive,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { KitchenOrder } from "./KitchenDisplay";

interface OrderTicketProps {
  order: KitchenOrder;
  onStatusUpdate: (orderId: string, status: KitchenOrder["status"]) => void;
  onBumpOrder: (orderId: string) => void;
  onItemComplete: (
    orderId: string,
    itemIndex: number,
    completed: boolean,
  ) => void;
  onPriorityChange?: (
    orderId: string,
    priority: KitchenOrder["priority"],
  ) => void;
  isLate: boolean;
  isCompact?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: (orderId: string) => void;
}

const OrderTicket = ({
  order,
  onStatusUpdate,
  onBumpOrder,
  onItemComplete,
  onPriorityChange,
  isLate,
  isCompact = false,
  isExpanded = true,
  onToggleExpand,
}: OrderTicketProps) => {
  // Use persisted completion status from database
  const completedItems = new Set(
    (order.item_completion_status || [])
      .map((completed, idx) => (completed ? idx : -1))
      .filter((idx) => idx !== -1),
  );

  const orderAge = formatDistanceToNow(new Date(order.created_at), {
    addSuffix: true,
  });
  const minutesSinceCreation = differenceInMinutes(
    new Date(),
    new Date(order.created_at),
  );

  const getNextStatus = (): KitchenOrder["status"] => {
    switch (order.status) {
      case "new":
        return "preparing";
      case "preparing":
        return "ready";
      default:
        return "ready";
    }
  };

  const getStatusStyles = () => {
    switch (order.status) {
      case "new":
        return {
          border: isLate
            ? "border-l-4 border-red-500"
            : "border-l-4 border-amber-500",
          statusBadge: isLate
            ? "bg-gradient-to-r from-red-500 to-rose-500 text-white"
            : "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
          button:
            "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white",
          icon: <Play className="w-4 h-4" />,
        };
      case "preparing":
        return {
          border: isLate
            ? "border-l-4 border-red-500"
            : "border-l-4 border-blue-500",
          statusBadge: isLate
            ? "bg-gradient-to-r from-red-500 to-rose-500 text-white"
            : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white",
          button:
            "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white",
          icon: <CheckCircle2 className="w-4 h-4" />,
        };
      case "ready":
        return {
          border: "border-l-4 border-green-500",
          statusBadge:
            "bg-gradient-to-r from-green-500 to-emerald-500 text-white",
          button:
            "bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white",
          icon: <Archive className="w-4 h-4" />,
        };
      default:
        return {
          border: "border-l-4 border-gray-500",
          statusBadge: "bg-gray-500 text-white",
          button: "bg-gray-300 text-gray-500",
          icon: <Clock className="w-4 h-4" />,
        };
    }
  };

  const toggleItemComplete = (index: number) => {
    const newCompleted = !completedItems.has(index);
    onItemComplete(order.id, index, newCompleted);
  };

  const getPriorityBadge = () => {
    switch (order.priority) {
      case "vip":
        return (
          <Badge className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold shadow-lg animate-pulse">
            <Star className="w-3 h-3 mr-1 fill-current" />
            VIP
          </Badge>
        );
      case "rush":
        return (
          <Badge className="bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold shadow-lg">
            <Zap className="w-3 h-3 mr-1" />
            RUSH
          </Badge>
        );
      default:
        return null;
    }
  };

  const getOrderTypeBadge = () => {
    if (!order.order_type || order.order_type === "dine_in") return null;

    const typeLabels = {
      takeaway: "Takeaway",
      delivery: "Delivery",
      room_service: "Room Service",
    };

    return (
      <Badge
        variant="outline"
        className="text-xs dark:border-gray-600 dark:text-gray-300"
      >
        {typeLabels[order.order_type]}
      </Badge>
    );
  };

  const styles = getStatusStyles();
  const completionPercentage =
    order.items.length > 0
      ? (completedItems.size / order.items.length) * 100
      : 0;

  return (
    <Card
      className={`${styles.border} hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden`}
    >
      <div className="p-6">
        {/* Order Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {getPriorityBadge()}
              {isLate && (
                <Badge className="bg-red-500 text-white font-bold animate-pulse">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  LATE
                </Badge>
              )}
              <div
                className={`px-3 py-1 rounded-full text-sm font-semibold ${styles.statusBadge} shadow-lg`}
              >
                {order.status.toUpperCase()}
              </div>
              {getOrderTypeBadge()}
              {order.station && (
                <Badge
                  variant="secondary"
                  className="text-xs dark:bg-gray-700 dark:text-gray-200"
                >
                  📍 {order.station}
                </Badge>
              )}
            </div>

            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {order.source}
            </h3>

            {/* Customer & Server Info */}
            {(order.customer_name || order.server_name) && (
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {order.customer_name && (
                  <span>Customer: {order.customer_name}</span>
                )}
                {order.customer_name && order.server_name && (
                  <span className="mx-2">•</span>
                )}
                {order.server_name && <span>Server: {order.server_name}</span>}
              </div>
            )}

            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 gap-4 mt-2">
              <div
                className={`flex items-center gap-1 ${
                  isLate ? "text-red-500 dark:text-red-400 font-semibold" : ""
                }`}
              >
                <Timer className="w-4 h-4" />
                <span>{orderAge}</span>
                {minutesSinceCreation > 0 && (
                  <span className="text-xs">({minutesSinceCreation}m)</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <span>
                  {completedItems.size}/{order.items.length} items
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-3 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ease-out ${
                  completionPercentage === 100
                    ? "bg-gradient-to-r from-green-400 to-green-500"
                    : "bg-gradient-to-r from-blue-400 to-indigo-500"
                }`}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 ml-4">
            {order.status !== "ready" ? (
              <Button
                className={`rounded-xl font-semibold px-6 py-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 ${styles.button}`}
                onClick={() => onStatusUpdate(order.id, getNextStatus())}
              >
                <div className="flex items-center gap-2">
                  {styles.icon}
                  {order.status === "new" ? "Start" : "Ready"}
                </div>
              </Button>
            ) : (
              <Button
                className={`rounded-xl font-semibold px-6 py-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 ${styles.button}`}
                onClick={() => onBumpOrder(order.id)}
              >
                <div className="flex items-center gap-2">
                  <Archive className="w-4 h-4" />
                  Bump
                </div>
              </Button>
            )}

            {/* Priority Selector */}
            {onPriorityChange && (
              <Select
                value={order.priority}
                onValueChange={(value) =>
                  onPriorityChange(order.id, value as KitchenOrder["priority"])
                }
              >
                <SelectTrigger className="rounded-xl border-2 bg-white/80 dark:bg-gray-700/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vip">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-purple-600 fill-current" />
                      <span className="font-semibold">VIP</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="rush">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-orange-600" />
                      <span className="font-semibold">RUSH</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="normal">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span>Normal</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Compact mode: show expand/collapse toggle */}
        {isCompact && (
          <div className="mt-3 mb-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand?.(order.id);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Collapse Items
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show {order.items.length} Items
                </>
              )}
            </button>
          </div>
        )}

        {/* Order Items - only show if expanded (or not in compact mode) */}
        {(!isCompact || isExpanded) && (
          <div className="space-y-3">
            {order.items.map((item, index) => {
              const isCompleted = completedItems.has(index);
              const hasAllergy =
                item.has_allergy ||
                (item.notes &&
                  item.notes.some((note) =>
                    /allerg|gluten|dairy|nut|vegan|vegetarian/i.test(note),
                  ));

              return (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                    isCompleted
                      ? "bg-green-50 dark:bg-green-900/30 border-2 border-green-200 dark:border-green-700"
                      : hasAllergy
                        ? "bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border-2 border-red-300 dark:border-red-700"
                        : "bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                  }`}
                  onClick={() => toggleItemComplete(index)}
                >
                  <div className="flex-1 min-w-0">
                    <div
                      className={`font-semibold text-lg ${
                        isCompleted
                          ? "line-through text-gray-500 dark:text-gray-400"
                          : "text-gray-800 dark:text-gray-100"
                      }`}
                    >
                      <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-bold mr-2">
                        {item.quantity}x
                      </span>
                      {item.name}
                      {hasAllergy && !isCompleted && (
                        <span className="ml-2 text-red-500">⚠️</span>
                      )}
                    </div>
                    {item.notes && item.notes.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {item.notes.map((note, noteIndex) => {
                          const isAllergyNote =
                            /allerg|gluten|dairy|nut|vegan|vegetarian/i.test(
                              note,
                            );
                          return (
                            <div
                              key={noteIndex}
                              className={`text-sm p-2 rounded-lg ${
                                isCompleted
                                  ? "text-gray-400 dark:text-gray-500 bg-green-100 dark:bg-green-900/50"
                                  : isAllergyNote
                                    ? "text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-600 font-semibold"
                                    : "text-gray-600 dark:text-gray-300 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700"
                              }`}
                            >
                              <span className="font-medium">
                                {isAllergyNote ? "⚠️ ALLERGY:" : "Note:"}
                              </span>{" "}
                              {note}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 ${
                      isCompleted
                        ? "bg-green-500 text-white shadow-lg"
                        : "bg-white dark:bg-gray-600 border-2 border-gray-300 dark:border-gray-500 text-gray-400 dark:text-gray-300 hover:border-green-400 dark:hover:border-green-500"
                    }`}
                  >
                    {isCompleted && <Check className="w-5 h-5" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
};

export default OrderTicket;
