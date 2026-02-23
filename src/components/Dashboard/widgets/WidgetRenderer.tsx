import React, { Suspense, lazy } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getWidgetById } from "./WidgetRegistry";

// Lazy-load existing widgets
const WeeklySalesChart = lazy(
  () => import("@/components/Dashboard/WeeklySalesChart"),
);
const TrendingItems = lazy(
  () => import("@/components/Dashboard/TrendingItems"),
);
const RevenuePieChart = lazy(
  () => import("@/components/Dashboard/RevenuePieChart"),
);
const RecentOrdersTable = lazy(
  () => import("@/components/Dashboard/RecentOrdersTable"),
);
const LowInventoryAlert = lazy(
  () => import("@/components/Dashboard/LowInventoryAlert"),
);
const LocationTodayWidget = lazy(
  () => import("@/components/Dashboard/LocationTodayWidget"),
);

// Lazy-load new widgets
const HourlySalesWidget = lazy(() => import("./HourlySalesWidget"));
const PaymentSplitWidget = lazy(() => import("./PaymentSplitWidget"));
const DailyOrdersWidget = lazy(() => import("./DailyOrdersWidget"));
const AvgOrderTrendWidget = lazy(() => import("./AvgOrderTrendWidget"));
const LocationPerformanceWidget = lazy(
  () => import("./LocationPerformanceWidget"),
);
const MenuMarginsWidget = lazy(() => import("./MenuMarginsWidget"));
const WeatherWidget = lazy(() => import("./WeatherWidget"));

// Import NC Stats (named export)
import { NCStatsCard } from "@/components/Dashboard/NCStatsCard";

interface WidgetRendererProps {
  widgetId: string;
  scheduleComponent?: React.ReactNode;
}

const WidgetFallback = () => (
  <Skeleton className="w-full h-[280px] rounded-2xl" />
);

const WidgetContent: React.FC<{
  widgetId: string;
  scheduleComponent?: React.ReactNode;
}> = ({ widgetId, scheduleComponent }) => {
  switch (widgetId) {
    case "weekly-sales":
      return <WeeklySalesChart />;
    case "trending-items":
      return <TrendingItems />;
    case "revenue-pie":
      return <RevenuePieChart />;
    case "recent-orders":
      return <RecentOrdersTable />;
    case "nc-stats":
      return <NCStatsCard />;
    case "low-inventory":
      return <LowInventoryAlert />;
    case "hourly-sales":
      return <HourlySalesWidget />;
    case "payment-split":
      return <PaymentSplitWidget />;
    case "daily-orders-count":
      return <DailyOrdersWidget />;
    case "avg-order-trend":
      return <AvgOrderTrendWidget />;
    case "location-today":
      return <LocationTodayWidget />;
    case "location-performance":
      return <LocationPerformanceWidget />;
    case "menu-margins":
      return <MenuMarginsWidget />;
    case "weather-forecast":
      return <WeatherWidget />;
    case "this-week":
      return (
        scheduleComponent || (
          <div className="text-gray-400 text-sm p-4">
            Schedule not available
          </div>
        )
      );
    default:
      return (
        <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">
          Widget not found
        </div>
      );
  }
};

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({
  widgetId,
  scheduleComponent,
}) => {
  const definition = getWidgetById(widgetId);
  if (!definition) return null;

  const Icon = definition.icon;

  return (
    <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-0 shadow-xl rounded-3xl overflow-hidden h-full">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="flex items-center gap-2.5 text-base">
          <div
            className={`p-2 bg-gradient-to-br ${definition.gradient} rounded-xl shadow-lg shadow-${definition.gradient.split("-")[1]}-500/20`}
          >
            <Icon className="h-4 w-4 text-white" />
          </div>
          <span className="text-gray-800 dark:text-gray-100 font-semibold text-sm">
            {definition.name}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <Suspense fallback={<WidgetFallback />}>
          <WidgetContent
            widgetId={widgetId}
            scheduleComponent={scheduleComponent}
          />
        </Suspense>
      </CardContent>
    </Card>
  );
};

export default WidgetRenderer;
