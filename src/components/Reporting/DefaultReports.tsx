import React, { useState } from "react";
import {
  useReportsData,
  REPORT_CATEGORIES,
  getFilteredReportCategories,
  ReportCategory,
} from "@/hooks/useReportsData";
import { usePlanType } from "@/hooks/usePlanType";
import { FeatureLock } from "@/components/Auth/FeatureLock";
import { StandardizedCard } from "@/components/ui/standardized-card";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingCart,
  UtensilsCrossed,
  Package,
  Users,
  UserCheck,
  Truck,
  Receipt,
  Bed,
  ChefHat,
  Tag,
  Download,
  ArrowLeft,
  TrendingUp,
  AlertCircle,
  Calendar,
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

const iconMap: Record<string, React.ReactNode> = {
  ShoppingCart: <ShoppingCart className="h-6 w-6" />,
  UtensilsCrossed: <UtensilsCrossed className="h-6 w-6" />,
  Package: <Package className="h-6 w-6" />,
  Users: <Users className="h-6 w-6" />,
  UserCheck: <UserCheck className="h-6 w-6" />,
  Truck: <Truck className="h-6 w-6" />,
  Receipt: <Receipt className="h-6 w-6" />,
  Bed: <Bed className="h-6 w-6" />,
  ChefHat: <ChefHat className="h-6 w-6" />,
  Tag: <Tag className="h-6 w-6" />,
};

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
      <div className="space-y-4">
        {/* Header Row: Back + Title */}
        <div className="flex items-center gap-4">
          <StandardizedButton variant="secondary" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </StandardizedButton>
          <h3 className="text-lg font-semibold">
            {filteredCategories.find((c) => c.id === selectedCategory)?.name ||
              REPORT_CATEGORIES.find((c) => c.id === selectedCategory)
                ?.name}{" "}
            Report
          </h3>
        </div>

        {/* Date Filter Row */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetClick(preset.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                  activePreset === preset.id
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground"
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <StandardizedCard className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <p className="text-destructive font-medium">Error loading report</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error.message}
            </p>
          </StandardizedCard>
        ) : reportData &&
          reportData.tableData &&
          reportData.tableData.length > 0 ? (
          <ReportViewer reports={[reportData]} dateRange={dateRange} />
        ) : reportData ? (
          <div className="space-y-4">
            {/* Still show the summary even if there's no table data */}
            <StandardizedCard className="p-6">
              <h3 className="text-lg font-semibold mb-4">{reportData.title}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(reportData.summary).map(([key, value]) => (
                  <div key={key} className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">{key}</p>
                    <p className="text-lg font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center py-8 bg-muted/30 rounded-lg">
                <AlertCircle className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No records found for the selected date range
                </p>
              </div>
            </StandardizedCard>
          </div>
        ) : (
          <StandardizedCard className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              No data available for this report
            </p>
          </StandardizedCard>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Default Reports
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Click on any category to generate its report
          </p>
        </div>
        <DatePickerWithRange
          initialDateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {filteredCategories.map((category) => (
          <FeatureLock
            key={category.id}
            feature={REPORT_FEATURE_KEY_MAP[category.id] || `reports.default.${category.id}`}
          >
            <div
              onClick={() => handleCardClick(category.id)}
              className="cursor-pointer transition-all hover:scale-[1.02]"
            >
              <StandardizedCard className="p-4 h-full hover:border-primary/50">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div
                    className={`p-3 rounded-full ${category.color} text-white`}
                  >
                    {iconMap[category.icon]}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{category.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {category.description}
                    </p>
                  </div>
                </div>
              </StandardizedCard>
            </div>
          </FeatureLock>
        ))}
      </div>

      <StandardizedCard className="p-4 bg-muted/30">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Export Options</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Each report can be exported to PDF or Excel. Click on a category
              above to generate and export reports.
            </p>
          </div>
        </div>
      </StandardizedCard>
    </div>
  );
};

export default DefaultReports;
