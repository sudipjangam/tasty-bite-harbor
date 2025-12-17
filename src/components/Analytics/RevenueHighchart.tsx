import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { useTheme } from "@/hooks/useTheme";
import { BarChart3, TrendingUp } from "lucide-react";
import { Options } from "highcharts";
import { UniversalChart } from "@/components/ui/universal-chart";
import { CHART_COLORS, TimePeriod, filterByTimePeriod, formatCurrency, getGradient } from "@/utils/chartUtils";

interface RevenueHighchartProps {
  data: {
    date: string;
    total_revenue: number;
    order_count: number;
    average_order_value: number;
  }[];
}

const RevenueHighchart = ({ data }: RevenueHighchartProps) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [chartType, setChartType] = useState<'line' | 'column'>('line');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30d');
  
  // Filter and Sort Data
  const sortedData = [...filterByTimePeriod(data, timePeriod, 'date')]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const dates = sortedData.map(item => format(new Date(item.date), 'dd MMM'));
  const revenues = sortedData.map(item => Number(item.total_revenue));
  const orders = sortedData.map(item => item.order_count);
  const averages = sortedData.map(item => Number(item.average_order_value));

  // Access colors safely
  const revColors = isDarkMode ? CHART_COLORS.primary.gradientDark : CHART_COLORS.primary.gradientLight;
  const orderColors = isDarkMode ? CHART_COLORS.success.gradientDark : CHART_COLORS.success.gradientLight;
  const avgColors = isDarkMode ? CHART_COLORS.warning.gradientDark : CHART_COLORS.warning.gradientLight;

  const options: Options = {
    chart: { type: chartType === 'line' ? 'areaspline' : 'column' },
    xAxis: { categories: dates },
    yAxis: [
      {
        title: { 
          text: 'Revenue',
          style: { color: isDarkMode ? CHART_COLORS.primary.dark : CHART_COLORS.primary.light, fontWeight: '600' }
        },
        labels: { format: '₹{value}' },
        gridLineDashStyle: 'Dash'
      },
      {
        title: { 
          text: 'Orders',
          style: { color: isDarkMode ? CHART_COLORS.success.dark : CHART_COLORS.success.light, fontWeight: '600' }
        },
        opposite: true,
        gridLineWidth: 0
      }
    ],
    plotOptions: {
      areaspline: { fillOpacity: 0.3, lineWidth: 3 },
      column: { borderRadius: 6, borderWidth: 0 }
    },
    series: [
      {
        name: 'Revenue',
        type: chartType === 'line' ? 'areaspline' : 'column',
        yAxis: 0,
        data: revenues,
        color: isDarkMode ? CHART_COLORS.primary.dark : CHART_COLORS.primary.light,
        fillColor: chartType === 'line' ? getGradient(revColors) : undefined,
        tooltip: { valuePrefix: '₹' }
      },
      {
        name: 'Orders',
        type: chartType === 'line' ? 'areaspline' : 'column',
        yAxis: 1,
        data: orders,
        color: isDarkMode ? CHART_COLORS.success.dark : CHART_COLORS.success.light,
        fillColor: chartType === 'line' ? getGradient(orderColors) : undefined
      },
      {
        name: 'Avg Order',
        type: chartType === 'line' ? 'areaspline' : 'column',
        yAxis: 0,
        data: averages,
        color: isDarkMode ? CHART_COLORS.warning.dark : CHART_COLORS.warning.light,
        fillColor: chartType === 'line' ? getGradient(avgColors) : undefined,
        tooltip: { valuePrefix: '₹' }
      }
    ] as any
  };

  const toggleChartType = () => {
    setChartType(prev => prev === 'line' ? 'column' : 'line');
  };

  const timePeriods: TimePeriod[] = ['1d', '7d', '30d', '90d', '1y', 'all'];

  return (
    <Card className="col-span-4 shadow-md hover:shadow-lg transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Revenue Trends Over Time</CardTitle>
        <div className="flex items-center space-x-2">
          {/* Time period selector */}
          <div className="flex items-center mr-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {timePeriods.map((period) => (
              <button 
                key={period}
                className={`px-2 py-1 rounded text-xs font-medium uppercase transition-colors ${
                  timePeriod === period 
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
                onClick={() => setTimePeriod(period)}
              >
                {period}
              </button>
            ))}
          </div>
          
          {/* Chart type toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button 
              className={`p-1 rounded text-xs transition-colors ${chartType === 'line' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-gray-500 dark:text-gray-400'}`}
              onClick={() => setChartType('line')}
              title="Line Chart"
            >
              <TrendingUp className="h-4 w-4" />
            </button>
            <button 
              className={`p-1 rounded text-xs transition-colors ${chartType === 'column' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-gray-500 dark:text-gray-400'}`}
              onClick={() => setChartType('column')}
              title="Bar Chart"
            >
              <BarChart3 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            No data available for the selected time period
          </div>
        ) : (
          <UniversalChart options={options} />
        )}
      </CardContent>
    </Card>
  );
};

export default RevenueHighchart;
