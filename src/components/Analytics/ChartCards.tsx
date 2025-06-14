
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize, TrendingUp, PieChart, Users, Package, Zap } from "lucide-react";
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

  const chartConfigs = [
    {
      id: 'revenue',
      title: 'Revenue Analysis',
      subtitle: 'Track your financial performance',
      icon: TrendingUp,
      gradient: 'from-blue-500 to-indigo-600',
      component: <RevenueHighchart data={filteredData} />
    },
    {
      id: 'category',
      title: 'Category Revenue',
      subtitle: 'Revenue breakdown by menu categories',
      icon: PieChart,
      gradient: 'from-purple-500 to-pink-600',
      component: <RevenueByCategoryChart data={categoryData} />
    },
    {
      id: 'customer',
      title: 'Customer Growth',
      subtitle: 'Track customer acquisition trends',
      icon: Users,
      gradient: 'from-green-500 to-emerald-600',
      component: <TimeSeriesAnalysis 
        data={filterTimeSeriesData(customerTimeData, parseInt(timeRange))} 
        title="Customer Growth" 
        description="Daily unique customers over time" 
        valuePrefix="" 
        valueSuffix=" customers"
        color="#6366f1"
      />
    },
    {
      id: 'products',
      title: 'Top Selling Products',
      subtitle: 'Best performing menu items',
      icon: Package,
      gradient: 'from-orange-500 to-red-600',
      component: <TopProducts data={topProducts} />
    },
    {
      id: 'forecast',
      title: 'Sales Forecast',
      subtitle: 'Predictive analytics and trends',
      icon: Zap,
      gradient: 'from-cyan-500 to-blue-600',
      component: <SalesPrediction data={salesPrediction} />
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-8">
      {chartConfigs.map((chart, index) => (
        <div 
          key={chart.id}
          className="group relative overflow-hidden bg-white/90 backdrop-blur-sm border border-white/30 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-[1.02]"
        >
          {/* Gradient overlay */}
          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${chart.gradient}`}></div>
          
          <CardHeader className="flex flex-row items-center justify-between pb-4 pt-6 px-8">
            <div className="flex items-center gap-4">
              <div className={`p-3 bg-gradient-to-r ${chart.gradient} rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <chart.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                  {chart.title}
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {chart.subtitle}
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setExpandedChart(chart.id)}
              className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-300"
            >
              <Maximize className="h-5 w-5" />
            </Button>
          </CardHeader>
          
          <CardContent id={`${chart.id}-chart`} className="px-8 pb-8">
            <div className="bg-gradient-to-br from-gray-50/50 to-white/50 dark:from-gray-800/50 dark:to-gray-900/50 rounded-2xl p-4">
              {chart.component}
            </div>
          </CardContent>
        </div>
      ))}
    </div>
  );
};

export default ChartCards;
