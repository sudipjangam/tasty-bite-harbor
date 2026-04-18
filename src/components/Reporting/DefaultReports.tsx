import React, { useState } from "react";
import {
  useReportsData,
  REPORT_CATEGORIES,
  getFilteredReportCategories,
  ReportCategory,
} from "@/hooks/useReportsData";
import { usePlanType } from "@/hooks/usePlanType";
import { FeatureLock } from "@/components/Auth/FeatureLock";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Download,
  ArrowLeft,
  AlertCircle,
  Calendar,
  Lock,
  FileBarChart,
} from "lucide-react";
import { DateRange } from "react-day-picker";
import {
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfYear,
} from "date-fns";
import ReportViewer from "./ReportViewer";

/** Emoji icons matching the reference design */
const emojiIconMap: Record<string, string> = {
  ShoppingCart: "🛒",
  UtensilsCrossed: "🍽️",
  Package: "📦",
  Users: "👥",
  UserCheck: "🧑‍💼",
  Truck: "🚚",
  Receipt: "💸",
  Bed: "🏨",
  ChefHat: "👨‍🍳",
  Tag: "🏷️",
};

/** Gradient backgrounds for report card icons */
const ICON_GRADIENTS = [
  "bg-gradient-to-br from-blue-500 to-blue-400",
  "bg-gradient-to-br from-orange-500 to-orange-400",
  "bg-gradient-to-br from-emerald-500 to-emerald-400",
  "bg-gradient-to-br from-purple-500 to-purple-400",
  "bg-gradient-to-br from-cyan-500 to-sky-400",
  "bg-gradient-to-br from-amber-500 to-yellow-400",
  "bg-gradient-to-br from-red-500 to-rose-400",
  "bg-gradient-to-br from-sky-600 to-cyan-400",
  "bg-gradient-to-br from-pink-500 to-rose-400",
  "bg-gradient-to-br from-green-600 to-emerald-400",
  "bg-gradient-to-br from-teal-500 to-emerald-400",
];

/** Map report category ID → dot-notation feature key */
const REPORT_FEATURE_KEY_MAP: Record<string, string> = {
  orders: 'reports.default.orders_sales',
  menu: 'reports.default.menu_items',
  inventory: 'reports.default.inventory',
  customers: 'reports.default.customers',
  staff: 'reports.default.staff',
  suppliers: 'reports.default.suppliers',
  expenses: 'reports.default.expenses',
  rooms: 'reports.default.rooms',
  recipes: 'reports.default.recipes',
  promotions: 'reports.default.promotions',
  repeat_customers: 'reports.default.repeat_customers',
};

type DatePreset = "today" | "yesterday" | "last7" | "last30" | "thisMonth" | "thisWeek" | "thisYear" | "custom";

const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "thisWeek", label: "This Week" },
  { id: "last7", label: "Last 7 Days" },
  { id: "last30", label: "Last 30 Days" },
  { id: "thisMonth", label: "This Month" },
  { id: "thisYear", label: "This Year" },
  { id: "custom", label: "Custom Range" },
];

const getPresetRange = (preset: DatePreset): DateRange | undefined => {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday":
      return { from: startOfDay(subDays(now, 1)), to: endOfDay(subDays(now, 1)) };
    case "thisWeek":
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfDay(now) };
    case "last7":
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case "last30":
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case "thisMonth":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "thisYear":
      return { from: startOfYear(now), to: endOfDay(now) };
    default:
      return undefined;
  }
};

