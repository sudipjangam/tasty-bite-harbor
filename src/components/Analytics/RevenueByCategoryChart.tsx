
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTheme } from "@/hooks/useTheme";
import { useIsMobile } from "@/hooks/use-mobile";
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

// Modern vibrant color palette with gradients
const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444', '#6366f1', '#14b8a6'];
const DARK_COLORS = ['#a78bfa', '#34d399', '#fbbf24', '#f472b6', '#22d3ee', '#f87171', '#818cf8', '#2dd4bf'];

const RevenueByCategoryChart = ({ data }: RevenueByCategoryChartProps) => {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const isDarkMode = theme === 'dark';
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30d');
  
  // In a real app, we would filter data by time period here
  // For this demo, we'll just use the provided data
  
  // Sort data by value (revenue) in descending order
  const sortedData = [...data].sort((a, b) => b.value - a.value);
  
  const chartColors = isDarkMode ? DARK_COLORS : COLORS;

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
      useHTML: true,
      headerFormat: '',
      pointFormat: '<div style="text-align:center"><b style="font-size:14px">{point.name}</b><br/>' +
                   '<span style="font-size:20px;font-weight:700;color:{point.color}">{point.percentage:.1f}%</span><br/>' +
                   '<span style="font-size:12px">₹{point.y:,.0f}</span></div>',
      backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: isDarkMode ? '#475569' : '#e2e8f0',
      borderRadius: 12,
      shadow: true,
      style: {
        color: isDarkMode ? '#f1f5f9' : '#1e293b'
      }
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: 'pointer',
        colors: chartColors,
        borderWidth: 3,
        borderColor: isDarkMode ? '#1e293b' : '#ffffff',
        shadow: isDarkMode ? {
          color: 'rgba(139, 92, 246, 0.3)',
          offsetX: 0,
          offsetY: 0,
          width: 10
        } : false,
        dataLabels: {
          enabled: true,
          format: '<b>{point.name}</b>: {point.percentage:.1f}%',
          style: {
            color: isDarkMode ? '#e2e8f0' : '#334155',
            textOutline: 'none',
            fontWeight: '500',
            fontSize: '11px'
          },
          distance: 20
        },
        innerSize: '55%',
        showInLegend: true,
        states: {
          hover: {
            brightness: 0.1,
            halo: {
              size: 10,
              opacity: 0.25
            }
          }
        }
      }
    },
    legend: {
      enabled: true,
      align: 'center' as const,
      verticalAlign: 'bottom' as const,
      itemStyle: {
        color: isDarkMode ? '#e2e8f0' : '#334155',
        fontWeight: '500'
      },
      itemHoverStyle: {
        color: isDarkMode ? '#a78bfa' : '#8b5cf6'
      }
    },
    series: [{
      type: 'pie' as const,
      name: 'Categories',
      data: sortedData.map((item, idx) => ({
        name: item.name,
        y: item.value,
        percentage: item.percentage,
        color: chartColors[idx % chartColors.length]
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
        <div className="flex flex-col items-center">
          <div className={`w-full ${isMobile ? 'h-[220px]' : 'h-[300px]'}`}>
            <HighchartComponent options={chartOptions} />
          </div>
          <div className="w-full md:w-2/3 mt-4">
            <div className="mt-4 md:mt-0 space-y-3">
              {sortedData.map((item, index) => (
                <div key={index} className="flex items-center justify-between group hover:bg-gray-50 dark:hover:bg-gray-800/50 p-2 rounded-lg transition-all duration-200">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-3 shadow-sm" 
                      style={{ backgroundColor: chartColors[index % chartColors.length] }}
                    />
                    <span className="text-sm font-medium group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{item.name}</span>
                  </div>
                  <div className="text-sm text-right">
                    <span className="font-semibold">₹{item.value.toLocaleString()}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{item.percentage}%</span>
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
