import React from "react";
import {
  Users,
  ShoppingBag,
  RefreshCw,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QSRTable } from "@/types/qsr";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface QSRTableGridProps {
  tables: QSRTable[];
  selectedTableId: string | null;
  onSelectTable: (table: QSRTable) => void;
  isLoading?: boolean;
  onRetry?: () => void;
}

export const QSRTableGrid: React.FC<QSRTableGridProps> = ({
  tables,
  selectedTableId,
  onSelectTable,
  isLoading = false,
  onRetry,
}) => {
  if (isLoading) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
          Select Table
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Helper: Calculate elapsed time from order creation
  const getElapsedTime = (createdAt: string): string => {
    const mins = Math.floor(
      (Date.now() - new Date(createdAt).getTime()) / 60000
    );
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  // Helper: Check if order is late (>30 min without activity)
  const isLateOrder = (lastActivity?: string): boolean => {
    if (!lastActivity) return false;
    return Date.now() - new Date(lastActivity).getTime() > 30 * 60 * 1000;
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
        Select Table
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {tables.map((table) => {
          const isSelected = selectedTableId === table.id;
          const isOccupied = table.status === "occupied";
          const isAvailable = table.status === "available";
          const isLate = isOccupied && isLateOrder(table.lastActivityAt);

          return (
            <button
              key={table.id}
              onClick={() => onSelectTable(table)}
              className={cn(
                "relative p-4 rounded-xl border-2 transition-all duration-200 touch-manipulation",
                "flex flex-col items-center justify-center gap-1 min-h-[100px]",
                isSelected && "ring-2 ring-offset-2 ring-blue-500",
                isAvailable &&
                  !isSelected &&
                  "bg-gradient-to-br from-green-100 to-emerald-200 border-green-400 dark:from-green-800/50 dark:to-emerald-800/50 dark:border-green-500 hover:shadow-lg hover:shadow-green-300/60 hover:scale-[1.02]",
                isOccupied &&
                  !isSelected &&
                  !isLate &&
                  "bg-gradient-to-br from-amber-100 to-orange-200 border-amber-400 dark:from-amber-800/50 dark:to-orange-800/50 dark:border-amber-500 hover:shadow-lg hover:shadow-amber-300/60 hover:scale-[1.02]",
                isOccupied &&
                  !isSelected &&
                  isLate &&
                  "bg-gradient-to-br from-red-100 to-red-200 border-red-400 dark:from-red-800/50 dark:to-red-800/50 dark:border-red-500 hover:shadow-lg hover:shadow-red-300/60 hover:scale-[1.02]",
                isSelected &&
                  "bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-400 dark:from-blue-900/30 dark:to-indigo-900/30 dark:border-blue-600 shadow-lg shadow-blue-200/50"
              )}
            >
              {/* Table Name */}
              <span
                className={cn(
                  "text-lg font-bold",
                  isAvailable && "text-green-700 dark:text-green-400",
                  isOccupied &&
                    !isLate &&
                    "text-orange-700 dark:text-orange-400",
                  isOccupied && isLate && "text-red-700 dark:text-red-400",
                  isSelected && "text-blue-700 dark:text-blue-400"
                )}
              >
                {table.name}
              </span>

              {/* Capacity */}
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Users className="w-3 h-3" />
                <span>{table.capacity}</span>
              </div>

              {/* Status */}
              <span
                className={cn(
                  "text-[10px] font-medium uppercase tracking-wide mt-1",
                  isAvailable && "text-green-600 dark:text-green-500",
                  isOccupied &&
                    !isLate &&
                    "text-orange-600 dark:text-orange-500",
                  isOccupied && isLate && "text-red-600 dark:text-red-500",
                  isSelected && "text-blue-600 dark:text-blue-500"
                )}
              >
                {isSelected ? "SELECTED" : table.status.toUpperCase()}
              </span>

              {/* Order Timing - Shows elapsed time for occupied tables */}
              {isOccupied && table.orderCreatedAt && (
                <div
                  className={cn(
                    "flex items-center gap-1 text-[10px] font-medium mt-0.5",
                    isLate
                      ? "text-red-600 animate-pulse"
                      : "text-orange-600 dark:text-orange-500"
                  )}
                >
                  <Clock className="w-3 h-3" />
                  <span>{getElapsedTime(table.orderCreatedAt)}</span>
                  {isLate && (
                    <>
                      <AlertTriangle className="w-3 h-3 ml-1" />
                      <span>LATE</span>
                    </>
                  )}
                </div>
              )}

              {/* Active Order Info */}
              {isOccupied &&
                table.activeOrderTotal &&
                table.activeOrderTotal > 0 && (
                  <div
                    className={cn(
                      "absolute -top-2 -right-2 flex items-center gap-1 text-white text-xs px-2 py-0.5 rounded-full shadow-md",
                      isLate ? "bg-red-500" : "bg-orange-500"
                    )}
                  >
                    <ShoppingBag className="w-3 h-3" />
                    <CurrencyDisplay
                      amount={table.activeOrderTotal}
                      showTooltip={false}
                      className="text-white text-xs"
                    />
                  </div>
                )}
            </button>
          );
        })}
      </div>

      {tables.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No tables found</p>
          <p className="text-sm mb-4">
            Tables may still be loading or none are configured
          </p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Tables
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
