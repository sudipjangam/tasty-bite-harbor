import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Users,
  Flame,
  Scissors,
  ArrowRightLeft,
  Printer,
  ShoppingCart,
  CheckCircle2,
  AlertOctagon,
  Sparkles,
  Utensils,
} from "lucide-react";
import { FloorTable, TableOccupancyStatus } from "@/types/tableFloorPlan";
import { useNavigate } from "react-router-dom";

interface TableActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: FloorTable | null;
  onOpenSplitBill: () => void;
  onOpenMergeTransfer: () => void;
  onFireCourse: (course: "Mains" | "Dessert" | "Starters") => void;
  onSetStatus: (status: TableOccupancyStatus) => void;
}

const STATUS_BADGES = {
  available: { label: "Available", bg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  seated: { label: "Seated (Ordering)", bg: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" },
  served: { label: "Food Served (Dining)", bg: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300" },
  billed: { label: "Bill Presented", bg: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300" },
  reserved: { label: "Reserved", bg: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  dirty: { label: "Needs Bus / Clean", bg: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
};

export const TableActionModal: React.FC<TableActionModalProps> = ({
  isOpen,
  onClose,
  table,
  onOpenSplitBill,
  onOpenMergeTransfer,
  onFireCourse,
  onSetStatus,
}) => {
  const navigate = useNavigate();
  if (!table) return null;

  const order = table.activeOrder;
  const statusInfo = STATUS_BADGES[table.status] || STATUS_BADGES.available;
  const elapsed = table.occupiedMinutes || 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg rounded-3xl p-6 space-y-4">
        {/* Header with Table Name & Status */}
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-lg shadow-md">
                {table.name}
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  Table {table.name}
                </DialogTitle>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {table.capacity} Pax
                  </span>
                  <span>•</span>
                  <span>{table.section}</span>
                </div>
              </div>
            </div>

            <Badge className={`font-bold px-3 py-1 rounded-xl text-xs ${statusInfo.bg}`}>
              {statusInfo.label}
            </Badge>
          </div>
        </DialogHeader>

        {/* Turn Time & Course Status */}
        {table.status !== "available" && (
          <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-700 text-xs">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl text-white ${elapsed > 60 ? "bg-red-500" : elapsed > 30 ? "bg-amber-500" : "bg-emerald-500"}`}>
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block">TABLE TURN TIME</span>
                <span className="font-bold text-sm text-gray-900 dark:text-white">{elapsed} mins elapsed</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-orange-500 text-white">
                <Utensils className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block">RUNNING TOTAL</span>
                <span className="font-bold text-sm text-emerald-600">₹{order?.total || 0}</span>
              </div>
            </div>
          </div>
        )}

        {/* Running Items List */}
        {order?.items && order.items.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
              <span>Running Items ({order.items.length})</span>
              <span>KOT Status</span>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {order.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs bg-white dark:bg-gray-900 p-2 rounded-xl border border-gray-100 dark:border-gray-800"
                >
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {item.quantity}x {item.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-500">₹{item.price * item.quantity}</span>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {item.status || "Kitchen"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 bg-gray-50 dark:bg-gray-900/30 rounded-2xl text-xs text-gray-400">
            Table is vacant. Tap "Punch POS Order" to seat guests.
          </div>
        )}

        {/* Course Firing Fast-Buttons */}
        {order && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-orange-500" /> Kitchen Course Firing:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onFireCourse("Starters")}
                className="rounded-xl text-xs h-8 font-semibold border-orange-200 hover:bg-orange-50 text-orange-700"
              >
                Fire Starters
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onFireCourse("Mains")}
                className="rounded-xl text-xs h-8 font-semibold border-red-200 hover:bg-red-50 text-red-700"
              >
                Fire Mains
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onFireCourse("Dessert")}
                className="rounded-xl text-xs h-8 font-semibold border-pink-200 hover:bg-pink-50 text-pink-700"
              >
                Fire Dessert
              </Button>
            </div>
          </div>
        )}

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
          <Button
            size="sm"
            onClick={() => {
              onClose();
              navigate(`/pos?table=${table.name}`);
            }}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs gap-1.5 shadow-sm"
          >
            <ShoppingCart className="h-4 w-4" />
            Punch POS Order
          </Button>

          {order ? (
            <Button
              size="sm"
              onClick={() => {
                onClose();
                onOpenSplitBill();
              }}
              className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs gap-1.5 shadow-sm"
            >
              <Scissors className="h-4 w-4" />
              Split Bill Check
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSetStatus("seated")}
              className="rounded-xl text-xs font-bold"
            >
              <Users className="h-4 w-4 mr-1" />
              Seat Walk-in Guests
            </Button>
          )}

          {order && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onClose();
                onOpenMergeTransfer();
              }}
              className="rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300"
            >
              <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
              Transfer / Merge
            </Button>
          )}

          {table.status === "dirty" || table.status !== "available" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSetStatus("available")}
              className="rounded-xl text-xs font-semibold text-emerald-600 border-emerald-200 hover:bg-emerald-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Mark Clean & Available
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};
