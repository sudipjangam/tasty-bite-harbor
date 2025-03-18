
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTheme } from "@/hooks/useTheme";
import { PieChart as PieChartIcon } from "lucide-react";
import { HighchartComponent } from "@/components/ui/highcharts";
import { Options } from "highcharts";

interface CategoryData {
  name: string;
  value: number;
  percentage: number;
}

interface RevenueByCategoryChartProps {
  data: CategoryData[];
}

type TimePeriod = '7d' | '30d' | '90d' | '1y';

const COLORS = ['#8b5cf6', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#f43f5e', '#6366f1'];

const RevenueByCategoryChart = ({ data }: RevenueByCategoryChartProps) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30d');
  
  // In a real app, we would filter data by time period here
  // For this demo, we'll just use the provided data
  
  // Sort data by value (revenue) in descending order
  const sortedData = [...data].sort((a, b) => b.value - a.value);

  const chartOptions: Options = {
    chart: {
      type: 'pie' as const,
      backgroundColor: 'transparent',
      style: {
        fontFamily: 'Inter, sans-serif'
      }
    },
    title: {
      text: null
    },
    credits: {
      enabled: false
    },
    tooltip: {
      pointFormat: '<b>{point.percentage:.1f}%</b><br>Revenue: <b>₹{point.y}</b>',
      backgroundColor: isDarkMode ? '#334155' : '#FFFFFF',
      borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
      style: {
        color: isDarkMode ? '#F9FAFB' : '#1F2937'
      }
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: 'pointer',
        colors: COLORS,
        borderWidth: 2,
        borderColor: isDarkMode ? '#334155' : '#FFFFFF',
        dataLabels: {
          enabled: true,
          format: '{point.name}: {point.percentage:.1f}%',
          style: {
            color: isDarkMode ? '#F9FAFB' : '#1F2937',
            textOutline: 'none'
          }
        },
        innerSize: '60%',
        showInLegend: true
      }
    },
    legend: {
      enabled: true,
      align: 'center' as const,
      verticalAlign: 'bottom' as const,
      itemStyle: {
        color: isDarkMode ? '#F9FAFB' : '#1F2937'
      }
    },
    series: [{
      type: 'pie' as const,
      name: 'Categories',
      // Remove the colorByPoint property as it's not recognized in the SeriesPieOptions type
      data: sortedData.map(item => ({
        name: item.name,
        y: item.value,
        percentage: item.percentage
      }))
    }]
  };

  return (
    <Card className="shadow-md hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Revenue by Menu Category</CardTitle>
          <div className="flex items-center">
            <div className="flex items-center mr-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button 
                className={`px-2 py-1 rounded text-xs font-medium ${timePeriod === '7d' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-gray-500 dark:text-gray-400'}`}
                onClick={() => setTimePeriod('7d')}
              >
                7D
              </button>
              <button 
                className={`px-2 py-1 rounded text-xs font-medium ${timePeriod === '30d' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-gray-500 dark:text-gray-400'}`}
                onClick={() => setTimePeriod('30d')}
              >
                30D
              </button>
              <button 
                className={`px-2 py-1 rounded text-xs font-medium ${timePeriod === '90d' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-gray-500 dark:text-gray-400'}`}
                onClick={() => setTimePeriod('90d')}
              >
                90D
              </button>
              <button 
                className={`px-2 py-1 rounded text-xs font-medium ${timePeriod === '1y' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-gray-500 dark:text-gray-400'}`}
                onClick={() => setTimePeriod('1y')}
              >
                1Y
              </button>
            </div>
            <PieChartIcon className="h-5 w-5 text-purple-500" />
          </div>
        </div>
        <CardDescription>Distribution of revenue across menu categories</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center">
          <div className="w-full md:w-2/3 h-[300px]">
            <HighchartComponent options={chartOptions} />
          </div>
          <div className="w-full md:w-1/3">
            <div className="mt-4 md:mt-0 space-y-2">
              {sortedData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">₹{item.value.toLocaleString()}</span>
                    <span className="text-xs text-gray-500 ml-1">({item.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RevenueByCategoryChart;
