import React from "react";
import { Users, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { QSRTable } from "@/types/qsr";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { Skeleton } from "@/components/ui/skeleton";

interface QSRTableGridProps {
  tables: QSRTable[];
  selectedTableId: string | null;
  onSelectTable: (table: QSRTable) => void;
  isLoading?: boolean;
}

export const QSRTableGrid: React.FC<QSRTableGridProps> = ({
  tables,
  selectedTableId,
  onSelectTable,
  isLoading = false,
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
                  "bg-gradient-to-br from-amber-100 to-orange-200 border-amber-400 dark:from-amber-800/50 dark:to-orange-800/50 dark:border-amber-500 hover:shadow-lg hover:shadow-amber-300/60 hover:scale-[1.02]",
                isSelected &&
                  "bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-400 dark:from-blue-900/30 dark:to-indigo-900/30 dark:border-blue-600 shadow-lg shadow-blue-200/50"
              )}
            >
              {/* Table Name */}
              <span
                className={cn(
                  "text-lg font-bold",
                  isAvailable && "text-green-700 dark:text-green-400",
                  isOccupied && "text-orange-700 dark:text-orange-400",
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
                  isOccupied && "text-orange-600 dark:text-orange-500",
                  isSelected && "text-blue-600 dark:text-blue-500"
                )}
              >
                {isSelected ? "SELECTED" : table.status.toUpperCase()}
              </span>

              {/* Active Order Info */}
              {isOccupied &&
                table.activeOrderTotal &&
                table.activeOrderTotal > 0 && (
                  <div className="absolute -top-2 -right-2 flex items-center gap-1 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full shadow-md">
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
          <p className="font-medium">No tables configured</p>
          <p className="text-sm">Add tables in the Tables management section</p>
        </div>
      )}
    </div>
  );
};
