import React from "react";
import { Button } from "@/components/ui/button";
import { Maximize } from "lucide-react";
import RevenueHighchart from "@/components/Analytics/RevenueHighchart";
import RevenueByCategoryChart from "@/components/Analytics/RevenueByCategoryChart";
import TimeSeriesAnalysis from "@/components/Analytics/TimeSeriesAnalysis";
import TopProducts from "@/components/Analytics/TopProducts";
import SalesPrediction from "@/components/Analytics/SalesPrediction";

interface ChartCardsProps {
  filteredData: any[];
  categoryData: any[];
  customerTimeData: any[];
  topProducts: any[];
  salesPrediction: any[];
  setExpandedChart: (chart: string | null) => void;
  orders?: any[];
  menuItems?: any[];
}

const ChartCards = ({
  filteredData,
  categoryData,
  customerTimeData,
  topProducts,
  salesPrediction,
  setExpandedChart,
  orders = [],
  menuItems = [],
}: ChartCardsProps) => {
  // Wrapper component for each chart widget with consistent height
  const ChartWidget = ({
    id,
    children,
    onExpand,
    fullWidth = false,
  }: {
    id: string;
    children: React.ReactNode;
    onExpand: () => void;
    fullWidth?: boolean;
  }) => (
    <div
      className={`relative group h-full ${fullWidth ? "lg:col-span-2" : ""}`}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onExpand}
        className="absolute top-3 right-3 z-10 h-8 w-8 opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm"
      >
        <Maximize className="h-4 w-4" />
      </Button>
      <div className="h-full [&>*]:h-full">{children}</div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 auto-rows-fr">
      {/* Revenue Analysis */}
      <ChartWidget id="revenue" onExpand={() => setExpandedChart("revenue")}>
        <div id="revenue-chart" className="min-h-[400px]">
          <RevenueHighchart data={filteredData} />
        </div>
      </ChartWidget>

      {/* Category Revenue */}
      <ChartWidget id="category" onExpand={() => setExpandedChart("category")}>
        <div id="category-chart" className="min-h-[400px]">
          <RevenueByCategoryChart
            data={categoryData}
            orders={orders}
            menuItems={menuItems}
          />
        </div>
      </ChartWidget>

      {/* Customer Growth */}
      <ChartWidget id="customer" onExpand={() => setExpandedChart("customer")}>
        <div className="min-h-[400px]">
          <TimeSeriesAnalysis
            data={customerTimeData}
            title="Customer Growth"
            description="Daily unique customers over time"
            valuePrefix=""
            valueSuffix=" customers"
            color="#6366f1"
          />
        </div>
      </ChartWidget>

      {/* Top Products */}
      <ChartWidget id="products" onExpand={() => setExpandedChart("products")}>
        <div className="min-h-[400px]">
          <TopProducts data={topProducts} />
        </div>
      </ChartWidget>

      {/* Sales Forecast - Full width */}
      <ChartWidget
        id="forecast"
        onExpand={() => setExpandedChart("forecast")}
        fullWidth
      >
        <div id="forecast-chart">
          <SalesPrediction data={salesPrediction} />
        </div>
      </ChartWidget>
    </div>
  );
};

export default ChartCards;
