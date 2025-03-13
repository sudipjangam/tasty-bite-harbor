
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  timeRange: string;
  topProducts: any[];
  salesPrediction: any[];
  setExpandedChart: (chart: string | null) => void;
}

const ChartCards = ({
  filteredData,
  categoryData,
  customerTimeData,
  timeRange,
  topProducts,
  salesPrediction,
  setExpandedChart,
}: ChartCardsProps) => {
  const filterTimeSeriesData = (data: any[], days: number) => {
    if (days === 365) return data;
    return data.slice(-days);
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium">Revenue Analysis</CardTitle>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setExpandedChart('revenue')}
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent id="revenue-chart">
          <RevenueHighchart data={filteredData} />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium">Category Revenue</CardTitle>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setExpandedChart('category')}
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent id="category-chart">
          <RevenueByCategoryChart data={categoryData} />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium">Customer Growth</CardTitle>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setExpandedChart('customer')}
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <TimeSeriesAnalysis 
            data={filterTimeSeriesData(customerTimeData, parseInt(timeRange))} 
            title="Customer Growth" 
            description="Daily unique customers over time" 
            valuePrefix="" 
            valueSuffix=" customers"
            color="#6366f1"
          />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium">Top Selling Products</CardTitle>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setExpandedChart('products')}
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <TopProducts data={topProducts} />
        </CardContent>
      </Card>
      
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium">Sales Forecast</CardTitle>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setExpandedChart('forecast')}
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <SalesPrediction data={salesPrediction} />
        </CardContent>
      </Card>
    </div>
  );
};

export default ChartCards;
