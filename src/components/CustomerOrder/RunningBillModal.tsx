import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Receipt,
  Utensils,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  QrCode,
  BellRing,
} from "lucide-react";
import { DynamicUPIQRCode } from "./DynamicUPIQRCode";

export interface ActiveTableOrder {
  id: string;
  status: string;
  total: number;
  items: string[] | any[];
  created_at: string;
}

interface RunningBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableName: string;
  entityType?: "table" | "room";
  restaurantName: string;
  activeOrders: ActiveTableOrder[];
  runningTotal: number;
  upiPaymentData?: {
    upiId: string;
    payeeName: string;
  } | null;
  onAddMoreItems: () => void;
  onRequestBill: () => void;
}

export const RunningBillModal: React.FC<RunningBillModalProps> = ({
  isOpen,
  onClose,
  tableName,
  entityType = "table",
  restaurantName,
  activeOrders,
  runningTotal,
  upiPaymentData,
  onAddMoreItems,
  onRequestBill,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
      case "new":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/30 text-[10px]">
            <Clock className="w-3 h-3 mr-1 animate-spin" /> In Queue
          </Badge>
        );
      case "preparing":
      case "confirmed":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border border-blue-500/30 text-[10px]">
            <Utensils className="w-3 h-3 mr-1" /> Cooking
          </Badge>
        );
      case "ready":
      case "served":
      case "completed":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-[10px]">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Served
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {status}
          </Badge>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-white dark:bg-stone-900 border-0 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Table {tableName} Bill
                </DialogTitle>
                <DialogDescription className="text-xs text-stone-500">
                  {restaurantName} • Active running tab
                </DialogDescription>
              </div>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 text-[11px] font-bold">
              Active Tab
            </Badge>
          </div>
        </DialogHeader>

        {activeOrders.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="text-5xl">🍽️</div>
            <h4 className="font-bold text-stone-900 dark:text-white">
              No Active Orders Yet
            </h4>
            <p className="text-xs text-stone-500 max-w-xs mx-auto">
              Your table currently has no orders in progress. Browse our menu to start ordering!
            </p>
            <Button
              onClick={() => {
                onClose();
                onAddMoreItems();
              }}
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl text-xs font-bold py-5"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Start Order
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Orders list */}
            <div className="space-y-3">
              {activeOrders.map((order, idx) => (
                <div
                  key={order.id || idx}
                  className="rounded-2xl border border-stone-200 dark:border-stone-800 p-3.5 bg-stone-50/50 dark:bg-stone-800/40 space-y-2.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-700 dark:text-stone-300">
                      Order #{order.id.slice(-5).toUpperCase()}
                    </span>
                    {getStatusBadge(order.status)}
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {Array.isArray(order.items) &&
                      order.items.map((it: any, i: number) => {
                        const itemStr =
                          typeof it === "string"
                            ? it
                            : `${it.quantity || 1}x ${it.name || "Item"}`;
                        return (
                          <div
                            key={i}
                            className="flex items-center justify-between text-stone-600 dark:text-stone-400"
                          >
                            <span>{itemStr}</span>
                            {it.price && (
                              <span className="font-semibold">
                                ₹{(it.price * (it.quantity || 1)).toFixed(2)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  <div className="pt-2 border-t border-dashed border-stone-200 dark:border-stone-700 flex justify-between items-center text-xs">
                    <span className="text-stone-500">Sub-Order Total</span>
                    <span className="font-bold text-stone-900 dark:text-white">
                      ₹{Number(order.total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bill Summary */}
            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 space-y-2">
              <div className="flex justify-between items-center text-xs text-stone-600 dark:text-stone-400">
                <span>Items Placed Total</span>
                <span className="font-bold">₹{runningTotal.toFixed(2)}</span>
              </div>
              <Separator className="bg-amber-500/20" />
              <div className="flex justify-between items-center">
                <span className="font-black text-sm text-stone-900 dark:text-white">
                  Grand Running Total
                </span>
                <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                  ₹{runningTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => {
                  onClose();
                  onAddMoreItems();
                }}
                className="rounded-2xl py-5 text-xs font-bold border-stone-300 dark:border-stone-700"
              >
                <Plus className="w-3.5 h-3.5 mr-1 text-amber-500" />
                Add More Items
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  onClose();
                  onRequestBill();
                }}
                className="rounded-2xl py-5 text-xs font-bold border-stone-300 dark:border-stone-700"
              >
                <Receipt className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                Request Bill
              </Button>
            </div>

            {/* Instant UPI Payment Section - only when configured */}
            {runningTotal > 0 && upiPaymentData?.upiId && (
              <div className="pt-2">
                <DynamicUPIQRCode
                  amount={runningTotal}
                  upiId={upiPaymentData.upiId}
                  payeeName={upiPaymentData.payeeName || restaurantName}
                  orderNumber={`TAB-${tableName}`}
                  tableName={tableName}
                />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