const DefaultReports: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [selectedCategory, setSelectedCategory] =
    useState<ReportCategory | null>(null);
  const [activePreset, setActivePreset] = useState<DatePreset>("thisMonth");
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const {
    getReportByCategory,
    isLoadingCategory,
    isFetchingCategory,
    getReportError,
  } = useReportsData(dateRange);
  const { businessCategory } = usePlanType();
  const filteredCategories = getFilteredReportCategories(businessCategory);

  const handleCardClick = (categoryId: ReportCategory) => {
    setSelectedCategory(categoryId);
  };

  const handleBack = () => {
    setSelectedCategory(null);
  };

  const handlePresetClick = (preset: DatePreset) => {
    setActivePreset(preset);
    if (preset === "custom") {
      setShowCustomPicker(true);
      return;
    }
    setShowCustomPicker(false);
    const range = getPresetRange(preset);
    if (range) setDateRange(range);
  };

  const handleCustomDateChange = (range: DateRange | undefined) => {
    setDateRange(range);
    setActivePreset("custom");
    setShowCustomPicker(true);
  };

  // Show report viewer if category is selected
  if (selectedCategory) {
    const reportData = getReportByCategory(selectedCategory);
    const isLoading = isLoadingCategory(selectedCategory);
    const isFetching = isFetchingCategory(selectedCategory);
    const error = getReportError(selectedCategory);

    return (
      <div className="space-y-4 sm:space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 text-foreground text-xs sm:text-sm font-semibold hover:bg-white/20 dark:hover:bg-white/10 hover:border-orange-400/30 transition-all duration-200 shadow-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Back
        </button>

        {/* Detail Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
          <h3 className="text-lg sm:text-2xl font-extrabold tracking-tight text-foreground">
            {filteredCategories.find((c) => c.id === selectedCategory)?.name ||
              REPORT_CATEGORIES.find((c) => c.id === selectedCategory)?.name}{" "}
            Report
          </h3>
        </div>

        {/* Date Filter Row */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetClick(preset.id)}
                className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold rounded-full border transition-all duration-200 ${
                  activePreset === preset.id
                    ? "bg-gradient-to-r from-orange-500/15 to-blue-500/10 border-orange-400/40 text-orange-600 dark:text-orange-400 shadow-sm"
                    : "bg-white/10 dark:bg-white/5 border-white/20 dark:border-white/10 text-muted-foreground hover:bg-white/20 hover:text-foreground"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {showCustomPicker && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <DatePickerWithRange
                initialDateRange={dateRange}
                onDateRangeChange={handleCustomDateChange}
              />
            </div>
          )}
        </div>

        {isLoading || isFetching ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-2xl bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 p-5">
                  <Skeleton className="h-3 w-20 mb-3" />
                  <Skeleton className="h-7 w-24" />
                </div>
              ))}
            </div>
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-red-400/30 p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <p className="text-destructive font-semibold">Error loading report</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error.message}
            </p>
          </div>
        ) : reportData &&
          reportData.tableData &&
          reportData.tableData.length > 0 ? (
          <ReportViewer reports={[reportData]} dateRange={dateRange} />
        ) : reportData ? (
          <div className="space-y-4">
            {/* Summary even with no table data */}
            <div className="rounded-2xl bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 p-6">
              <h3 className="text-lg font-bold mb-4">{reportData.title}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(reportData.summary).map(([key, value]) => (
                  <div key={key} className="rounded-2xl bg-white/5 dark:bg-white/[0.03] backdrop-blur-sm border border-white/10 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{key}</p>
                    <p className="text-xl font-extrabold tracking-tight text-foreground">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center py-8 rounded-2xl bg-white/5 dark:bg-white/[0.02]">
                <AlertCircle className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No records found for the selected date range
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              No data available for this report
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500/20 to-blue-500/15 border border-orange-400/20 flex items-center justify-center">
              <FileBarChart className="h-[18px] w-[18px] text-orange-500" />
            </div>
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              Default Reports
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mt-1 ml-12">
            Click on any category to generate its report
          </p>
        </div>
        <DatePickerWithRange
          initialDateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      </div>

      {/* ═══ REPORT CARDS GRID ═══ */}
      <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4">
        {filteredCategories.map((category, index) => {
          const isLocked = category.id === "rooms";
          const gradientClass = ICON_GRADIENTS[index % ICON_GRADIENTS.length];

          return (
            <FeatureLock
              key={category.id}
              feature={REPORT_FEATURE_KEY_MAP[category.id] || `reports.default.${category.id}`}
            >
              <div
                onClick={() => !isLocked && handleCardClick(category.id)}
                className={`
                  group relative overflow-hidden rounded-2xl
                  bg-white dark:bg-white/[0.06]
                  backdrop-blur-xl
                  border border-gray-200/80 dark:border-white/10
                  shadow-sm dark:shadow-none
                  p-3 sm:p-5 pb-2.5 sm:pb-4
                  cursor-pointer
                  flex flex-col items-center text-center
                  transition-all duration-300 ease-out
                  hover:-translate-y-2 hover:shadow-xl
                  hover:border-orange-300 dark:hover:border-orange-400/30
                  hover:shadow-orange-500/10 dark:hover:shadow-orange-500/5
                  ${isLocked ? "opacity-50 cursor-not-allowed hover:translate-y-0 hover:shadow-sm hover:border-gray-200/80 dark:hover:border-white/10" : ""}
                `}
                style={{ animationDelay: `${index * 0.04}s` }}
              >
                {/* Top shine line on hover */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Hover glow overlay */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                {/* Lock badge */}
                {isLocked && (
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-amber-400/15 border border-amber-400/30 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    <Lock className="h-2.5 w-2.5" /> PRO
                  </div>
                )}

                {/* Emoji Icon */}
                <div className={`
                  relative w-10 h-10 sm:w-[60px] sm:h-[60px] rounded-xl sm:rounded-2xl mb-2 sm:mb-3
                  ${gradientClass}
                  flex items-center justify-center text-lg sm:text-2xl
                  shadow-md sm:shadow-lg shadow-black/15
                  transition-transform duration-300
                  group-hover:scale-110
                `}>
                  {/* Inner shine */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/25 to-transparent pointer-events-none" />
                  <span className="relative z-10">{emojiIconMap[category.icon] || "📋"}</span>
                </div>

                {/* Name & Description */}
                <h4 className="text-[11px] sm:text-sm font-bold text-foreground mb-0.5 sm:mb-1 tracking-tight leading-tight">
                  {category.name}
                </h4>
                <p className="text-[9px] sm:text-[11px] text-muted-foreground leading-relaxed hidden sm:block">
                  {category.description}
                </p>
              </div>
            </FeatureLock>
          );
        })}
      </div>

      {/* ═══ EXPORT BANNER ═══ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500/10 to-blue-500/10 dark:from-orange-500/8 dark:to-blue-500/6 backdrop-blur-xl border border-orange-400/20 p-5 flex items-center gap-4">
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-orange-500/10 pointer-events-none" />
        <div className="absolute -bottom-10 left-1/3 w-28 h-28 rounded-full bg-blue-500/8 pointer-events-none" />

        <div className="w-12 h-12 rounded-xl flex-shrink-0 bg-gradient-to-br from-orange-500/20 to-blue-500/15 border border-orange-400/25 flex items-center justify-center shadow-md shadow-orange-500/10">
          <Download className="h-5 w-5 text-orange-500" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-foreground mb-1">Export Options</h4>
          <p className="text-xs text-muted-foreground">
            Each report can be exported to PDF or Excel. Click a category above to generate and export.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DefaultReports;
