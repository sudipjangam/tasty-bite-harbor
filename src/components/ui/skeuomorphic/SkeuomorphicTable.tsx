import React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Table2 } from "lucide-react";
import SwadeshiLoader from "@/styles/Loader/SwadeshiLoader";

export interface ColumnDef<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
  headerClassName?: string;
}

export interface SkeuomorphicTableProps<T> {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  filterControl?: React.ReactNode;
  rightAction?: React.ReactNode;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems?: number;
  };
  className?: string;
}

export function SkeuomorphicTable<T>({
  title,
  subtitle,
  icon,
  columns,
  data,
  keyExtractor,
  filterControl,
  rightAction,
  isLoading = false,
  emptyMessage = "No records found",
  onRowClick,
  pagination,
  className,
}: SkeuomorphicTableProps<T>) {
  return (
    <div className={cn("flex flex-col w-full space-y-4 select-none", className)}>
      
      {/* ─── Header & Top Filter Bar ─── */}
      {(title || filterControl || rightAction) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {icon ? (
              <div className="p-2 rounded-xl skeuo-circle">{icon}</div>
            ) : (
              <div className="p-2 rounded-xl skeuo-circle">
                <Table2 className="h-4 w-4 text-[#2E3192] dark:text-indigo-400" />
              </div>
            )}
            <div>
              {title && (
                <h3 className="font-black text-gray-900 dark:text-white text-base tracking-tight">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {filterControl}
            {rightAction}
          </div>
        </div>
      )}

      {/* ─── 3D Tactile Table Structure ─── */}
      <div className="overflow-x-auto rounded-2xl skeuo-card p-3 sm:p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <SwadeshiLoader
              loadingText="loading table"
              words={["orders", "data", "records"]}
              size={80}
            />
          </div>
        ) : !data || data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 text-xs font-semibold text-center">
            <div className="p-3 rounded-full skeuo-inset mb-2">
              <Table2 className="h-6 w-6 text-gray-300 dark:text-gray-600" />
            </div>
            {emptyMessage}
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            {/* Header Row */}
            <thead>
              <tr className="border-b border-gray-200/60 dark:border-gray-700/60">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "pb-3 px-3 text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500",
                      col.align === "center" && "text-center",
                      col.align === "right" && "text-right",
                      col.headerClassName
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body Rows with 3D Bevel Spacing */}
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {data.map((item, index) => {
                const key = keyExtractor(item, index);
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(item)}
                    className={cn(
                      "group transition-all duration-200 hover:bg-white/60 dark:hover:bg-slate-800/60 cursor-default",
                      onRowClick && "cursor-pointer hover:shadow-xs"
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={`${key}-${col.key}`}
                        className={cn(
                          "py-3.5 px-3 text-xs font-medium text-gray-800 dark:text-gray-200",
                          col.align === "center" && "text-center",
                          col.align === "right" && "text-right",
                          col.className
                        )}
                      >
                        {col.render
                          ? col.render(item, index)
                          : (item as any)[col.key] ?? "-"}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ─── Skeuomorphic Pagination Footer ─── */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-1 text-xs">
          <span className="text-gray-500 dark:text-gray-400 font-bold">
            Page {pagination.currentPage + 1} of {pagination.totalPages}
            {pagination.totalItems ? ` (${pagination.totalItems} records)` : ""}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.currentPage <= 0}
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              className="h-8 w-8 rounded-xl skeuo-btn flex items-center justify-center text-gray-600 dark:text-gray-300 disabled:opacity-40 disabled:pointer-events-none touch-manipulation active:scale-95 transition-all"
              title="Previous Page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              disabled={pagination.currentPage >= pagination.totalPages - 1}
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              className="h-8 w-8 rounded-xl skeuo-btn flex items-center justify-center text-gray-600 dark:text-gray-300 disabled:opacity-40 disabled:pointer-events-none touch-manipulation active:scale-95 transition-all"
              title="Next Page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SkeuomorphicTable;
