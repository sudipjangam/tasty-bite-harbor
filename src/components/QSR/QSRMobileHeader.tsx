import React, { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  LayoutGrid,
  MoreVertical,
  Printer,
  PrinterCheck,
  RefreshCw,
  History,
  Receipt,
  TrendingUp,
  HelpCircle,
  Zap,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QSROrderMode } from "@/types/qsr";
import { formatIndianCurrency } from "@/utils/formatters";
import HelpProvider from "@/components/Help/HelpProvider";

interface QSRMobileHeaderProps {
  restaurantName?: string;
  orderMode: QSROrderMode;
  selectedTableName?: string | null;
  activeOrdersCount: number;
  todaysRevenue: number;
  isPrinterConnected: boolean;
  isReconnecting: boolean;
  printerName?: string | null;
  onBackToTables: () => void;
  onRefreshTables: () => void;
  onOpenActiveOrders: () => void;
  onOpenPastOrders: () => void;
  onPrinterToggle: () => void;
  /** Compact mode selector rendered in row 2 */
  children: React.ReactNode;
}

export const QSRMobileHeader: React.FC<QSRMobileHeaderProps> = ({
  restaurantName,
  orderMode,
  selectedTableName,
  activeOrdersCount,
  todaysRevenue,
  isPrinterConnected,
  isReconnecting,
  printerName,
  onBackToTables,
  onRefreshTables,
  onOpenActiveOrders,
  onOpenPastOrders,
  onPrinterToggle,
  children,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const showBackBtn = orderMode === "dine_in" && !!selectedTableName;
  const title =
    orderMode === "dine_in" && selectedTableName
      ? `Table ${selectedTableName}`
      : "QSR POS";

  return (
    <div className="flex-shrink-0 sticky top-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 shadow-sm">
      {/* ─── Row 1: compact title bar ─── */}
      <div className="flex items-center gap-2 px-3 py-2 h-14">
        {/* Left: back button or logo icon */}
        {showBackBtn ? (
          <button
            onClick={onBackToTables}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 touch-manipulation active:scale-95 transition-transform"
            aria-label="Back to tables"
          >
            <ArrowLeft className="w-4 h-4" />
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        ) : (
          <Zap className="w-5 h-5 text-indigo-500 flex-shrink-0" />
        )}

        {/* Center: restaurant name + title */}
        <div className="flex-1 min-w-0">
          {restaurantName && (
            <p className="text-[9px] font-semibold tracking-widest uppercase text-muted-foreground leading-none mb-0.5 truncate">
              {restaurantName}
            </p>
          )}
          <h1 className="text-base font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent leading-tight truncate">
            {title}
          </h1>
        </div>

        {/* Right: active-orders quick badge + kebab */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Active orders one-tap shortcut */}
          <button
            onClick={onOpenActiveOrders}
            className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 touch-manipulation active:scale-95 transition-transform"
            aria-label="Active orders"
          >
            <History className="w-[18px] h-[18px]" />
            {activeOrdersCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-md">
                {activeOrdersCount > 99 ? "99+" : activeOrdersCount}
              </span>
            )}
          </button>

          {/* Kebab (⋮) menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className={cn(
                "flex items-center justify-center w-9 h-9 rounded-xl touch-manipulation active:scale-95 transition-transform",
                menuOpen
                  ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
              )}
              aria-label="More actions"
            >
              {menuOpen ? <X className="w-4 h-4" /> : <MoreVertical className="w-4 h-4" />}
            </button>

            {/* Dropdown sheet */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                {/* Revenue header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500">
                  <TrendingUp className="w-4 h-4 text-white flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-medium text-white/80 uppercase tracking-wide leading-none">
                      Today's Revenue
                    </p>
                    <p className="text-sm font-bold text-white mt-0.5">
                      {formatIndianCurrency(todaysRevenue).formatted}
                    </p>
                  </div>
                </div>

                <div className="p-1.5 space-y-0.5">
                  {/* Active Orders */}
                  <MenuRow
                    icon={<History className="w-4 h-4 text-orange-600 dark:text-orange-400" />}
                    iconBg="bg-orange-100 dark:bg-orange-900/40"
                    label="Active Orders"
                    badge={activeOrdersCount > 0 ? activeOrdersCount : undefined}
                    onClick={() => { setMenuOpen(false); onOpenActiveOrders(); }}
                  />

                  {/* Past Orders */}
                  <MenuRow
                    icon={<Receipt className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                    iconBg="bg-indigo-100 dark:bg-indigo-900/40"
                    label="Past Orders"
                    onClick={() => { setMenuOpen(false); onOpenPastOrders(); }}
                  />

                  {/* Printer */}
                  <MenuRow
                    icon={
                      isPrinterConnected
                        ? <PrinterCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                        : <Printer className={cn("w-4 h-4", isReconnecting ? "animate-pulse text-amber-500" : "text-gray-500")} />
                    }
                    iconBg={isPrinterConnected ? "bg-green-100 dark:bg-green-900/40" : "bg-gray-100 dark:bg-gray-800"}
                    label={
                      isPrinterConnected
                        ? "Disconnect Printer"
                        : isReconnecting
                        ? "Reconnecting…"
                        : "Connect Printer"
                    }
                    sublabel={isPrinterConnected && printerName ? printerName : undefined}
                    statusDot={isPrinterConnected ? "green" : undefined}
                    onClick={() => { setMenuOpen(false); onPrinterToggle(); }}
                  />

                  {/* Refresh Tables */}
                  <MenuRow
                    icon={<RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                    iconBg="bg-blue-100 dark:bg-blue-900/40"
                    label="Refresh Tables"
                    onClick={() => { setMenuOpen(false); onRefreshTables(); }}
                  />

                  {/* Help — wrap HelpProvider so it opens in its own trigger */}
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                      <HelpCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0" onClick={() => setMenuOpen(false)}>
                      <HelpProvider />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Row 2: mode selector (compact pill slot) ─── */}
      <div className="px-3 pb-2">
        {children}
      </div>
    </div>
  );
};

// ─── Small helper for menu rows ───────────────────────────────────────────────
interface MenuRowProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  sublabel?: string;
  badge?: number;
  statusDot?: "green" | "red";
  onClick: () => void;
}
const MenuRow: React.FC<MenuRowProps> = ({ icon, iconBg, label, sublabel, badge, statusDot, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-left touch-manipulation transition-colors"
  >
    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", iconBg)}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 block">{label}</span>
      {sublabel && <span className="text-[10px] text-gray-400 truncate block">{sublabel}</span>}
    </div>
    {badge !== undefined && (
      <span className="px-2 py-0.5 text-xs bg-orange-500 text-white rounded-full font-semibold flex-shrink-0">
        {badge}
      </span>
    )}
    {statusDot && (
      <span className={cn(
        "w-2 h-2 rounded-full flex-shrink-0",
        statusDot === "green" ? "bg-green-500" : "bg-red-500"
      )} />
    )}
  </button>
);

export default QSRMobileHeader;
